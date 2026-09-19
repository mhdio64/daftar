import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { 
  authenticate, 
  isSetupNeeded, 
  setupInitialAdmin 
} from '../services/auth.service.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

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
      const token = app.jwt.sign({
        id: admin.id,
        username: admin.username,
        fullName: admin.fullName,
        role: admin.role,
        categoryPermissions: [],
      });

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

  // ورود به سامانه
  app.post('/login', async (request, reply) => {
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

    const user = await authenticate(parsed.data.username, parsed.data.password);
    if (!user) {
      return reply.status(401).send({
        statusCode: 401,
        message: 'نام کاربری یا رمز عبور اشتباه است.',
      });
    }

    const token = app.jwt.sign(user);

    return {
      message: 'ورود با موفقیت انجام شد.',
      token,
      user,
    };
  });

  // دریافت اطلاعات کاربر جاری
  app.get('/me', { preHandler: [requireAuth] }, async (request) => {
    return { user: request.user };
  });
}
