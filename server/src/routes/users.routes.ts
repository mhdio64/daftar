import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../services/prisma.service.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import { hashPassword } from '../services/auth.service.js';
import { logAudit } from '../services/audit.service.js';

export async function usersRoutes(app: FastifyInstance) {
  // دریافت لیست تمام کاربران (مخصوص مدیر ارشد)
  app.get('/', { preHandler: [requireAdmin] }, async () => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        categoryPermissions: true,
        isActive: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            createdAssets: true,
            auditLogs: true,
          },
        },
      },
    });

    return {
      items: users.map((u) => ({
        ...u,
        twoFactorEnabled: u.twoFactorEnabled,
        categoryPermissions: Array.isArray(u.categoryPermissions) ? u.categoryPermissions : [],
        assetsCount: u._count.createdAssets,
        activityCount: u._count.auditLogs,
      })),
    };
  });

  // ایجاد کاربر جدید
  app.post('/', { preHandler: [requireAdmin] }, async (request, reply) => {
    const schema = z.object({
      username: z.string().min(3, 'نام کاربری باید حداقل ۳ کاراکتر باشد'),
      fullName: z.string().min(2, 'نام و نام خانوادگی الزامی است'),
      password: z.string().min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد'),
      role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']),
      categoryPermissions: z.array(z.string()).default([]),
      isActive: z.boolean().default(true),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0].message });
    }

    const normalizedUsername = parsed.data.username.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    });
    if (existing) {
      return reply.status(400).send({ message: 'این نام کاربری قبلاً در سیستم ثبت شده است.' });
    }

    const passwordHash = hashPassword(parsed.data.password);

    const created = await prisma.user.create({
      data: {
        username: normalizedUsername,
        fullName: parsed.data.fullName.trim(),
        passwordHash,
        role: parsed.data.role as Role,
        categoryPermissions: parsed.data.categoryPermissions,
        isActive: parsed.data.isActive,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        categoryPermissions: true,
        isActive: true,
        createdAt: true,
      },
    });

    await logAudit({
      userId: request.user!.id,
      action: 'CREATE',
      targetEntity: 'User',
      targetId: created.id,
      diff: { username: { new: created.username }, role: { new: created.role } },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return reply.status(201).send(created);
  });

  // ویرایش مشخصات یا نقش کاربر
  app.put('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      fullName: z.string().min(2).optional(),
      password: z.string().min(6).optional().or(z.literal('')),
      role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']).optional(),
      categoryPermissions: z.array(z.string()).optional(),
      isActive: z.boolean().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0].message });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ message: 'کاربر مورد نظر یافت نشد.' });
    }

    const updateData: any = {};
    if (parsed.data.fullName) updateData.fullName = parsed.data.fullName.trim();
    if (parsed.data.role) updateData.role = parsed.data.role as Role;
    if (parsed.data.categoryPermissions !== undefined) updateData.categoryPermissions = parsed.data.categoryPermissions;
    if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;
    if (parsed.data.password && parsed.data.password.trim().length >= 6) {
      updateData.passwordHash = hashPassword(parsed.data.password.trim());
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        categoryPermissions: true,
        isActive: true,
        updatedAt: true,
      },
    });

    await logAudit({
      userId: request.user!.id,
      action: 'UPDATE',
      targetEntity: 'User',
      targetId: updated.id,
      diff: { role: { old: existing.role, new: updated.role } },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return updated;
  });

  // حذف کاربر
  app.delete('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    if (request.user?.id === id) {
      return reply.status(400).send({ message: 'امکان حذف حساب کاربری خودتان وجود ندارد.' });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ message: 'کاربر یافت نشد.' });
    }

    await prisma.user.delete({ where: { id } });

    await logAudit({
      userId: request.user!.id,
      action: 'DELETE',
      targetEntity: 'User',
      targetId: id,
      diff: { username: { old: existing.username } },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return { message: 'کاربر با موفقیت حذف شد.' };
  });
}
