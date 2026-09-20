import fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { env } from './config/env.js';
import { connectDatabase } from './services/prisma.service.js';

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
  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  await app.register(fastifyJwt, {
    secret: env.jwtSecret,
  });

  await app.register(multipart, {
    limits: {
      fileSize: env.maxFileSizeBytes,
    },
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
