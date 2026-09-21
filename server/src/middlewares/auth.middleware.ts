import { FastifyRequest, FastifyReply } from 'fastify';
import { Role } from '@prisma/client';
import { AuthUser } from '../services/auth.service.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: AuthUser;
  }
}

/**
 * گارد احراز هویت توکن JWT
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  // پشتیبانی از توکن پیش‌نمایش فقط در محیط توسعه در صورت تنظیم صریح فلگ محیطی
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.ENABLE_DEV_DEMO_BYPASS === 'true' &&
    authHeader === 'Bearer demo-token-preview'
  ) {
    request.log.warn('⚠️ دسترسی موقت با توکن دمو در محیط توسعه فعال است.');
    request.user = {
      id: 'demo-admin',
      username: 'admin',
      fullName: 'علی رضایی (مدیر ارشد دمو)',
      role: Role.ADMIN,
      categoryPermissions: [],
    };
    return;
  }

  try {
    const decoded = await request.jwtVerify<AuthUser>();
    request.user = decoded;
  } catch (err) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'دسترسی غیرمجاز: لطفاً ابتدا وارد حساب کاربری خود شوید.',
    });
  }
}

/**
 * گارد محدودیت دسترسی بر اساس نقش ادمین کل
 */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply);
  if (reply.sent) return;

  if (request.user?.role !== Role.ADMIN) {
    return reply.status(403).send({
      statusCode: 403,
      error: 'Forbidden',
      message: 'شما دسترسی لازم (مدیر ارشد) برای انجام این عملیات را ندارید.',
    });
  }
}

/**
 * گارد ویرایشگر یا ادمین
 */
export async function requireEditor(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply);
  if (reply.sent) return;

  if (request.user?.role !== Role.ADMIN && request.user?.role !== Role.EDITOR) {
    return reply.status(403).send({
      statusCode: 403,
      error: 'Forbidden',
      message: 'شما مجوز ویرایش یا افزودن اطلاعات در این بخش را ندارید.',
    });
  }
}

/**
 * بررسی دسترسی کاربر به یک دسته دارایی خاص
 */
export function canAccessCategory(user: AuthUser, assetTypeId: string): boolean {
  if (user.role === Role.ADMIN) return true;
  return user.categoryPermissions.includes(assetTypeId);
}
