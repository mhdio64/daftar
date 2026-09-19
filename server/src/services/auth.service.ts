import crypto from 'node:crypto';
import { Role } from '@prisma/client';
import { prisma } from './prisma.service.js';

const SCRYPT_KEYLEN = 64;

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  categoryPermissions: string[];
}

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
 * احراز هویت ورود کاربر و اعتبارسنجی دسترسی
 */
export async function authenticate(username: string, password: string): Promise<AuthUser | null> {
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

  const permissions = Array.isArray(user.categoryPermissions) 
    ? (user.categoryPermissions as string[]) 
    : [];

  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    categoryPermissions: permissions,
  };
}
