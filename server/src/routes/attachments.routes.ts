import { FastifyInstance } from 'fastify';
import { Role } from '@prisma/client';
import { prisma } from '../services/prisma.service.js';
import { requireAuth, canAccessCategory } from '../middlewares/auth.middleware.js';
import { storageService } from '../services/storage.service.js';
import { logAudit } from '../services/audit.service.js';

export async function attachmentsRoutes(app: FastifyInstance) {
  // دریافت لیست پیوست‌های یک دارایی یا یک دسته‌بندی
  app.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const query = request.query as { assetId?: string; assetTypeId?: string };
    const user = request.user!;

    if (!query.assetId && !query.assetTypeId) {
      return reply.status(400).send({ message: 'حداقل یکی از شناسه‌های assetId یا assetTypeId الزامی است.' });
    }

    // بررسی دسترسی کاربر
    let targetAssetTypeId = query.assetTypeId;
    if (query.assetId && !targetAssetTypeId) {
      const asset = await prisma.asset.findUnique({
        where: { id: query.assetId },
        select: { assetTypeId: true },
      });
      if (asset) targetAssetTypeId = asset.assetTypeId;
    }

    if (targetAssetTypeId && user.role !== Role.ADMIN && !canAccessCategory(user, targetAssetTypeId)) {
      return reply.status(403).send({ message: 'شما دسترسی مجاز به این دسته‌بندی را ندارید.' });
    }

    const items = await prisma.attachment.findMany({
      where: {
        ...(query.assetId ? { assetId: query.assetId } : {}),
        ...(query.assetTypeId ? { assetTypeId: query.assetTypeId } : {}),
      },
      include: {
        uploadedBy: {
          select: { id: true, fullName: true, username: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { items };
  });

  // آپلود فایل پیوست جدید (Multipart)
  app.post('/upload', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user!;
    if (user.role === Role.VIEWER) {
      return reply.status(403).send({ message: 'کاربران با نقش مشاهده‌گر مجاز به آپلود فایل نیستند.' });
    }

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ message: 'هیچ فایلی برای آپلود ارسال نشده است.' });
    }

    // استخراج فیلدها از فرم دیتا یا کوئری
    const query = request.query as { assetId?: string; assetTypeId?: string };
    let assetId = query.assetId;
    let assetTypeId = query.assetTypeId;

    if (data.fields) {
      if (!assetId && data.fields.assetId) {
        const field: any = data.fields.assetId;
        assetId = typeof field === 'object' ? field.value : String(field);
      }
      if (!assetTypeId && data.fields.assetTypeId) {
        const field: any = data.fields.assetTypeId;
        assetTypeId = typeof field === 'object' ? field.value : String(field);
      }
    }

    if (!assetId && !assetTypeId) {
      return reply.status(400).send({ message: 'مشخص کردن حداقل یکی از پارامترهای assetId یا assetTypeId الزامی است.' });
    }

    // بررسی دسترسی دسته در صورت نیاز
    let targetAssetTypeId = assetTypeId;
    if (assetId && !targetAssetTypeId) {
      const asset = await prisma.asset.findUnique({
        where: { id: assetId },
        select: { assetTypeId: true },
      });
      if (asset) targetAssetTypeId = asset.assetTypeId;
    }

    if (targetAssetTypeId && user.role !== Role.ADMIN && !canAccessCategory(user, targetAssetTypeId)) {
      return reply.status(403).send({ message: 'شما دسترسی مجاز برای بارگذاری فایل در این دسته‌بندی را ندارید.' });
    }

    try {
      // ذخیره استریم فایل روی دیسک
      const saved = await storageService.saveStream(data.file, data.filename);

      // ثبت در دیتابیس
      const created = await prisma.attachment.create({
        data: {
          assetId: assetId || null,
          assetTypeId: assetTypeId || null,
          originalName: data.filename || 'uploaded_file',
          storagePath: saved.storagePath,
          mimeType: data.mimetype || 'application/octet-stream',
          sizeBytes: saved.sizeBytes,
          uploadedById: user.id,
        },
        include: {
          uploadedBy: {
            select: { id: true, fullName: true, username: true, role: true },
          },
        },
      });

      await logAudit({
        userId: user.id,
        action: 'CREATE',
        targetEntity: 'Attachment',
        targetId: created.id,
        diff: {
          originalName: created.originalName,
          sizeBytes: created.sizeBytes,
          assetId: created.assetId,
          assetTypeId: created.assetTypeId,
        },
      });

      return reply.status(201).send(created);
    } catch (err: any) {
      return reply.status(500).send({ message: err.message || 'خطا در ذخیره‌سازی فایل روی سرور' });
    }
  });

  // دانلود مستقیم فایل پیوست با استریم امن
  app.get('/:id/download', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;

    const attachment = await prisma.attachment.findUnique({
      where: { id },
      include: {
        asset: { select: { assetTypeId: true } },
      },
    });

    if (!attachment) {
      return reply.status(404).send({ message: 'فایل پیوست مورد نظر یافت نشد.' });
    }

    const categoryId = attachment.assetTypeId || attachment.asset?.assetTypeId;
    if (categoryId && user.role !== Role.ADMIN && !canAccessCategory(user, categoryId)) {
      return reply.status(403).send({ message: 'شما دسترسی لازم برای دانلود این فایل را ندارید.' });
    }

    try {
      const readStream = storageService.getReadStream(attachment.storagePath);
      const encodedFilename = encodeURIComponent(attachment.originalName);

      reply.header(
        'Content-Disposition',
        `attachment; filename="${attachment.originalName}"; filename*=UTF-8''${encodedFilename}`
      );
      reply.header('Content-Type', attachment.mimeType || 'application/octet-stream');
      reply.header('Content-Length', attachment.sizeBytes);

      return reply.send(readStream);
    } catch (err: any) {
      return reply.status(404).send({ message: err.message || 'فایل بر روی دیسک سرور یافت نشد.' });
    }
  });

  // حذف فایل پیوست از دیتابیس و دیسک
  app.delete('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;

    if (user.role === Role.VIEWER) {
      return reply.status(403).send({ message: 'کاربران با نقش مشاهده‌گر مجاز به حذف فایل نیستند.' });
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id },
      include: {
        asset: { select: { assetTypeId: true } },
      },
    });

    if (!attachment) {
      return reply.status(404).send({ message: 'فایل پیوست یافت نشد.' });
    }

    const categoryId = attachment.assetTypeId || attachment.asset?.assetTypeId;
    if (categoryId && user.role !== Role.ADMIN && !canAccessCategory(user, categoryId)) {
      return reply.status(403).send({ message: 'شما دسترسی لازم برای حذف این فایل را ندارید.' });
    }

    try {
      await prisma.attachment.delete({ where: { id } });
      await storageService.deleteFile(attachment.storagePath);

      await logAudit({
        userId: user.id,
        action: 'DELETE',
        targetEntity: 'Attachment',
        targetId: id,
        diff: { originalName: attachment.originalName },
      });

      return { message: 'فایل پیوست با موفقیت حذف شد.' };
    } catch (err: any) {
      return reply.status(500).send({ message: err.message || 'خطا در حذف فایل' });
    }
  });
}
