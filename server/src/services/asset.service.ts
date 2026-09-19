import { prisma } from './prisma.service.js';
import { encryptSecret, decryptSecret, maskSecret, EncryptedPayload } from './crypto.service.js';
import { calculateDiff, logAudit } from './audit.service.js';

export interface FieldDef {
  id: string;
  name: string;
  label: string;
  type: string;
  isRequired: boolean;
  isSecret?: boolean;
}

/**
 * استخراج لیست کلیدهای محرمانه (پسوردها و کلیدها) از روی ساختار اسکیما
 */
export function getSecretKeysFromSchema(schemaDefinition: any): string[] {
  if (!Array.isArray(schemaDefinition)) return [];
  return schemaDefinition
    .filter((field: FieldDef) => field.type === 'secret' || field.isSecret === true)
    .map((field: FieldDef) => field.name);
}

/**
 * ثبت دارایی جدید با تفکیک و رمزنگاری خودکار فیلدهای محرمانه با الگوریتم AES-256-GCM
 */
export async function createAsset(params: {
  userId: string;
  assetTypeId: string;
  title: string;
  inputValues: Record<string, any>;
  expiryDate?: Date | null;
  docsMarkdown?: string | null;
  ipAddress?: string;
  userAgent?: string;
}) {
  const assetType = await prisma.assetType.findUnique({
    where: { id: params.assetTypeId },
  });

  if (!assetType) {
    throw new Error('نوع دارایی مورد نظر یافت نشد.');
  }

  const secretKeys = getSecretKeysFromSchema(assetType.schemaDefinition);
  const normalValues: Record<string, any> = {};
  const encryptedValues: Record<string, EncryptedPayload> = {};

  for (const [key, value] of Object.entries(params.inputValues)) {
    if (secretKeys.includes(key)) {
      if (value !== undefined && value !== null && value !== '') {
        encryptedValues[key] = encryptSecret(String(value));
      }
    } else {
      normalValues[key] = value;
    }
  }

  const asset = await prisma.asset.create({
    data: {
      assetTypeId: params.assetTypeId,
      title: params.title.trim(),
      values: normalValues,
      encryptedValues: encryptedValues as any,
      expiryDate: params.expiryDate || null,
      docsMarkdown: params.docsMarkdown || null,
      createdById: params.userId,
      updatedById: params.userId,
    },
    include: {
      assetType: true,
    },
  });

  // ثبت لاگ ایجاد دارایی
  await logAudit({
    userId: params.userId,
    action: 'CREATE',
    targetEntity: 'Asset',
    targetId: asset.id,
    diff: { title: { new: asset.title } },
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });

  return formatAssetForClient(asset, secretKeys);
}

/**
 * ثبت دسته‌ای دارایی‌ها (مثلاً از طریق ایمپورت فایل اکسل) با رمزنگاری خودکار مقادیر محرمانه
 */
export async function createAssetsBatch(params: {
  userId: string;
  assetTypeId: string;
  items: Array<{
    title: string;
    inputValues: Record<string, any>;
    expiryDate?: Date | null;
    docsMarkdown?: string | null;
  }>;
  ipAddress?: string;
  userAgent?: string;
}) {
  const assetType = await prisma.assetType.findUnique({
    where: { id: params.assetTypeId },
  });

  if (!assetType) {
    throw new Error('نوع دارایی مورد نظر یافت نشد.');
  }

  const secretKeys = getSecretKeysFromSchema(assetType.schemaDefinition);
  const createdAssets: any[] = [];

  for (const item of params.items) {
    if (!item.title || !item.title.trim()) continue;

    const normalValues: Record<string, any> = {};
    const encryptedValues: Record<string, EncryptedPayload> = {};

    for (const [key, value] of Object.entries(item.inputValues || {})) {
      if (secretKeys.includes(key)) {
        if (value !== undefined && value !== null && value !== '') {
          encryptedValues[key] = encryptSecret(String(value));
        }
      } else {
        normalValues[key] = value;
      }
    }

    const created = await prisma.asset.create({
      data: {
        assetTypeId: params.assetTypeId,
        title: item.title.trim(),
        values: normalValues,
        encryptedValues: encryptedValues as any,
        expiryDate: item.expiryDate || null,
        docsMarkdown: item.docsMarkdown || null,
        createdById: params.userId,
        updatedById: params.userId,
      },
      include: { assetType: true },
    });

    createdAssets.push(formatAssetForClient(created, secretKeys));
  }

  // ثبت لاگ ممیزی ایمپورت دسته‌ای
  await logAudit({
    userId: params.userId,
    action: 'CREATE',
    targetEntity: 'Asset',
    targetId: `batch-${params.assetTypeId}`,
    diff: { batchImport: { new: `${createdAssets.length} دارایی جدید وارد شد` } },
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });

  return createdAssets;
}

