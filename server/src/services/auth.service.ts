import crypto from 'node:crypto';
import { Role } from '@prisma/client';
import { prisma } from './prisma.service.js';
import { encryptSecret, decryptSecret } from './crypto.service.js';

/**
 * هش امن کدهای اضطراری جهت عدم ذخیره‌سازی متن ساده در دیتابیس (NIST SP 800-63B)
 */
export function hashRecoveryCode(code: string): string {
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return crypto.createHash('sha256').update(clean).digest('hex');
}

/**
 * رمزگشایی سکرت TOTP ذخیره شده در دیتابیس با کلید مستر
 */
export function getDecryptedTotpSecret(rawSecret: string): string {
  try {
    const parsed = JSON.parse(rawSecret);
    if (parsed.iv && parsed.authTag && parsed.ciphertext) {
      return decryptSecret(parsed);
    }
  } catch {
    // پشتیبانی سازگار با نسخه‌های متنی قدیمی
  }
  return rawSecret;
}

const SCRYPT_KEYLEN = 64;

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  categoryPermissions: string[];
  twoFactorEnabled?: boolean;
}

export type LoginResult =
  | { requires2FA: false; user: AuthUser }
  | { requires2FA: true; userId: string; username: string };

/**
 * تولید هش امن رمز عبور با الگوریتم استاندارد Scrypt و Salt تصادفی
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * اعتبارسنجی رمز عبور وارد شده در برابر هش ذخیره‌شده
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;

  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

/**
 * بررسی اینکه آیا هنوز کاربری در سیستم وجود دارد یا نیاز به راه‌اندازی اولیه (First-run Setup) است
 */
export async function isSetupNeeded(): Promise<boolean> {
  try {
    const count = await prisma.user.count();
    return count === 0;
  } catch (error) {
    // در صورت عدم دسترسی اولیه به دیتابیس
    return false;
  }
}

/**
 * ایجاد اولین حساب کاربری مدیر ارشد در هنگام ویزارد راه‌اندازی
 */
export async function setupInitialAdmin(data: {
  username: string;
  fullName: string;
  password: string;
}) {
  const needed = await isSetupNeeded();
  if (!needed) {
    throw new Error('سیستم قبلاً راه‌اندازی شده است و ایجاد حساب مدیر اولیه امکان‌پذیر نیست.');
  }

  const passwordHash = hashPassword(data.password);

  const admin = await prisma.user.create({
    data: {
      username: data.username.trim().toLowerCase(),
      fullName: data.fullName.trim(),
      passwordHash,
      role: Role.ADMIN,
      categoryPermissions: [], // ادمین به همه دسته‌ها دسترسی دارد
      isActive: true,
    },
  });

  return {
    id: admin.id,
    username: admin.username,
    fullName: admin.fullName,
    role: admin.role,
  };
}

/**
 * احراز هویت مرحله اول کاربر و بررسی وضعیت فعال بودن 2FA
 */
export async function authenticate(username: string, password: string): Promise<LoginResult | null> {
  const user = await prisma.user.findUnique({
    where: { username: username.trim().toLowerCase() },
  });

  if (!user || !user.isActive) {
    return null;
  }

  const isValid = verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  // اگر احراز هویت دومرحله‌ای فعال باشد
  if (user.twoFactorEnabled && user.twoFactorSecret) {
    return {
      requires2FA: true,
      userId: user.id,
      username: user.username,
    };
  }

  const permissions = Array.isArray(user.categoryPermissions) 
    ? (user.categoryPermissions as string[]) 
    : [];

  return {
    requires2FA: false,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      categoryPermissions: permissions,
      twoFactorEnabled: false,
    },
  };
}

/**
 * تایید کد ۶ رقمی TOTP یا کد بازیابی در مرحله دوم ورود
 */
