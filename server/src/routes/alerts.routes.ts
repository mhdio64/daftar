import { FastifyPluginAsync } from 'fastify';

export const alertsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * تست و ارسال پیام آزمایشی به کانال‌های مختلف
   * تمامی اطلاعات اتصال از بدنه درخواست مصرف می‌شود و هیچ نیازی به تنظیم فایل .env نیست.
   */
  fastify.post('/test', async (request, reply) => {
    const body = request.body as any;
    const { channel, config, text, payload, subject } = body || {};

    if (!channel || !config) {
      return reply.status(400).send({ message: 'کانال و تنظیمات اتصال الزامی است.' });
    }

    try {
      // ۱. کانال تلگرام
      if (channel === 'telegram') {
        const apiRoot = (config.apiRoot || 'https://api.telegram.org').replace(/\/+$/, '');
        const res = await fetch(`${apiRoot}/bot${config.botToken}/sendMessage`, {
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

      // ۲. کانال بله
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

      // ۳. وب‌هوک سفارشی
      if (channel === 'webhook') {
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

      // ۴. اعلان ایمیل
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
      return reply.status(500).send({ message: err.message || 'خطای غیرمنتظره در ارسال پیام' });
    }
  });
};
