import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

// ایجاد یک نمونه یگانه (Singleton) از PrismaClient برای استفاده در کل برنامه
export const prisma = new PrismaClient({
  log: env.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// اتصال تمیز به پایگاه داده
export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ اتصال موفق به پایگاه‌داده PostgreSQL برقرار شد.');
  } catch (error) {
    console.warn('⚠️ عدم امکان اتصال مستقیم به دیتابیس در زمان اجرا (لطفا کانتینر داکر دیتابیس را بررسی کنید):', (error as Error).message);
  }
}
