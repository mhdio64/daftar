import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { 
  authenticate, 
  isSetupNeeded, 
  setupInitialAdmin 
} from '../services/auth.service.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { logAudit } from '../services/audit.service.js';

export async function authRoutes(app: FastifyInstance) {
  // بررسی نیاز به ویزارد راه‌اندازی اولیه
  app.get('/setup-status', async () => {
    const needed = await isSetupNeeded();
    return { setupNeeded: needed };
  });

  // ثبت حساب مدیر ارشد در اولین راه‌اندازی
  app.post('/setup', async (request, reply) => {
    const schema = z.object({
      username: z.string().min(3, 'نام کاربری باید حداقل ۳ کاراکتر باشد'),
      fullName: z.string().min(2, 'نام و نام خانوادگی الزامی است'),
      password: z.string().min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد'),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        message: parsed.error.errors[0].message,
      });
    }

    try {
      const admin = await setupInitialAdmin(parsed.data);
      const token = app.jwt.sign(
        {
          id: admin.id,
          username: admin.username,
          fullName: admin.fullName,
          role: admin.role,
          categoryPermissions: [],
        },
        { expiresIn: '8h' }
      );

      return {
        message: 'مدیر ارشد با موفقیت ایجاد شد.',
        token,
        user: admin,
      };
    } catch (err: any) {
      return reply.status(400).send({
        statusCode: 400,
        message: err.message,
      });
    }
  });

  // ورود به سامانه با محافظت اختصاصی ضد حملات Brute-Force (حداکثر ۱۰ تلاش در دقیقه)
  app.post('/login', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const schema = z.object({
      username: z.string().min(1, 'نام کاربری الزامی است'),
      password: z.string().min(1, 'رمز عبور الزامی است'),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        message: parsed.error.errors[0].message,
      });
    }

    const { authenticate } = await import('../services/auth.service.js');
    const authResult = await authenticate(parsed.data.username, parsed.data.password);
    if (!authResult) {
      return reply.status(401).send({
        statusCode: 401,
        message: 'نام کاربری یا رمز عبور اشتباه است.',
      });
    }

    // اگر نیاز به مرحله دوم (2FA) باشد
    if (authResult.requires2FA) {
      const tempToken = app.jwt.sign(
        { id: authResult.userId, username: authResult.username, isTemp2FA: true },
        { expiresIn: '5m' }
      );

      return {
        requires2FA: true,
        tempToken,
        message: 'لطفاً کد ۶ رقمی امنیتی یا کد بازیابی خود را وارد نمایید.',
      };
    }

    // ورود مستقیم در صورت عدم فعال بودن 2FA (با انقضای ۸ ساعته)
    const token = app.jwt.sign(authResult.user, { expiresIn: '8h' });

    await logAudit({
      userId: authResult.user.id,
      action: 'LOGIN',
      targetEntity: 'User',
      targetId: authResult.user.username,
      diff: { method: 'PASSWORD', role: authResult.user.role },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return {
      requires2FA: false,
      message: 'ورود با موفقیت انجام شد.',
      token,
      user: authResult.user,
    };
  });

  // تایید مرحله دوم ورود با کد ۶ رقمی یا کد اضطراری (حداکثر ۱۰ تلاش در دقیقه)
  app.post('/verify-2fa', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const schema = z.object({
      tempToken: z.string().min(1, 'توکن موقت الزامی است'),
      code: z.string().min(1, 'کد تایید الزامی است'),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        message: parsed.error.errors[0].message,
      });
    }

    let decoded: any;
    try {
      decoded = app.jwt.verify(parsed.data.tempToken);
    } catch {
      return reply.status(401).send({
        statusCode: 401,
        message: 'اعتبار جلسه ورود منقضی شده است. لطفاً مجدداً وارد شوید.',
      });
    }

    if (!decoded || !decoded.isTemp2FA || !decoded.id) {
      return reply.status(401).send({
        statusCode: 401,
        message: 'توکن نامعتبر است.',
      });
    }

    const { verifyLogin2FA } = await import('../services/auth.service.js');
    const user = await verifyLogin2FA(decoded.id, parsed.data.code);

    if (!user) {
      return reply.status(401).send({
        statusCode: 401,
        message: 'کد ۶ رقمی یا کد بازیابی اضطراری اشتباه است یا منقضی شده است.',
      });
    }

    // ورود دو مرحله‌ای موفق (با انقضای ۸ ساعته)
    const token = app.jwt.sign(user, { expiresIn: '8h' });

    await logAudit({
      userId: user.id,
      action: 'LOGIN',
      targetEntity: 'User',
      targetId: user.username,
      diff: { method: '2FA_TOTP', role: user.role },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return {
      requires2FA: false,
      message: 'ورود دو مرحله‌ای با موفقیت انجام شد.',
      token,
      user,
    };
  });

  // ۱. دریافت مشخصات اولیه راه‌اندازی 2FA (QR Code و Secret Key)
  app.post('/2fa/setup', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { initiate2FASetup } = await import('../services/auth.service.js');
      const data = await initiate2FASetup(request.user!.id);
      return data;
    } catch (err: any) {
      return reply.status(400).send({ statusCode: 400, message: err.message });
    }
  });

  // ۲. اعتبارسنجی اولیه و فعال‌سازی نهایی 2FA
  app.post('/2fa/enable', { preHandler: [requireAuth] }, async (request, reply) => {
    const schema = z.object({
      secret: z.string().min(16, 'کلید محرمانه نامعتبر است'),
      code: z.string().min(6, 'کد ۶ رقمی الزامی است'),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ statusCode: 400, message: parsed.error.errors[0].message });
    }

    try {
      const { complete2FAEnable } = await import('../services/auth.service.js');
      const result = await complete2FAEnable(request.user!.id, parsed.data.secret, parsed.data.code);

      await logAudit({
        userId: request.user!.id,
        action: '2FA_ENABLE',
        targetEntity: 'User',
        targetId: request.user!.username,
        diff: { method: 'TOTP_RFC6238', recoveryCodesCount: result.recoveryCodes.length },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return {
        message: 'احراز هویت دو مرحله‌ای با موفقیت فعال شد.',
        recoveryCodes: result.recoveryCodes,
      };
    } catch (err: any) {
      return reply.status(400).send({ statusCode: 400, message: err.message });
    }
  });

  // ۳. غیرفعال‌سازی 2FA
  app.post('/2fa/disable', { preHandler: [requireAuth] }, async (request, reply) => {
    const schema = z.object({
      password: z.string().min(1, 'ورود رمز عبور جهت تایید هویت الزامی است'),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ statusCode: 400, message: parsed.error.errors[0].message });
    }

    try {
      const { disable2FA } = await import('../services/auth.service.js');
      await disable2FA(request.user!.id, parsed.data.password);

      await logAudit({
        userId: request.user!.id,
        action: '2FA_DISABLE',
        targetEntity: 'User',
        targetId: request.user!.username,
        diff: { note: 'غیرفعال‌سازی 2FA با تایید رمز عبور جاری' },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return {
        message: 'احراز هویت دو مرحله‌ای با موفقیت غیرفعال شد.',
      };
    } catch (err: any) {
      return reply.status(400).send({ statusCode: 400, message: err.message });
    }
  });

  // ۴. تولید مجدد کدهای بازیابی اضطراری
  app.post('/2fa/recovery-codes', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { regenerateRecoveryCodes } = await import('../services/auth.service.js');
      const codes = await regenerateRecoveryCodes(request.user!.id);

      await logAudit({
        userId: request.user!.id,
        action: 'UPDATE',
        targetEntity: 'User',
        targetId: request.user!.username,
        diff: { action: 'REGENERATE_RECOVERY_CODES', count: codes.length },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return {
        message: 'کدهای بازیابی اضطراری جدید صادر شدند.',
        recoveryCodes: codes,
      };
    } catch (err: any) {
      return reply.status(400).send({ statusCode: 400, message: err.message });
    }
  });

  // دریافت اطلاعات کاربر جاری
  app.get('/me', { preHandler: [requireAuth] }, async (request) => {
    return { user: request.user };
  });
}
