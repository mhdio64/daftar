import fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { connectDatabase } from './services/prisma.service.js';
import { notificationWorkerService } from './services/notification-worker.service.js';

// ایمپورت مسیرها
import { authRoutes } from './routes/auth.routes.js';
import { assetTypesRoutes } from './routes/asset-types.routes.js';
import { assetsRoutes } from './routes/assets.routes.js';
import { remindersRoutes } from './routes/reminders.routes.js';
import { auditRoutes } from './routes/audit.routes.js';
import { usersRoutes } from './routes/users.routes.js';
import { attachmentsRoutes } from './routes/attachments.routes.js';
import { alertsRoutes } from './routes/alerts.routes.js';
import { backupRoutes } from './routes/backup.routes.js';

export async function buildApp() {
  const app = fastify({
    logger: {
      level: env.nodeEnv === 'development' ? 'info' : 'warn',
    },
  });

  // ثبت پلاگین‌های اصلی
  // ثبت پلاگین‌های اصلی با سیاست امنیتی CORS
  await app.register(cors, {
    origin: (origin, cb) => {
      // مجاز بودن درخواست‌های داخلی یا محیط لوکال‌هاست
      if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        cb(null, true);
        return;
      }
      // دامنه‌های مجاز سفارشی از فایل محیطی
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((s) => s.trim()) || [];
      if (allowedOrigins.includes(origin)) {
        cb(null, true);
        return;
      }
      cb(new Error('دسترسی امنیتی CORS: مبدا درخواست غیرمجاز است.'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  await app.register(fastifyJwt, {
    secret: env.jwtSecret,
    sign: {
      expiresIn: '8h',
    },
  });

  await app.register(multipart, {
    limits: {
      fileSize: env.maxFileSizeBytes,
    },
  });

  // هدرهای امنیتی استاندارد OWASP (ضد کلیک‌جکینگ، ضد Sniffing)
  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  });

  // کنترل نرخ درخواست‌ها جهت مهار حملات Brute-force و DoS
  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'تعداد درخواست‌های ارسالی بیش از حد مجاز است. لطفاً کمی صبر کرده و مجدداً تلاش کنید.',
    }),
  });

  // مسیرهای بررسی سلامت
  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'daftar-api',
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
    };
  });

  // ثبت ماژول‌های مسیرهای API
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(assetTypesRoutes, { prefix: '/api/asset-types' });
  await app.register(assetsRoutes, { prefix: '/api/assets' });
  await app.register(remindersRoutes, { prefix: '/api/reminders' });
  await app.register(auditRoutes, { prefix: '/api/audit-logs' });
  await app.register(usersRoutes, { prefix: '/api/users' });
  await app.register(attachmentsRoutes, { prefix: '/api/attachments' });
  await app.register(alertsRoutes, { prefix: '/api/alerts' });
  await app.register(backupRoutes, { prefix: '/api/backup' });

  return app;
}

// راه‌اندازی سرور
if (process.env.NODE_ENV !== 'test') {
  buildApp()
    .then(async (app) => {
      await connectDatabase();
      notificationWorkerService.init();
      app.listen({ port: env.port, host: '0.0.0.0' }, (err, address) => {
        if (err) {
          app.log.error(err);
          process.exit(1);
        }
        console.log(`🚀 سرور سامانه «دفتر» با موفقیت روی ${address} راه‌اندازی شد.`);
      });
    })
    .catch((err) => {
      console.error('❌ خطای راه‌اندازی سرور:', err);
      process.exit(1);
    });
}
