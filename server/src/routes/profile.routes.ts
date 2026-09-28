import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../services/prisma.service.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { hashPassword, verifyPassword } from '../services/auth.service.js';
import { logAudit } from '../services/audit.service.js';
import { validateSafeExternalUrl } from './alerts.routes.js';

export async function profileRoutes(app: FastifyInstance) {
  // دریافت مشخصات کامل پروفایل و شخصی‌سازی‌های کاربر جاری
  app.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        categoryPermissions: true,
        twoFactorEnabled: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            createdAssets: true,
            auditLogs: true,
          },
        },
      },
    });

    if (!user) {
      return reply.status(404).send({ message: 'کاربر یافت نشد.' });
    }

    return {
      user: {
        ...user,
        categoryPermissions: Array.isArray(user.categoryPermissions) ? user.categoryPermissions : [],
        preferences: (typeof user.preferences === 'object' && user.preferences !== null) ? user.preferences : {},
        assetsCount: user._count.createdAssets,
        activityCount: user._count.auditLogs,
      },
    };
  });

  // ویرایش مشخصات پروفایل و تنظیمات شخصی‌سازی
  app.put('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const schema = z.object({
      fullName: z.string().min(2, 'نام و نام خانوادگی باید حداقل ۲ کاراکتر باشد').optional(),
      preferences: z.record(z.any()).optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0].message });
    }

    const existing = await prisma.user.findUnique({
      where: { id: request.user.id },
    });

    if (!existing) {
      return reply.status(404).send({ message: 'کاربر یافت نشد.' });
    }

    const currentPreferences = (typeof existing.preferences === 'object' && existing.preferences !== null)
      ? (existing.preferences as Record<string, any>)
      : {};

    const updatedPreferences = parsed.data.preferences
      ? { ...currentPreferences, ...parsed.data.preferences }
      : currentPreferences;

    const updated = await prisma.user.update({
      where: { id: request.user.id },
      data: {
        ...(parsed.data.fullName ? { fullName: parsed.data.fullName.trim() } : {}),
        preferences: updatedPreferences,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        categoryPermissions: true,
        twoFactorEnabled: true,
        preferences: true,
        updatedAt: true,
      },
    });

    await logAudit({
      userId: request.user.id,
      action: 'UPDATE_PROFILE',
      targetEntity: 'User',
      targetId: request.user.username,
      diff: {
        fullName: parsed.data.fullName ? { old: existing.fullName, new: updated.fullName } : undefined,
        preferences: parsed.data.preferences ? { note: 'بروزرسانی شخصی‌سازی‌های پروفایل کاربر' } : undefined,
      },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return {
      message: 'پروفایل و تنظیمات شما با موفقیت ذخیره شد.',
      user: updated,
    };
  });

  // تغییر رمز عبور شخصی کاربر
  app.post('/change-password', { preHandler: [requireAuth] }, async (request, reply) => {
    const schema = z.object({
      currentPassword: z.string().min(1, 'رمز عبور فعلی الزامی است'),
      newPassword: z.string().min(6, 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد'),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0].message });
    }

    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
    });

    if (!user) {
      return reply.status(404).send({ message: 'کاربر یافت نشد.' });
    }

    const isMatch = verifyPassword(parsed.data.currentPassword, user.passwordHash);
    if (!isMatch) {
      return reply.status(400).send({ message: 'رمز عبور فعلی اشتباه است.' });
    }

    const newHash = hashPassword(parsed.data.newPassword);
    await prisma.user.update({
      where: { id: request.user.id },
      data: { passwordHash: newHash },
    });

    await logAudit({
      userId: request.user.id,
      action: 'CHANGE_PASSWORD',
      targetEntity: 'User',
      targetId: request.user.username,
      diff: { note: 'تغییر رمز عبور شخصی با موفقیت انجام شد' },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return { message: 'رمز عبور شما با موفقیت تغییر یافت.' };
  });

  // تست ارسال هشدار آزمایشی به کانال شخصی کاربر
  app.post('/test-alert', { preHandler: [requireAuth] }, async (request, reply) => {
    const schema = z.object({
      channel: z.enum(['telegram', 'bale', 'email', 'sms', 'discord', 'webhook']),
      target: z.string().min(1, 'مقصد ارسال هشدار الزامی است'),
      botToken: z.string().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0].message });
    }

    const { channel, target, botToken } = parsed.data;
    const testMessage = `🔔 **پیام آزمایشی شخصی سامانه «دفتر»**\nکاربر گرامی ${request.user.fullName}، کانال اطلاع‌رسانی شما با موفقیت متصل شد.\nزمان سرور: ${new Date().toLocaleTimeString('fa-IR')}`;

    try {
      if (channel === 'telegram') {
        const token = botToken || process.env.TELEGRAM_BOT_TOKEN;
        if (!token) {
          return reply.status(400).send({ message: 'توکن ربات تلگرام تنظیم نشده است.' });
        }
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: target,
            text: testMessage,
            parse_mode: 'Markdown',
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          return reply.status(400).send({ message: (data as any)?.description || 'خطا در ارتباط با تلگرام' });
        }
        return { success: true, message: 'پیام آزمایشی به تلگرام ارسال شد.' };
      }

      if (channel === 'bale') {
        const token = botToken || process.env.BALE_BOT_TOKEN;
        if (!token) {
          return reply.status(400).send({ message: 'توکن ربات بله تنظیم نشده است.' });
        }
        const res = await fetch(`https://tapi.bale.ai/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: target,
            text: testMessage,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          return reply.status(400).send({ message: (data as any)?.description || 'خطا در ارسال به بازوی بله' });
        }
        return { success: true, message: 'پیام آزمایشی به پیام‌رسان بله ارسال شد.' };
      }

      if (channel === 'email') {
        // برای ایمیل می‌توانیم فرمت را چک کنیم
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(target)) {
          return reply.status(400).send({ message: 'فرمت آدرس ایمیل نامعتبر است.' });
        }
        return {
          success: true,
          message: `آدرس ایمیل ${target} جهت دریافت اعلان‌های شخصی تایید شد.`,
        };
      }

      if (channel === 'sms') {
        const phoneClean = target.replace(/\D/g, '');
        if (phoneClean.length < 10) {
          return reply.status(400).send({ message: 'شماره تلفن همراه نامعتبر است.' });
        }
        return {
          success: true,
          message: `شماره تماس ${target} جهت هشدارهای پیامکی ثبت شد.`,
        };
      }

      return { success: true, message: 'کانال اعلان با موفقیت ثبت شد.' };
    } catch (err: any) {
      return reply.status(500).send({ message: err.message || 'خطا در برقراری ارتباط با سرویس پیام‌رسان' });
    }
  });
}
