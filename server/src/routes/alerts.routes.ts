import { FastifyPluginAsync } from 'fastify';
import { notificationWorkerService } from '../services/notification-worker.service.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';

/**
 * اعتبارسنجی امن آدرس URL جهت جلوگیری قطعی از حملات Server-Side Request Forgery (SSRF)
 */
export function validateSafeExternalUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('آدرس URL ارسالی نامعتبر است.');
  }

  // پروتکل فقط http یا https مجاز است
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('پروتکل نامعتبر است. تنها http و https مجاز هستند.');
  }

  const hostname = parsed.hostname.toLowerCase();

  // جلوگیری از نام‌های میزبان محلی و دامنه‌های شبکه داخلی
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.lan') ||
    hostname.endsWith('.corp') ||
    hostname.endsWith('.home')
  ) {
    throw new Error('خطای امنیتی SSRF: ارسال درخواست به دامنه‌ها یا سرورهای شبکه محلی مسدود است.');
  }

  // بررسی آدرس‌های IP خصوصی (RFC 1918 و Cloud Metadata)
  const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4Match) {
    const octets = [
      parseInt(ipv4Match[1], 10),
      parseInt(ipv4Match[2], 10),
      parseInt(ipv4Match[3], 10),
      parseInt(ipv4Match[4], 10),
    ];

    const [o1, o2] = octets;

    // 127.0.0.0/8 (Loopback)
    // 10.0.0.0/8 (Private)
    // 172.16.0.0/12 (Private)
    // 192.168.0.0/16 (Private)
    // 169.254.0.0/16 (Link-local & AWS/Cloud Metadata IP)
    // 0.0.0.0/8
    if (
      o1 === 127 ||
      o1 === 10 ||
      o1 === 0 ||
      (o1 === 172 && o2 >= 16 && o2 <= 31) ||
      (o1 === 192 && o2 === 168) ||
      (o1 === 169 && o2 === 254)
    ) {
      throw new Error('خطای امنیتی SSRF: ارسال درخواست به رنج IPهای خصوصی یا متادیتای سرورهای ابری مسدود است.');
    }
  }

  return parsed;
}

