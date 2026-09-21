import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../services/prisma.service.js';
import { requireAuth, requireEditor, canAccessCategory } from '../middlewares/auth.middleware.js';
import { logAudit } from '../services/audit.service.js';

export async function remindersRoutes(app: FastifyInstance) {
  // دریافت لیست تمام دارایی‌های دارای سررسید به همراه برچسب وضعیت با رعایت سطح دسترسی
  app.get('/', { preHandler: [requireAuth] }, async (request) => {
    const user = request.user!;
    const assets = await prisma.asset.findMany({
      where: {
        expiryDate: { not: null },
      },
      include: {
        assetType: true,
      },
      orderBy: {
        expiryDate: 'asc',
      },
    });

    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;

    const filteredAssets = assets.filter((a) => canAccessCategory(user, a.assetTypeId));

    const categorized = filteredAssets.map((asset) => {
      const expiry = new Date(asset.expiryDate!);
      const diffMs = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / oneDay);

      let status: 'expired' | 'critical' | 'warningHigh' | 'warningMid' | 'healthy';
      if (diffDays < 0) {
        status = 'expired';
      } else if (diffDays <= 1) {
        status = 'critical';
      } else if (diffDays <= 7) {
        status = 'warningHigh';
      } else if (diffDays <= 30) {
        status = 'warningMid';
      } else {
        status = 'healthy';
      }

      return {
        id: asset.id,
        title: asset.title,
        assetType: {
          id: asset.assetType.id,
          name: asset.assetType.name,
          icon: asset.assetType.icon,
        },
        expiryDate: asset.expiryDate,
        daysRemaining: diffDays,
        status,
      };
    });

    return {
      items: categorized,
      counts: {
        total: categorized.length,
        expired: categorized.filter((i) => i.status === 'expired').length,
        critical: categorized.filter((i) => i.status === 'critical').length,
        warningHigh: categorized.filter((i) => i.status === 'warningHigh').length,
        warningMid: categorized.filter((i) => i.status === 'warningMid').length,
      },
    };
  });

  // ثبت تمدید دوره دارایی و ذخیره در تاریخچه RenewalLog
  app.post('/:assetId/renew', { preHandler: [requireEditor] }, async (request, reply) => {
    const { assetId } = request.params as { assetId: string };
    const schema = z.object({
      newExpiryDate: z.string().min(1, 'تاریخ انقضای جدید الزامی است'),
      cost: z.number().optional().nullable(),
      note: z.string().optional().nullable(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0].message });
    }

    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
      return reply.status(404).send({ message: 'دارایی مورد نظر یافت نشد.' });
    }

    if (!canAccessCategory(request.user!, asset.assetTypeId)) {
      return reply.status(403).send({ message: 'شما اجازه ثبت تمدید دوره برای دارایی‌های این دسته را ندارید.' });
    }

    const newExpiry = new Date(parsed.data.newExpiryDate);
    const previousExpiry = asset.expiryDate;

    // ثبت در جدول تاریخچه تمدیدها و به‌روزرسانی دارایی در قالب تراکنش
    const [renewalLog, updatedAsset] = await prisma.$transaction([
      prisma.renewalLog.create({
        data: {
          assetId,
          previousExpiryDate: previousExpiry,
          newExpiryDate: newExpiry,
          cost: parsed.data.cost ? BigInt(parsed.data.cost) : null,
          note: parsed.data.note,
          renewedById: request.user!.id,
        },
      }),
      prisma.asset.update({
        where: { id: assetId },
        data: {
          expiryDate: newExpiry,
          updatedById: request.user!.id,
        },
      }),
    ]);

    await logAudit({
      userId: request.user!.id,
      action: 'UPDATE',
      targetEntity: 'Asset',
      targetId: assetId,
      diff: {
        expiryDate: { old: previousExpiry, new: newExpiry, note: 'تمدید دوره توسط کاربر' },
      },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return {
      message: 'تمدید دوره با موفقیت ثبت شد.',
      assetId: updatedAsset.id,
      newExpiryDate: updatedAsset.expiryDate,
      renewalId: renewalLog.id,
    };
  });
}
