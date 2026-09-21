import { prisma } from './prisma.service.js';

export interface DiffEntry {
  old: any;
  new: any;
  note?: string;
}

export type DiffResult = Record<string, DiffEntry>;

/**
 * محاسبه تفاوت مقادیر پیشین و پسین با فیلتر کردن رمزهای عبور
 */
export function calculateDiff(
  oldValues: Record<string, any> = {},
  newValues: Record<string, any> = {},
  secretKeys: string[] = []
): DiffResult {
  const diff: DiffResult = {};
  const allKeys = Array.from(new Set([...Object.keys(oldValues), ...Object.keys(newValues)]));

  for (const key of allKeys) {
    const oldVal = oldValues[key];
    const newVal = newValues[key];

    // اگر کلید از نوع محرمانه باشد
    if (secretKeys.includes(key)) {
      if (newVal !== undefined && newVal !== null && newVal !== '') {
        diff[key] = {
          old: '••••••••',
          new: '••••••••',
          note: 'رمز عبور توسط کاربر ویرایش شد (مقدار ثبت نمی‌گردد)',
        };
      }
      continue;
    }

    // مقایسه مقادیر عادی
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diff[key] = {
        old: oldVal ?? null,
        new: newVal ?? null,
      };
    }
  }

  return diff;
}

export type AuditActionType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'READ_SECRET'
  | 'COPY_SECRET'
  | 'LOGIN'
  | 'LOGOUT'
  | '2FA_ENABLE'
  | '2FA_DISABLE'
  | 'EXPORT_BACKUP'
  | 'RESTORE_BACKUP';

/**
 * ثبت لاگ یک عملیات در دیتابیس
 */
export async function logAudit(data: {
  userId: string;
  action: AuditActionType;
  targetEntity: 'Asset' | 'AssetType' | 'User' | 'System' | 'Attachment';
  targetId: string;
  diff?: Record<string, any> | null;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        targetEntity: data.targetEntity,
        targetId: data.targetId,
        diff: data.diff ?? undefined,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    });
  } catch (err) {
    console.error('⚠️ خطا در ثبت لاگ ممیزی:', err);
  }
}
