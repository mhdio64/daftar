import { FastifyPluginAsync } from 'fastify';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import { backupService, BackupBundle } from '../services/backup.service.js';

export const backupRoutes: FastifyPluginAsync = async (app) => {
  /**
   * دریافت نسخه پشتیبان کامل سیستم (JSON)
   */
  app.get('/export', { preHandler: [requireAdmin] }, async (request, reply) => {
    const query = request.query as any;
    const includeUsers = query?.includeUsers === 'true';

    const bundle = await backupService.createBackupBundle(request.user.id, { includeUsers });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `daftar_backup_${timestamp}.json`;

    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    reply.header('Content-Type', 'application/json; charset=utf-8');
    return bundle;
  });

  /**
   * بازیابی اطلاعات از فایل پشتیبان
   */
  app.post('/restore', { preHandler: [requireAdmin] }, async (request, reply) => {
    const body = request.body as {
      bundle: BackupBundle;
      mode?: 'clean' | 'merge';
    };

    if (!body || !body.bundle) {
      return reply.status(400).send({
        statusCode: 400,
        message: 'فایل پشتیبان ارسال نشده یا نامعتبر است.',
      });
    }

    const mode = body.mode === 'merge' ? 'merge' : 'clean';

    try {
      const stats = await backupService.restoreBackupBundle(request.user.id, body.bundle, { mode });
      return {
        success: true,
        message: `بازیابی با موفقیت انجام شد (${stats.restoredTypesCount} دسته‌بندی و ${stats.restoredAssetsCount} دارایی).`,
        stats,
      };
    } catch (err: any) {
      return reply.status(400).send({
        statusCode: 400,
        message: err.message || 'خطا در بازیابی اطلاعات',
      });
    }
  });
};
