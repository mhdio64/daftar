import { FastifyInstance } from 'fastify';
import * as XLSX from 'xlsx';
import { prisma } from '../services/prisma.service.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';

export async function auditRoutes(app: FastifyInstance) {
  // مشاهده آمار کلیدی و شاخص‌های امنیتی لاگ‌ها (مخصوص مدیر ارشد)
  app.get('/stats', { preHandler: [requireAdmin] }, async () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalEvents, secretViews, recentSecretViews, todayChanges, loginEvents] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.count({ where: { action: 'READ_SECRET' } }),
      prisma.auditLog.count({
        where: {
          action: 'READ_SECRET',
          createdAt: { gte: oneDayAgo },
        },
      }),
      prisma.auditLog.count({
        where: {
          action: { in: ['CREATE', 'UPDATE', 'DELETE'] },
          createdAt: { gte: startOfToday },
        },
      }),
      prisma.auditLog.count({ where: { action: 'LOGIN' } }),
    ]);

    return {
      totalEvents,
      secretViews,
      recentSecretViews,
      todayChanges,
      loginEvents,
    };
  });

  // دریافت خروجی اکسل از لاگ‌های ممیزی
  app.get('/export-excel', { preHandler: [requireAdmin] }, async (request, reply) => {
    const query = request.query as {
      action?: string;
      userId?: string;
      targetEntity?: string;
    };

    const where: any = {};
    if (query.action) where.action = query.action;
    if (query.userId) where.userId = query.userId;
    if (query.targetEntity) where.targetEntity = query.targetEntity;

    const logs = await prisma.auditLog.findMany({
      where,
      take: 2000,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { fullName: true, username: true, role: true },
        },
      },
    });

    const actionLabels: Record<string, string> = {
      CREATE: 'ثبت جدید',
      UPDATE: 'ویرایش',
      DELETE: 'حذف',
      READ_SECRET: 'مشاهده رمز محرمانه',
      LOGIN: 'ورود به سامانه',
      LOGOUT: 'خروج از سامانه',
    };

    const rows = logs.map((log, index) => ({
      'ردیف': index + 1,
      'تاریخ و ساعت': new Date(log.createdAt).toLocaleString('fa-IR'),
      'نام کاربر': log.user.fullName || log.user.username,
      'شناسه کاربری': log.user.username,
      'نقش': log.user.role === 'ADMIN' ? 'مدیر ارشد' : log.user.role === 'EDITOR' ? 'اپراتور' : 'مشاهده‌گر',
      'عملیات': actionLabels[log.action] || log.action,
      'موجودیت': log.targetEntity,
      'شناسه هدف': log.targetId,
      'آدرس IP': log.ipAddress || '—',
      'تغییرات': log.diff ? JSON.stringify(log.diff) : '—',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 8 },
      { wch: 22 },
      { wch: 20 },
      { wch: 15 },
      { wch: 12 },
      { wch: 20 },
      { wch: 15 },
      { wch: 24 },
      { wch: 16 },
      { wch: 40 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'لاگ‌های ممیزی');
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    reply.header(
      'Content-Disposition',
      `attachment; filename="audit_logs_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.xlsx"`
    );
    reply.header(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    return reply.send(buffer);
  });

  // مشاهده لیست لاگ‌های ممیزی و امنیتی (مخصوص مدیر ارشد)
  app.get('/', { preHandler: [requireAdmin] }, async (request) => {
    const query = request.query as {
      page?: string;
      limit?: string;
      action?: string;
      userId?: string;
      targetEntity?: string;
      search?: string;
    };

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.action && query.action !== 'ALL') {
      where.action = query.action;
    }
    if (query.userId && query.userId !== 'ALL') {
      where.userId = query.userId;
    }
    if (query.targetEntity && query.targetEntity !== 'ALL') {
      where.targetEntity = query.targetEntity;
    }
    if (query.search) {
      where.OR = [
        { targetId: { contains: query.search, mode: 'insensitive' } },
        { ipAddress: { contains: query.search } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              role: true,
            },
          },
        },
      }),
    ]);

    return {
      items: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });
}
