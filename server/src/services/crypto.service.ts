import crypto from 'node:crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // طول بردار استاندارد برای مود GCM (۱۲ بایت)

export interface EncryptedPayload {
  iv: string;        // بردار تصادفی به فرمت هگزادسیمال
  authTag: string;   // برچسب احراز اصالت ۱۶ بایتی به فرمت هگزادسیمال
  ciphertext: string;// متن رمزشده به فرمت هگزادسیمال
}

/**
 * رمزنگاری یک مقدار رشته‌ای (مانند رمز عبور، کلید خصوصی یا توکن) با الگوریتم AES-256-GCM
 */
export function encryptSecret(plainText: string, key = env.masterEncryptionKey): EncryptedPayload {
  if (typeof plainText !== 'string') {
    throw new TypeError('مقدار ورودی برای رمزنگاری باید رشته باشد.');
  }

  // تولید یک بردار اولیه کاملاً تصادفی و منحصربه‌فرد برای هر عملیات
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plainText, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  // استخراج برچسب ۱۶ بایتی تأیید اصالت داده (Auth Tag)
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    iv: iv.toString('hex'),
    authTag,
    ciphertext,
  };
}

/**
 * رمزگشایی مقدار و اعتبارسنجی اصالت با Auth Tag
 * در صورت دستکاری دیتابیس یا کلید اشتباه، استثنا پرتاب می‌شود.
 */
export function decryptSecret(payload: EncryptedPayload, key = env.masterEncryptionKey): string {
  if (!payload || !payload.iv || !payload.authTag || !payload.ciphertext) {
    throw new Error('ساختار پلود رمزنگاری‌شده ناقص یا نامعتبر است.');
  }

  const iv = Buffer.from(payload.iv, 'hex');
  const authTag = Buffer.from(payload.authTag, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  // ست کردن تگ برای بررسی عدم دستکاری در الگوریتم GCM
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(payload.ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * ماسک‌گذاری بصری برای نمایش در جدول (مثلاً تبدیل به 8 گلوله یا رشته ثابت)
 */
export function maskSecret(): string {
  return '••••••••';
}