export const alertsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * دریافت تنظیمات اتوماسیون هشدارها و وضعیت سرور (مخصوص مدیر ارشد)
   */
  fastify.get('/config', { preHandler: [requireAdmin] }, async (_request, reply) => {
    try {
      const config = notificationWorkerService.getConfig();
      return reply.send({
        config,
        status: {
          serverTime: new Date().toISOString(),
          cronActive: config.enableAlerts && config.cronEnabled,
          digestActive: config.enableAlerts && config.digestEnabled,
        },
      });
    } catch (err: any) {
      return reply.status(500).send({ message: err.message || 'خطا در دریافت تنظیمات' });
    }
  });

  /**
   * ذخیره تنظیمات اتوماسیون هشدارها و کلیدهای فعال/غیرفعال‌سازی (مخصوص مدیر ارشد)
   */
  fastify.put('/config', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const body = request.body as any;

      // اعتبارسنجی امنیتی URLها در کانفیگ‌های ذخیره‌شده جهت جلوگیری از Stored SSRF
      if (body?.discord?.webhookUrl) {
        validateSafeExternalUrl(body.discord.webhookUrl);
      }
      if (body?.webhook?.url) {
        validateSafeExternalUrl(body.webhook.url);
      }
      if (body?.sms?.webhookUrl) {
        validateSafeExternalUrl(body.sms.webhookUrl);
      }
      if (body?.telegram?.apiRoot) {
        validateSafeExternalUrl(body.telegram.apiRoot);
      }

      const updated = notificationWorkerService.saveConfig(body);
      return reply.send({
        success: true,
        message: 'تنظیمات اتوماسیون هشدارها با موفقیت ذخیره شد.',
        config: updated,
      });
    } catch (err: any) {
      return reply.status(400).send({ message: err.message || 'خطا در ذخیره تنظیمات' });
    }
  });

  /**
   * اجرای دستی و فوری بررسی انقضاها و ارسال به کانال‌های فعال (مخصوص مدیر ارشد)
   */
  fastify.post('/trigger', { preHandler: [requireAdmin] }, async (_request, reply) => {
    try {
      const result = await notificationWorkerService.checkAndDispatchExpirations(true);
      return reply.send({
        success: true,
        message: `بررسی دستی انجام شد. هشدارهای مربوط به ${result.count} دارایی به کانال‌های فعال ارسال گردید.`,
        dispatchedCount: result.count,
        channels: result.channels,
      });
    } catch (err: any) {
      return reply.status(400).send({ message: err.message || 'خطا در توزیع هشدارها' });
    }
  });

  /**
   * اجرای دستی و فوری ارسال گزارش خلاصه وضعیت دوره‌ای (Digest) (مخصوص مدیر ارشد)
   */
  fastify.post('/digest/trigger', { preHandler: [requireAdmin] }, async (_request, reply) => {
    try {
      const result = await notificationWorkerService.generateAndDispatchDigest(true);
      return reply.send({
        success: true,
        message: 'گزارش خلاصه وضعیت دوره‌ای (Digest) با موفقیت تولید و ارسال شد.',
        channels: result.channels,
      });
    } catch (err: any) {
      return reply.status(400).send({ message: err.message || 'خطا در ارسال خلاصه وضعیت' });
    }
  });

  /**
   * دریافت تاریخچه لاگ‌های تحویل پیام (مخصوص مدیر ارشد)
   */
  fastify.get('/logs', { preHandler: [requireAdmin] }, async (_request, reply) => {
    try {
      const logs = notificationWorkerService.getLogs();
      return reply.send({ logs });
    } catch (err: any) {
      return reply.status(500).send({ message: err.message || 'خطا در دریافت لاگ‌ها' });
    }
  });

  /**
   * تست و ارسال پیام آزمایشی به کانال‌های مختلف با احراز هویت و مهار SSRF (مخصوص مدیر ارشد)
   */
  fastify.post('/test', { preHandler: [requireAdmin] }, async (request, reply) => {
    const body = request.body as any;
    const { channel, config, text, payload } = body || {};

    if (!channel || !config) {
      return reply.status(400).send({ message: 'کانال و تنظیمات اتصال الزامی است.' });
    }

    try {
      // ۱. کانال تلگرام
      if (channel === 'telegram') {
        const rawApiRoot = (config.apiRoot || 'https://api.telegram.org').replace(/\/+$/, '');
        validateSafeExternalUrl(rawApiRoot);

        const res = await fetch(`${rawApiRoot}/bot${config.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: config.chatId,
            text: text || '🔔 تست اتصال تلگرام از سامانه دفتر',
            parse_mode: 'HTML',
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          return reply.status(res.status).send({ message: (data as any)?.description || 'خطا در ارسال به تلگرام' });
        }
        return reply.send({ success: true, data });
      }

      // ۲. کانال دیسکورد (Discord Webhook with Rich Embed)
      if (channel === 'discord') {
        if (!config.webhookUrl) {
          return reply.status(400).send({ message: 'آدرس وب‌هوک دیسکورد الزامی است.' });
        }
        const parsedUrl = validateSafeExternalUrl(config.webhookUrl);
        // اطمینان از اینکه دامنه واقعاً دیسکورد است
        if (!parsedUrl.hostname.endsWith('discord.com') && !parsedUrl.hostname.endsWith('discordapp.com')) {
          return reply.status(400).send({ message: 'آدرس وب‌هوک دیسکورد باید بر روی دامنه رسمی discord.com باشد.' });
        }

        const res = await fetch(config.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: config.username || 'سامانه دفتر',
            content: text || '🔔 **پیام آزمایشی اتصال دیسکورد از سامانه «دفتر»**',
            embeds: [
              {
                title: 'تست موفقیت‌آمیز اتصال دیسکورد',
                description: 'اتصال وب‌هوک به سرور دیسکورد با موفقیت برقرار شد.',
                color: 0x5865f2,
                fields: [
                  { name: 'وضعیت سامانه', value: 'فعال و آنلاین', inline: true },
                  { name: 'زمان سرور', value: new Date().toLocaleTimeString('fa-IR'), inline: true },
                ],
                timestamp: new Date().toISOString(),
              },
            ],
          }),
        });
        if (!res.ok) {
          return reply.status(res.status).send({ message: `خطا در تحویل وب‌هوک دیسکورد: کد ${res.status}` });
        }
        return reply.send({ success: true, message: 'پیام آزمایشی با موفقیت به دیسکورد ارسال شد.' });
      }

      // ۳. کانال بله
      if (channel === 'bale') {
        const res = await fetch(`https://tapi.bale.ai/bot${config.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: config.chatId,
            text: text || '🔔 تست اتصال پیام‌رسان بله از سامانه دفتر',
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          return reply.status(res.status).send({ message: (data as any)?.description || 'خطا در ارسال به بازوی بله' });
        }
        return reply.send({ success: true, data });
      }

      // ۴. وب‌هوک سفارشی با مهار SSRF
      if (channel === 'webhook') {
        if (!config.url) {
          return reply.status(400).send({ message: 'آدرس وب‌هوک مقصد الزامی است.' });
        }
        validateSafeExternalUrl(config.url);

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (config.secretHeader && config.secretValue) {
          headers[config.secretHeader] = config.secretValue;
        }
        const res = await fetch(config.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload || { event: 'test', message: text || 'تست وب‌هوک از دفتر' }),
        });
        if (!res.ok) {
          return reply.status(res.status).send({ message: `خطا از وب‌هوک مقصد: کد ${res.status}` });
        }
        return reply.send({ success: true });
      }

      // ۵. پیامک سازمانی (SMS)
      if (channel === 'sms') {
        if (!config.webhookUrl && !config.apiKey) {
          return reply.status(400).send({ message: 'آدرس وب‌هوک یا کلید API پنل پیامک الزامی است.' });
        }
        if (config.webhookUrl) {
          validateSafeExternalUrl(config.webhookUrl);

          const res = await fetch(config.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: text || 'تست ارسال پیامک از سامانه دفتر',
              recipients: config.recipients,
              lineNumber: config.lineNumber,
            }),
          });
          if (!res.ok) {
            return reply.status(res.status).send({ message: `خطا در وب‌هوک پیامک: کد ${res.status}` });
          }
        }
        return reply.send({
          success: true,
          message: `تنظیمات پیامک برای گیرندگان (${config.recipients || 'ثبت نشده'}) اعتبارسنجی شد.`,
        });
      }

      // ۶. اعلان ایمیل
      if (channel === 'email') {
        if (!config.smtpHost || !config.fromEmail || !config.toEmails) {
          return reply.status(400).send({ message: 'تنظیمات سرور SMTP و ایمیل‌ها ناقص است.' });
        }
        return reply.send({
          success: true,
          message: `تنظیمات سرور SMTP (${config.smtpHost}:${config.smtpPort}) دریافت و اعتبارسنجی شد.`,
        });
      }

      return reply.status(400).send({ message: 'کانال مشخص‌شده نامعتبر است.' });
    } catch (err: any) {
      return reply.status(400).send({ message: err.message || 'خطا در ارسال پیام' });
    }
  });
};