export async function verifyLogin2FA(userId: string, code: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.isActive || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return null;
  }

  const cleanCode = code.trim().replace(/\s+/g, '');
  const plainSecret = getDecryptedTotpSecret(user.twoFactorSecret);

  // ۱. بررسی کد ۶ رقمی TOTP
  if (/^\d{6}$/.test(cleanCode)) {
    const { verifyTotpToken } = await import('./totp.service.js');
    const isTotpValid = verifyTotpToken(cleanCode, plainSecret);
    if (isTotpValid) {
      const permissions = Array.isArray(user.categoryPermissions) 
        ? (user.categoryPermissions as string[]) 
        : [];
      return {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        categoryPermissions: permissions,
        twoFactorEnabled: true,
      };
    }
  }

  // ۲. بررسی کدهای بازیابی اضطراری (Recovery Codes) با هش امن
  const recoveryCodes = Array.isArray(user.twoFactorRecoveryCodes)
    ? (user.twoFactorRecoveryCodes as string[])
    : [];

  const enteredHash = hashRecoveryCode(cleanCode);
  const matchedIndex = recoveryCodes.findIndex((rc) => {
    if (rc.length === 64 && /^[0-9a-f]+$/i.test(rc)) {
      return rc.toLowerCase() === enteredHash.toLowerCase();
    }
    // پشتیبانی سازگار با مقادیر متنی گذشته
    return rc.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });

  if (matchedIndex !== -1) {
    // حذف کد بازیابی استفاده‌شده (Single-use)
    const updatedCodes = [...recoveryCodes];
    updatedCodes.splice(matchedIndex, 1);

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorRecoveryCodes: updatedCodes },
    });

    const permissions = Array.isArray(user.categoryPermissions) 
      ? (user.categoryPermissions as string[]) 
      : [];

    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      categoryPermissions: permissions,
      twoFactorEnabled: true,
    };
  }

  return null;
}

/**
 * دریافت Secret و URI برای آغاز فرآیند فعال‌سازی 2FA
 */
export async function initiate2FASetup(userId: string): Promise<{ secret: string; otpauthUrl: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('کاربر مورد نظر یافت نشد.');
  }

  const { generateTotpSecret } = await import('./totp.service.js');
  return generateTotpSecret(user.username, 'Daftar');
}

/**
 * اعتبارسنجی اولیه و فعال‌سازی قطعی 2FA
 */
export async function complete2FAEnable(
  userId: string,
  secret: string,
  verificationCode: string
): Promise<{ recoveryCodes: string[] }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('کاربر مورد نظر یافت نشد.');
  }

  const { verifyTotpToken, generateRecoveryCodes } = await import('./totp.service.js');
  const isValid = verifyTotpToken(verificationCode, secret);
  if (!isValid) {
    throw new Error('کد ۶ رقمی واردشده نامعتبر است یا منقضی شده است.');
  }

  const recoveryCodes = generateRecoveryCodes(8);
  const encryptedSecret = JSON.stringify(encryptSecret(secret));
  const hashedRecoveryCodes = recoveryCodes.map(hashRecoveryCode);

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: true,
      twoFactorSecret: encryptedSecret,
      twoFactorRecoveryCodes: hashedRecoveryCodes,
    },
  });

  return { recoveryCodes };
}

/**
 * غیرفعال‌سازی 2FA با تایید رمز عبور جاری
 */
export async function disable2FA(userId: string, passwordConfirm: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('کاربر مورد نظر یافت نشد.');
  }

  const isPasswordValid = verifyPassword(passwordConfirm, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('رمز عبور وارد شده نادرست است.');
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorRecoveryCodes: [],
    },
  });

  return true;
}

/**
 * بازتولید کدهای بازیابی اضطراری جدید
 */
export async function regenerateRecoveryCodes(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.twoFactorEnabled) {
    throw new Error('احراز هویت دو مرحله‌ای برای این کاربر فعال نیست.');
  }

  const { generateRecoveryCodes } = await import('./totp.service.js');
  const recoveryCodes = generateRecoveryCodes(8);
  const hashedRecoveryCodes = recoveryCodes.map(hashRecoveryCode);

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorRecoveryCodes: hashedRecoveryCodes,
    },
  });

  return recoveryCodes;
}
