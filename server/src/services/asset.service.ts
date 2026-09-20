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
  tags?: string[];
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

  if (params.tags && Array.isArray(params.tags)) {
    normalValues.__tags = params.tags;
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
    tags?: string[];
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

    if (item.tags && Array.isArray(item.tags)) {
      normalValues.__tags = item.tags;
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
  tags?: string[];
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

  if (params.tags !== undefined && Array.isArray(params.tags)) {
    updatedNormal.__tags = params.tags;
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
  const tags: string[] = Array.isArray(normalValues.__tags)
    ? normalValues.__tags
    : Array.isArray(asset.tags)
    ? asset.tags
    : [];

  // حذف فیلد داخلی __tags از values برای حفظ خلوص فیلدهای داینامیک اسکیما
  delete maskedValues.__tags;

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
    tags,
    values: maskedValues,
    encryptedValues: undefined, // هرگز هش‌ها و تگ‌های رمزنگاری شده به کلاینت فرستاده نمی‌شوند
  };
}

/**
 * دریافت تاریخچه تغییرات و نسخه‌بندی یک دارایی
 */
export async function getAssetTimeline(assetId: string) {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { id: true, assetTypeId: true, title: true },
  });

  if (!asset) {
    throw new Error('دارایی مورد نظر یافت نشد.');
  }

  const logs = await prisma.auditLog.findMany({
    where: {
      targetEntity: 'Asset',
      targetId: assetId,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          role: true,
        },
      },
    },
  });

  return logs;
}

/**
 * بازگردانی دارایی به نسخه پیش از یک تغییر خاص (Rollback)
 */
export async function rollbackAsset(params: {
  assetId: string;
  logId: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const asset = await prisma.asset.findUnique({
    where: { id: params.assetId },
    include: { assetType: true },
  });

  if (!asset) {
    throw new Error('دارایی مورد نظر یافت نشد.');
  }

  const targetLog = await prisma.auditLog.findUnique({
    where: { id: params.logId },
  });

  if (!targetLog || targetLog.targetId !== params.assetId) {
    throw new Error('رکورد تاریخچه تغییرات معتبر نیست.');
  }

  if (!targetLog.diff || typeof targetLog.diff !== 'object') {
    throw new Error('این رکورد تاریخچه حاوی مقادیر قابل بازگردانی نیست.');
  }

  const diff = targetLog.diff as Record<string, any>;
  const secretKeys = getSecretKeysFromSchema(asset.assetType.schemaDefinition);

  const restorableEntries = Object.entries(diff).filter(
    ([k, v]) => v && typeof v === 'object' && 'old' in v && !secretKeys.includes(k)
  );

  if (restorableEntries.length === 0) {
    throw new Error('این رکورد دارای مقادیر پیشین قابل بازگردانی نمی‌باشد.');
  }

  const currentValues = (asset.values as Record<string, any>) || {};
  const restoredValues = { ...currentValues };
  let restoredTitle = asset.title;

  for (const [key, change] of restorableEntries) {
    if (key === 'title') {
      if (change.old) {
        restoredTitle = String(change.old);
      }
    } else if (key === '__tags' || key === 'tags') {
      if (Array.isArray(change.old)) {
        restoredValues.__tags = change.old;
      }
    } else {
      if (change.old === null || change.old === undefined) {
        delete restoredValues[key];
      } else {
        restoredValues[key] = change.old;
      }
    }
  }

  // محاسبه تغییرات ناشی از بازگردانی
  const rollbackDiff = calculateDiff(currentValues, restoredValues, secretKeys);
  if (restoredTitle !== asset.title) {
    rollbackDiff['title'] = { old: asset.title, new: restoredTitle };
  }

  const updated = await prisma.asset.update({
    where: { id: params.assetId },
    data: {
      title: restoredTitle,
      values: restoredValues,
      updatedById: params.userId,
    },
    include: { assetType: true },
  });

  // ثبت رویداد بازگردانی در ممیزی
  await logAudit({
    userId: params.userId,
    action: 'UPDATE',
    targetEntity: 'Asset',
    targetId: updated.id,
    diff: {
      ...rollbackDiff,
      __actionType: { old: null, new: 'ROLLBACK', note: `بازگردانی تغییرات به نسخه پیشین (Log: ${params.logId})` },
    },
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });

  return formatAssetForClient(updated, secretKeys);
}

