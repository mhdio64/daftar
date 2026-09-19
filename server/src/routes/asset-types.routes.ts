import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../services/prisma.service.js';
import { requireAuth, requireAdmin, canAccessCategory } from '../middlewares/auth.middleware.js';
import { logAudit } from '../services/audit.service.js';

export async function assetTypesRoutes(app: FastifyInstance) {
  // دریافت لیست تمام انواع دارایی‌ها به همراه تعداد رکوردهای هر کدام
  app.get('/', { preHandler: [requireAuth] }, async () => {
    const types = await prisma.assetType.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: {
          select: { assets: true },
        },
      },
    });

    return {
      items: types.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        icon: t.icon,
        description: t.description,
        schemaDefinition: t.schemaDefinition,
        typeDocsMarkdown: t.typeDocsMarkdown,
        displayOrder: t.displayOrder,
        assetCount: t._count.assets,
      })),
    };
  });

  // دریافت یک نوع دارایی مشخص
  app.get('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await prisma.assetType.findUnique({
      where: { id },
      include: {
        _count: { select: { assets: true } },
      },
    });

    if (!item) {
      return reply.status(404).send({ message: 'نوع دارایی یافت نشد.' });
    }

    return item;
  });

  // ایجاد نوع دارایی جدید (مخصوص ادمین)
  app.post('/', { preHandler: [requireAdmin] }, async (request, reply) => {
    const schema = z.object({
      name: z.string().min(2, 'نام دسته الزامی است'),
      slug: z.string().min(2, 'نامک انگلیسی الزامی است'),
      icon: z.string().default('Server'),
      description: z.string().optional(),
      schemaDefinition: z.array(z.any()).default([]),
      typeDocsMarkdown: z.string().optional(),
      displayOrder: z.number().default(0),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0].message });
    }

    try {
      const created = await prisma.assetType.create({
        data: {
          name: parsed.data.name,
          slug: parsed.data.slug.trim().toLowerCase(),
          icon: parsed.data.icon,
          description: parsed.data.description,
          schemaDefinition: parsed.data.schemaDefinition,
          typeDocsMarkdown: parsed.data.typeDocsMarkdown,
          displayOrder: parsed.data.displayOrder,
        },
      });

      await logAudit({
        userId: request.user!.id,
        action: 'CREATE',
        targetEntity: 'AssetType',
        targetId: created.id,
        diff: { name: { new: created.name } },
      });

      return reply.status(201).send(created);
    } catch (err: any) {
      return reply.status(400).send({ message: err.message });
    }
  });

  // ویرایش نوع دارایی یا فیلدهای داینامیک آن (مخصوص ادمین)
  app.put('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;

    try {
      const updated = await prisma.assetType.update({
        where: { id },
        data: {
          name: body.name,
          icon: body.icon,
          description: body.description,
          schemaDefinition: body.schemaDefinition,
          typeDocsMarkdown: body.typeDocsMarkdown,
          displayOrder: body.displayOrder,
        },
      });

      await logAudit({
        userId: request.user!.id,
        action: 'UPDATE',
        targetEntity: 'AssetType',
        targetId: updated.id,
      });

      return updated;
    } catch (err: any) {
      return reply.status(400).send({ message: err.message });
    }
  });

  // به‌روزرسانی مستندات و ویکی جامع دسته (مخصوص مدیر یا اپراتور مجاز دسته)
  app.put('/:id/wiki', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;

    if (user.role === Role.VIEWER) {
      return reply.status(403).send({ message: 'کاربران با نقش مشاهده‌گر مجاز به ویرایش مستندات نیستند.' });
    }

    if (user.role === Role.EDITOR && !canAccessCategory(user, id)) {
      return reply.status(403).send({ message: 'شما دسترسی مجاز به این دسته‌بندی را ندارید.' });
    }

    const schema = z.object({
      typeDocsMarkdown: z.string().nullable().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0].message });
    }

    try {
      const updated = await prisma.assetType.update({
        where: { id },
        data: {
          typeDocsMarkdown: parsed.data.typeDocsMarkdown ?? null,
        },
      });

      await logAudit({
        userId: user.id,
        action: 'UPDATE',
        targetEntity: 'AssetType',
        targetId: id,
        diff: { wikiUpdated: true },
      });

      return updated;
    } catch (err: any) {
      return reply.status(400).send({ message: err.message });
    }
  });

  // حذف نوع دارایی (مخصوص ادمین)
  app.delete('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      await prisma.assetType.delete({
        where: { id },
      });

      await logAudit({
        userId: request.user!.id,
        action: 'DELETE',
        targetEntity: 'AssetType',
        targetId: id,
      });

      return { message: 'نوع دارایی با موفقیت حذف شد.' };
    } catch (err: any) {
      return reply.status(400).send({ message: err.message });
    }
  });
}