/**
 * به‌روزرسانی دارایی و محاسبه تغییرات (Diff)
 */
export async function updateAsset(params: {
  assetId: string;
  userId: string;
  title?: string;
  inputValues?: Record<string, any>;
  expiryDate?: Date | null;
  docsMarkdown?: string | null;
  ipAddress?: string;
  userAgent?: string;
}) {
  const existing = await prisma.asset.findUnique({
    where: { id: params.assetId },
    include: { assetType: true },
  });

  if (!existing) {
    throw new Error('دارایی مورد نظر یافت نشد.');
  }

  const secretKeys = getSecretKeysFromSchema(existing.assetType.schemaDefinition);
  const oldNormal = (existing.values as Record<string, any>) || {};
  const currentEncrypted = (existing.encryptedValues as unknown as Record<string, EncryptedPayload>) || {};

  const updatedNormal = { ...oldNormal };
  const updatedEncrypted = { ...currentEncrypted };

  if (params.inputValues) {
    for (const [key, value] of Object.entries(params.inputValues)) {
      if (secretKeys.includes(key)) {
        // فقط در صورتی که پسورد جدید ارسال شده و مقدار خالی یا ماسک نباشد، رمزنگاری مجدد انجام می‌شود
        if (value && value !== '••••••••') {
          updatedEncrypted[key] = encryptSecret(String(value));
        }
      } else {
        updatedNormal[key] = value;
      }
    }
  }

  // محاسبه لاگ تفاوت‌ها
  const diff = calculateDiff(oldNormal, updatedNormal, secretKeys);
  if (params.title && params.title !== existing.title) {
    diff['title'] = { old: existing.title, new: params.title };
  }

  const updated = await prisma.asset.update({
    where: { id: params.assetId },
    data: {
      title: params.title ?? existing.title,
      values: updatedNormal,
      encryptedValues: updatedEncrypted as any,
      expiryDate: params.expiryDate !== undefined ? params.expiryDate : existing.expiryDate,
      docsMarkdown: params.docsMarkdown !== undefined ? params.docsMarkdown : existing.docsMarkdown,
      updatedById: params.userId,
    },
    include: { assetType: true },
  });

  // ثبت لاگ ممیزی
  if (Object.keys(diff).length > 0) {
    await logAudit({
      userId: params.userId,
      action: 'UPDATE',
      targetEntity: 'Asset',
      targetId: updated.id,
      diff,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  return formatAssetForClient(updated, secretKeys);
}

/**
 * آشکارسازی یا کپی رمز عبور و ثبت فوری لاگ امنیتی (Read Secret Audit)
 */
export async function revealSecret(params: {
  assetId: string;
  fieldKey: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const asset = await prisma.asset.findUnique({
    where: { id: params.assetId },
  });

  if (!asset) {
    throw new Error('دارایی مورد نظر یافت نشد.');
  }

  const encryptedValues = (asset.encryptedValues as unknown as Record<string, EncryptedPayload>) || {};
  const targetPayload = encryptedValues[params.fieldKey];

  if (!targetPayload) {
    throw new Error(`فیلد محرمانه "${params.fieldKey}" برای این دارایی تنظیم نشده است.`);
  }

  // رمزگشایی در حافظه سرور
  const decrypted = decryptSecret(targetPayload);

  // ثبت لاگ رویداد امنیتی
  await logAudit({
    userId: params.userId,
    action: 'READ_SECRET',
    targetEntity: 'Asset',
    targetId: asset.id,
    diff: { field: params.fieldKey, note: 'مشاهده یا کپی فیلد محرمانه توسط کاربر' },
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });

  return decrypted;
}

/**
 * قالب‌بندی دارایی برای کلاینت (ماسک کردن فیلدهای محرمانه به صورت ••••••••)
 */
export function formatAssetForClient(asset: any, secretKeys: string[]) {
  const normalValues = (asset.values as Record<string, any>) || {};
  const maskedValues = { ...normalValues };

  // اضافه کردن مقادیر ماسک شده برای فیلدهای محرمانه
  for (const key of secretKeys) {
    const encryptedValues = (asset.encryptedValues as Record<string, any>) || {};
    if (encryptedValues[key]) {
      maskedValues[key] = maskSecret();
    } else {
      maskedValues[key] = null;
    }
  }

  return {
    ...asset,
    values: maskedValues,
    encryptedValues: undefined, // هرگز هش‌ها و تگ‌های رمزنگاری شده به کلاینت فرستاده نمی‌شوند
  };
}
