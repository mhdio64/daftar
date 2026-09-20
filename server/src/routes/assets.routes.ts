import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../services/prisma.service.js';
import { 
  requireAuth, 
  requireEditor, 
  canAccessCategory 
} from '../middlewares/auth.middleware.js';
import { 
  createAsset, 
  createAssetsBatch,
  updateAsset, 
  rollbackAsset,
  getAssetTimeline,
  getAssetRelations,
  addAssetRelation,
  deleteAssetRelation,
  revealSecret, 
  formatAssetForClient, 
  getSecretKeysFromSchema 
} from '../services/asset.service.js';
import { generateExcelTemplate, generateAssetsExcel } from '../services/excel.service.js';
import { logAudit } from '../services/audit.service.js';

export async function assetsRoutes(app: FastifyInstance) {
  // دریافت لیست دارایی‌ها با امکان فیلتر بر اساس دسته، سرچ متنی و صفحه‌بندی
  app.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const query = request.query as {
      assetTypeId?: string;
      search?: string;
      page?: string;
      limit?: string;
    };

    const user = request.user!;
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50', 10)));
    const skip = (page - 1) * limit;

    // بررسی دسترسی کاربر به دسته مورد نظر
    if (query.assetTypeId && !canAccessCategory(user, query.assetTypeId)) {
      return reply.status(403).send({ message: 'شما دسترسی مشاهده دارایی‌های این دسته را ندارید.' });
    }

    const where: any = {};
    if (query.assetTypeId) {
      where.assetTypeId = query.assetTypeId;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { docsMarkdown: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, assets] = await Promise.all([
      prisma.asset.count({ where }),
      prisma.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { assetType: true },
      }),
    ]);

    const items = assets.map((asset) => {
      const secretKeys = getSecretKeysFromSchema(asset.assetType.schemaDefinition);
      return formatAssetForClient(asset, secretKeys);
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });

  // مشاهده یک دارایی به صورت تکی
  app.get('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: { assetType: true },
    });

    if (!asset) {
      return reply.status(404).send({ message: 'دارایی مورد نظر یافت نشد.' });
    }

    if (!canAccessCategory(request.user!, asset.assetTypeId)) {
      return reply.status(403).send({ message: 'عدم دسترسی به این دارایی.' });
    }

    const secretKeys = getSecretKeysFromSchema(asset.assetType.schemaDefinition);
    return formatAssetForClient(asset, secretKeys);
  });

  // ثبت دارایی جدید
  app.post('/', { preHandler: [requireEditor] }, async (request, reply) => {
    const schema = z.object({
      assetTypeId: z.string().min(1, 'شناسه دسته دارایی الزامی است'),
      title: z.string().min(1, 'عنوان دارایی الزامی است'),
      values: z.record(z.any()).default({}),
      tags: z.array(z.string()).optional(),
      expiryDate: z.string().optional().nullable(),
      docsMarkdown: z.string().optional().nullable(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0].message });
    }

    if (!canAccessCategory(request.user!, parsed.data.assetTypeId)) {
      return reply.status(403).send({ message: 'شما اجازه ثبت دارایی در این دسته را ندارید.' });
    }

    try {
      const result = await createAsset({
        userId: request.user!.id,
        assetTypeId: parsed.data.assetTypeId,
        title: parsed.data.title,
        inputValues: parsed.data.values,
        tags: parsed.data.tags,
        expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
        docsMarkdown: parsed.data.docsMarkdown,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return reply.status(201).send(result);
    } catch (err: any) {
      return reply.status(400).send({ message: err.message });
    }
  });

  // ثبت دسته‌ای دارایی‌ها (Batch Import)
  app.post('/batch', { preHandler: [requireEditor] }, async (request, reply) => {
    const schema = z.object({
      assetTypeId: z.string().min(1, 'شناسه دسته دارایی الزامی است'),
      items: z.array(
        z.object({
          title: z.string().min(1, 'عنوان دارایی الزامی است'),
          inputValues: z.record(z.any()).default({}),
          tags: z.array(z.string()).optional(),
          expiryDate: z.string().optional().nullable(),
          docsMarkdown: z.string().optional().nullable(),
        })
      ).min(1, 'حداقل یک دارایی برای ثبت الزامی است'),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0].message });
    }

    if (!canAccessCategory(request.user!, parsed.data.assetTypeId)) {
      return reply.status(403).send({ message: 'شما اجازه ثبت دارایی در این دسته را ندارید.' });
    }

    try {
      const itemsToCreate = parsed.data.items.map((item) => ({
        title: item.title,
        inputValues: item.inputValues,
        tags: item.tags,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
        docsMarkdown: item.docsMarkdown,
      }));

      const results = await createAssetsBatch({
        userId: request.user!.id,
        assetTypeId: parsed.data.assetTypeId,
        items: itemsToCreate,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return reply.status(201).send({
        message: `${results.length} دارایی با موفقیت ایجاد شد.`,
        items: results,
      });
    } catch (err: any) {
      return reply.status(400).send({ message: err.message });
    }
  });

  // دریافت تمپلیت اکسل استاندارد برای یک دسته‌بندی
  app.get('/excel-template/:assetTypeId', { preHandler: [requireAuth] }, async (request, reply) => {
    const { assetTypeId } = request.params as { assetTypeId: string };

    if (!canAccessCategory(request.user!, assetTypeId)) {
      return reply.status(403).send({ message: 'عدم دسترسی به این دسته دارایی.' });
    }

    const assetType = await prisma.assetType.findUnique({
      where: { id: assetTypeId },
    });

    if (!assetType) {
      return reply.status(404).send({ message: 'دسته دارایی مورد نظر یافت نشد.' });
    }

    const buffer = generateExcelTemplate(assetType as any);

    reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', `attachment; filename="template-${encodeURIComponent(assetType.slug)}.xlsx"`)
      .send(buffer);
  });

  // دریافت خروجی اکسل از کلیه دارایی‌های یک دسته‌بندی
  app.get('/export-excel/:assetTypeId', { preHandler: [requireAuth] }, async (request, reply) => {
    const { assetTypeId } = request.params as { assetTypeId: string };

    if (!canAccessCategory(request.user!, assetTypeId)) {
      return reply.status(403).send({ message: 'عدم دسترسی به این دسته دارایی.' });
    }

    const assetType = await prisma.assetType.findUnique({
      where: { id: assetTypeId },
    });

    if (!assetType) {
      return reply.status(404).send({ message: 'دسته دارایی مورد نظر یافت نشد.' });
    }

    const assets = await prisma.asset.findMany({
      where: { assetTypeId },
      orderBy: { createdAt: 'desc' },
    });

    const secretKeys = getSecretKeysFromSchema(assetType.schemaDefinition);
    const clientAssets = assets.map((a) => formatAssetForClient(a, secretKeys));

    const buffer = generateAssetsExcel(assetType as any, clientAssets);

    reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', `attachment; filename="export-${encodeURIComponent(assetType.slug)}.xlsx"`)
      .send(buffer);
  });

  // ویرایش دارایی
  app.put('/:id', { preHandler: [requireEditor] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const existing = await prisma.asset.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ message: 'دارایی یافت نشد.' });
    }

    if (!canAccessCategory(request.user!, existing.assetTypeId)) {
      return reply.status(403).send({ message: 'شما اجازه ویرایش دارایی در این دسته را ندارید.' });
    }

    try {
      const result = await updateAsset({
        assetId: id,
        userId: request.user!.id,
        title: body.title,
        inputValues: body.values,
        tags: Array.isArray(body.tags) ? body.tags : undefined,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : body.expiryDate === null ? null : undefined,
        docsMarkdown: body.docsMarkdown,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return result;
    } catch (err: any) {
      return reply.status(400).send({ message: err.message });
    }
  });

  // حذف دارایی
  app.delete('/:id', { preHandler: [requireEditor] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.asset.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ message: 'دارایی یافت نشد.' });
    }

    if (!canAccessCategory(request.user!, existing.assetTypeId)) {
      return reply.status(403).send({ message: 'شما اجازه حذف دارایی در این دسته را ندارید.' });
    }

    await prisma.asset.delete({ where: { id } });

    await logAudit({
      userId: request.user!.id,
      action: 'DELETE',
      targetEntity: 'Asset',
      targetId: id,
      diff: { title: { old: existing.title } },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return { message: 'دارایی با موفقیت حذف شد.' };
  });

  // بازگشایی و رمزگشایی فیلد محرمانه (Reveal Secret) با ثبت لاگ امنیتی
  app.post('/:id/reveal-secret', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      fieldKey: z.string().min(1, 'نام فیلد محرمانه الزامی است'),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0].message });
    }

    try {
      const plainSecret = await revealSecret({
        assetId: id,
        fieldKey: parsed.data.fieldKey,
        userId: request.user!.id,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return {
        fieldKey: parsed.data.fieldKey,
        value: plainSecret,
      };
    } catch (err: any) {
      return reply.status(400).send({ message: err.message });
    }
  });

  // دریافت تاریخچه تغییرات و تایم‌لاین دارایی
  app.get('/:id/timeline', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const asset = await prisma.asset.findUnique({
      where: { id },
      select: { assetTypeId: true },
    });

    if (!asset) {
      return reply.status(404).send({ message: 'دارایی مورد نظر یافت نشد.' });
    }

    if (!canAccessCategory(request.user!, asset.assetTypeId)) {
      return reply.status(403).send({ message: 'عدم دسترسی به تاریخچه این دارایی.' });
    }

    try {
      const logs = await getAssetTimeline(id);
      return logs;
    } catch (err: any) {
      return reply.status(400).send({ message: err.message });
    }
  });

  // بازگردانی دارایی به نسخه پیشین (Rollback)
  app.post('/:id/rollback', { preHandler: [requireEditor] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      logId: z.string().min(1, 'شناسه رکورد تاریخچه الزامی است'),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0].message });
    }

    const asset = await prisma.asset.findUnique({
      where: { id },
      select: { assetTypeId: true },
    });

    if (!asset) {
      return reply.status(404).send({ message: 'دارایی مورد نظر یافت نشد.' });
    }

    if (!canAccessCategory(request.user!, asset.assetTypeId)) {
      return reply.status(403).send({ message: 'شما اجازه ویرایش دارایی در این دسته را ندارید.' });
    }

    try {
      const updatedAsset = await rollbackAsset({
        assetId: id,
        logId: parsed.data.logId,
        userId: request.user!.id,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return updatedAsset;
    } catch (err: any) {
      return reply.status(400).send({ message: err.message });
    }
  });

  // دریافت ارتباطات و وابستگی‌های یک دارایی
  app.get('/:id/relations', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const asset = await prisma.asset.findUnique({
      where: { id },
      select: { assetTypeId: true },
    });

    if (!asset) {
      return reply.status(404).send({ message: 'دارایی مورد نظر یافت نشد.' });
    }

    if (!canAccessCategory(request.user!, asset.assetTypeId)) {
      return reply.status(403).send({ message: 'عدم دسترسی به این دارایی.' });
    }

    try {
      const data = await getAssetRelations(id);
      return data;
    } catch (err: any) {
      return reply.status(400).send({ message: err.message });
    }
  });

  // ثبت ارتباط و وابستگی جدید بین دو دارایی
  app.post('/:id/relations', { preHandler: [requireEditor] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      targetAssetId: z.string().min(1, 'شناسه دارایی مقصد الزامی است'),
      type: z.enum(['HOSTED_ON', 'DEPENDS_ON', 'POINTS_TO', 'BACKUP_OF', 'RELATED_TO']),
      note: z.string().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0].message });
    }

    const asset = await prisma.asset.findUnique({
      where: { id },
      select: { assetTypeId: true },
    });

    if (!asset) {
      return reply.status(404).send({ message: 'دارایی مبدا یافت نشد.' });
    }

    if (!canAccessCategory(request.user!, asset.assetTypeId)) {
      return reply.status(403).send({ message: 'شما اجازه ویرایش دارایی در این دسته را ندارید.' });
    }

    try {
      const relation = await addAssetRelation({
        sourceAssetId: id,
        targetAssetId: parsed.data.targetAssetId,
        type: parsed.data.type,
        note: parsed.data.note,
        userId: request.user!.id,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return reply.status(201).send(relation);
    } catch (err: any) {
      return reply.status(400).send({ message: err.message });
    }
  });

  // حذف ارتباط دارایی
  app.delete('/:id/relations/:relationId', { preHandler: [requireEditor] }, async (request, reply) => {
    const { id, relationId } = request.params as { id: string; relationId: string };

    const asset = await prisma.asset.findUnique({
      where: { id },
      select: { assetTypeId: true },
    });

    if (!asset) {
      return reply.status(404).send({ message: 'دارایی مورد نظر یافت نشد.' });
    }

    if (!canAccessCategory(request.user!, asset.assetTypeId)) {
      return reply.status(403).send({ message: 'شما اجازه ویرایش دارایی در این دسته را ندارید.' });
    }

    try {
      const result = await deleteAssetRelation({
        sourceAssetId: id,
        relationId,
        userId: request.user!.id,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return result;
    } catch (err: any) {
      return reply.status(400).send({ message: err.message });
    }
  });
}


