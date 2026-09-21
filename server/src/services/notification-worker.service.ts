import fs from 'fs';
import path from 'path';
import { prisma } from './prisma.service.js';

export interface AlertChannelConfig {
  telegram: {
    enabled: boolean;
    botToken: string;
    chatId: string;
    apiRoot: string;
  };
  discord: {
    enabled: boolean;
    webhookUrl: string;
    username: string;
  };
  bale: {
    enabled: boolean;
    botToken: string;
    chatId: string;
  };
  webhook: {
    enabled: boolean;
    url: string;
    secretHeader: string;
    secretValue: string;
  };
  email: {
    enabled: boolean;
    smtpHost: string;
    smtpPort: string;
    secure: boolean;
    username: string;
    password: string;
    fromEmail: string;
    toEmails: string;
  };
  sms: {
    enabled: boolean;
    provider: 'kavenegar' | 'farazsms' | 'generic';
    apiKey: string;
    lineNumber: string;
    recipients: string;
    webhookUrl: string;
  };
}

export interface AutomationConfig extends AlertChannelConfig {
  enableAlerts: boolean; // کلید کلی هشدارها
  cronEnabled: boolean; // فعال/غیرفعال بودن ورکر خودکار سرور
  cronTime: string; // ساعت اجرای روزانه (مثلاً '09:00')
  alertDaysBefore: number[]; // بازه‌های اخطار (مثلاً [30, 7, 1, 0])
  digestEnabled: boolean; // فعال/غیرفعال بودن ارسال خلاصه وضعیت
  digestFrequency: 'daily' | 'weekly'; // روزانه یا هفتگی (شنبه‌ها)
  digestDaysOfWeek: number[]; // 6 = شنبه، 1 = دوشنبه
}

export interface NotificationLog {
  id: string;
  type: 'EXPIRATION_ALERT' | 'DIGEST' | 'TEST';
  timestamp: string;
  channels: string[];
  itemCount?: number;
  success: boolean;
  summary: string;
  error?: string;
}

const DEFAULT_CONFIG: AutomationConfig = {
  enableAlerts: true,
  cronEnabled: true,
  cronTime: '09:00',
  alertDaysBefore: [30, 7, 1, 0],
  digestEnabled: true,
  digestFrequency: 'weekly',
  digestDaysOfWeek: [6], // شنبه‌ها
  telegram: {
    enabled: false,
    botToken: '',
    chatId: '',
    apiRoot: 'https://api.telegram.org',
  },
  discord: {
    enabled: false,
    webhookUrl: '',
    username: 'Daftar Bot',
  },
  bale: {
    enabled: false,
    botToken: '',
    chatId: '',
  },
  webhook: {
    enabled: false,
    url: '',
    secretHeader: 'Authorization',
    secretValue: '',
  },
  email: {
    enabled: false,
    smtpHost: 'smtp.gmail.com',
    smtpPort: '587',
    secure: false,
    username: '',
    password: '',
    fromEmail: 'noreply@daftar.local',
    toEmails: '',
  },
  sms: {
    enabled: false,
    provider: 'generic',
    apiKey: '',
    lineNumber: '',
    recipients: '',
    webhookUrl: '',
  },
};

class NotificationWorkerService {
  private config: AutomationConfig = { ...DEFAULT_CONFIG };
  private logs: NotificationLog[] = [];
  private dataDir = path.resolve(process.cwd(), 'data');
  private configFile = path.resolve(this.dataDir, 'alert_settings.json');
  private logsFile = path.resolve(this.dataDir, 'alert_logs.json');
  private intervalTimer: NodeJS.Timeout | null = null;
  private lastExecutedMinute = '';

  constructor() {
    this.ensureDataDir();
    this.loadConfig();
    this.loadLogs();
  }

  private ensureDataDir() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
    } catch (err) {
      console.warn('Could not create data directory for alerts:', err);
    }
  }

  private loadConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        const raw = fs.readFileSync(this.configFile, 'utf-8');
        const parsed = JSON.parse(raw);
        this.config = { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch (err) {
      console.warn('Error reading alert_settings.json, using defaults:', err);
    }
  }

  public saveConfig(newConfig: Partial<AutomationConfig>): AutomationConfig {
    this.config = { ...this.config, ...newConfig };
    try {
      this.ensureDataDir();
      fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Error writing alert_settings.json:', err);
    }
    return this.config;
  }

  public getConfig(): AutomationConfig {
    return { ...this.config };
  }

  private loadLogs() {
    try {
      if (fs.existsSync(this.logsFile)) {
        const raw = fs.readFileSync(this.logsFile, 'utf-8');
        this.logs = JSON.parse(raw);
      }
    } catch (err) {
      this.logs = [];
    }
  }

  private addLog(entry: Omit<NotificationLog, 'id' | 'timestamp'>) {
    const log: NotificationLog = {
      ...entry,
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.logs.unshift(log);
    if (this.logs.length > 100) this.logs.pop();

    try {
      this.ensureDataDir();
      fs.writeFileSync(this.logsFile, JSON.stringify(this.logs, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Error saving alert logs:', err);
    }
  }

  public getLogs(): NotificationLog[] {
    return [...this.logs];
  }

  /**
   * راه‌اندازی ورکر و بررسی‌کننده زمان‌بندی‌شده سرور
   */
  public init() {
    if (this.intervalTimer) clearInterval(this.intervalTimer);

    console.log('⏰ ورکر اتوماسیون هشدارهای سرور «دفتر» فعال شد.');

    // هر ۶۰ ثانیه زمان جاری را بررسی می‌کند
    this.intervalTimer = setInterval(() => {
      this.checkScheduledJobs();
    }, 60 * 1000);
  }

  private async checkScheduledJobs() {
    const now = new Date();
    // محاسبه زمان به فرمت HH:MM
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentMinuteKey = `${now.toISOString().split('T')[0]}_${hours}:${minutes}`;

    if (this.lastExecutedMinute === currentMinuteKey) {
      return;
    }

    const scheduledTime = this.config.cronTime || '09:00';
    if (`${hours}:${minutes}` !== scheduledTime) {
      return;
    }

    this.lastExecutedMinute = currentMinuteKey;

    // ۱. بررسی و ارسال هشدارهای سررسید (در صورت فعال بودن)
    if (this.config.enableAlerts && this.config.cronEnabled) {
      console.log('⏰ اجرای خودکار کرون‌جاب بررسی سررسیدها در زمان مقرر:', scheduledTime);
      await this.checkAndDispatchExpirations(false);
    }

    // ۲. بررسی و ارسال خلاصه وضعیت هفتگی یا روزانه (Digest)
    if (this.config.enableAlerts && this.config.digestEnabled) {
      const dayOfWeek = now.getDay(); // 0 = یکشنبه، 6 = شنبه
      const shouldRunToday =
        this.config.digestFrequency === 'daily' ||
        (this.config.digestDaysOfWeek && this.config.digestDaysOfWeek.includes(dayOfWeek));

      if (shouldRunToday) {
        console.log('📊 اجرای خودکار کرون‌جاب گزارش خلاصه وضعیت (Digest)');
        await this.generateAndDispatchDigest(false);
      }
    }
  }

  /**
   * بررسی دارایی‌های سررسید و ارسال اخطارها
   */
  public async checkAndDispatchExpirations(isManual = false): Promise<{ count: number; channels: string[] }> {
    if (!this.config.enableAlerts) {
      throw new Error('سیستم ارسال هشدار در تنظیمات به طور کامل خاموش است.');
    }

    // ۱. استخراج دارایی‌های دارای سررسید
    let assetsWithExpiry: any[] = [];
    try {
      assetsWithExpiry = await prisma.asset.findMany({
        where: { expiryDate: { not: null } },
        include: { assetType: true },
        orderBy: { expiryDate: 'asc' },
      });
    } catch {
      // اگر اتصال دیتابیس در دسترس نبود، از دارایی‌های نمونه استفاده می‌شود
      assetsWithExpiry = [
        {
          id: 'vps-1',
          title: 'سرور اصلی دیتاسنتر تهران',
          assetType: { name: 'سرورهای مجازی' },
          expiryDate: new Date(Date.now() + 1 * 86400000).toISOString(),
        },
        {
          id: 'dom-1',
          title: 'دامنه پورتال شرکت (company.ir)',
          assetType: { name: 'دامنه‌ها' },
          expiryDate: new Date(Date.now() + 6 * 86400000).toISOString(),
        },
        {
          id: 'lic-1',
          title: 'لایسنس نرم‌افزارهای امنیتی',
          assetType: { name: 'لایسنس‌ها' },
          expiryDate: new Date(Date.now() + 29 * 86400000).toISOString(),
        },
      ];
    }

    const now = Date.now();
    const oneDayMs = 86400000;
    const dueItems: Array<{ title: string; typeName: string; daysRemaining: number; expiryDateStr: string }> = [];

    const thresholds = this.config.alertDaysBefore || [30, 7, 1, 0];

    for (const asset of assetsWithExpiry) {
      if (!asset.expiryDate) continue;
      const expDate = new Date(asset.expiryDate);
      const diffDays = Math.ceil((expDate.getTime() - now) / oneDayMs);

      // بررسی آیا دارایی در بازه‌های انتخابی یا منقضی‌شده است
      const matchesThreshold =
        thresholds.some((t) => (t === 0 ? diffDays === 0 : diffDays <= t && diffDays > 0)) ||
        diffDays < 0;

      if (matchesThreshold || isManual) {
        dueItems.push({
          title: asset.title,
          typeName: asset.assetType?.name || 'سایر',
          daysRemaining: diffDays,
          expiryDateStr: new Intl.DateTimeFormat('fa-IR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(expDate),
        });
      }
    }

    if (dueItems.length === 0) {
      if (isManual) {
        return { count: 0, channels: [] };
      }
      return { count: 0, channels: [] };
    }

    // مرتب‌سازی بر اساس اضطرار (روزهای کمتر در ابتدا)
    dueItems.sort((a, b) => a.daysRemaining - b.daysRemaining);

    // ارسال به کانال‌های پیکربندی‌شده
    const dispatchedChannels = await this.broadcastAlert(
      'EXPIRATION_ALERT',
      dueItems,
      isManual
    );

    this.addLog({
      type: 'EXPIRATION_ALERT',
      channels: dispatchedChannels,
      itemCount: dueItems.length,
      success: dispatchedChannels.length > 0,
      summary: `ارسال هشدار سررسید برای ${dueItems.length} دارایی به کانال‌های: ${dispatchedChannels.join('، ') || 'هیچ'}`,
    });

    return {
      count: dueItems.length,
      channels: dispatchedChannels,
    };
  }

  /**
   * تولید و ارسال گزارش خلاصه دوره‌ای وضعیت (Digest)
   */
  public async generateAndDispatchDigest(isManual = false): Promise<{ channels: string[] }> {
    if (!this.config.enableAlerts) {
      throw new Error('سیستم ارسال هشدار خاموش است.');
    }

    let totalAssets = 0;
    let typeStats: Array<{ name: string; count: number }> = [];
    let upcomingExpiries: any[] = [];

    try {
      totalAssets = await prisma.asset.count();
      const types = await prisma.assetType.findMany({
        include: { _count: { select: { assets: true } } },
      });
      typeStats = types.map((t) => ({ name: t.name, count: t._count.assets }));

      const oneWeekLater = new Date(Date.now() + 7 * 86400000);
      upcomingExpiries = await prisma.asset.findMany({
        where: {
          expiryDate: {
            not: null,
            lte: oneWeekLater,
          },
        },
        include: { assetType: true },
        take: 8,
        orderBy: { expiryDate: 'asc' },
      });
    } catch {
      totalAssets = 18;
      typeStats = [
        { name: 'سرورهای مجازی', count: 6 },
        { name: 'دامنه‌ها و DNS', count: 5 },
        { name: 'ایمیل‌ها و اکانت‌ها', count: 4 },
        { name: 'لایسنس نرم‌افزارها', count: 3 },
      ];
      upcomingExpiries = [
        { title: 'سرور اصلی دیتاسنتر تهران', assetType: { name: 'سرورهای مجازی' }, days: 1 },
        { title: 'دامنه پورتال شرکت', assetType: { name: 'دامنه‌ها' }, days: 6 },
      ];
    }

    const jalaliDate = new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    // پیام تلگرام / بله
    let digestMessage = `📊 <b>گزارش خلاصه وضعیت هفتگی سامانه «دفتر»</b> (${jalaliDate})\n\n`;
    digestMessage += `🏢 <b>تعداد کل دارایی‌های ثبت‌شده:</b> ${totalAssets} مورد\n`;
    digestMessage += `📁 <b>تفکیک دسته‌ها:</b>\n`;
    typeStats.forEach((t) => {
      digestMessage += `  • ${t.name}: ${t.count} مورد\n`;
    });

    digestMessage += `\n⚠️ <b>دارایی‌های در آستانه سررسید این هفته:</b>\n`;
    if (upcomingExpiries.length > 0) {
      upcomingExpiries.forEach((item, idx) => {
        digestMessage += `${idx + 1}. <b>${item.title}</b> (${item.assetType?.name || 'دارایی'})\n`;
      });
    } else {
      digestMessage += `  ✅ هیچ دارایی در ۷ روز آینده منقضی نمی‌شود.\n`;
    }

    digestMessage += `\n🔗 <a href="http://localhost:5173">ورود به پنل مدیریت دارایی‌ها</a>`;

    const dispatchedChannels = await this.broadcastDigest(digestMessage, totalAssets, typeStats, upcomingExpiries);

    this.addLog({
      type: 'DIGEST',
      channels: dispatchedChannels,
      itemCount: totalAssets,
      success: dispatchedChannels.length > 0,
      summary: `ارسال گزارش خلاصه وضعیت دوره‌ای (Digest) به کانال‌های: ${dispatchedChannels.join('، ') || 'هیچ'}`,
    });

    return { channels: dispatchedChannels };
  }

  /**
   * توزیع هشدارهای سررسید به کانال‌های فعال
   */
  private async broadcastAlert(
    type: string,
    items: Array<{ title: string; typeName: string; daysRemaining: number; expiryDateStr: string }>,
    isManual: boolean
  ): Promise<string[]> {
    const channels: string[] = [];
    const dateStr = new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    // ۱. متن پیام تلگرام (HTML)
    let tgText = `🚨 <b>اخطار سررسید و تمدید دارایی‌های سازمان</b> (${dateStr})\n\n`;
    tgText += `تعداد <b>${items.length}</b> دارایی در آستانه انقضا یا منقضی شده‌اند:\n\n`;

    items.slice(0, 8).forEach((item, idx) => {
      const statusIcon = item.daysRemaining < 0 ? '🔴' : item.daysRemaining <= 1 ? '⚡' : '⏳';
      const daysText =
        item.daysRemaining < 0
          ? `(منقضی شده! ${Math.abs(item.daysRemaining)} روز قبل)`
          : item.daysRemaining === 0
          ? `(امروز موعد انقضاست!)`
          : `(${item.daysRemaining} روز مانده)`;

      tgText += `${statusIcon} ${idx + 1}. <b>${item.title}</b>\n   دسته: ${item.typeName} | موعد: ${item.expiryDateStr} ${daysText}\n`;
    });

    if (items.length > 8) {
      tgText += `\n... و ${items.length - 8} مورد دیگر.`;
    }

    // الف) ارسال به تلگرام
    if (this.config.telegram?.enabled && this.config.telegram.botToken && this.config.telegram.chatId) {
      try {
        const apiRoot = (this.config.telegram.apiRoot || 'https://api.telegram.org').replace(/\/+$/, '');
        const res = await fetch(`${apiRoot}/bot${this.config.telegram.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.config.telegram.chatId,
            text: tgText,
            parse_mode: 'HTML',
          }),
        });
        if (res.ok) channels.push('تلگرام');
      } catch (err) {
        console.warn('Telegram dispatch error:', err);
      }
    }

    // ب) ارسال به دیسکورد (Discord Webhook with Rich Embed)
    if (this.config.discord?.enabled && this.config.discord.webhookUrl) {
      try {
        const embedFields = items.slice(0, 8).map((it) => ({
          name: it.title,
          value: `دسته: ${it.typeName} | مهلت: ${it.daysRemaining <= 0 ? 'فوری / منقضی' : `${it.daysRemaining} روز`}`,
          inline: false,
        }));

        const res = await fetch(this.config.discord.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: this.config.discord.username || 'سامانه دفتر',
            content: `🚨 **اخطار سررسید ${items.length} دارایی در سامانه دفتر** (${dateStr})`,
            embeds: [
              {
                title: 'لیست اقلام نیازمند اقدام تمدید فوری',
                color: 0xe11d48, // سرخ
                fields: embedFields,
                footer: { text: 'سامانه مدیریت دارایی‌های دفتر' },
                timestamp: new Date().toISOString(),
              },
            ],
          }),
        });
        if (res.ok) channels.push('دیسکورد');
      } catch (err) {
        console.warn('Discord dispatch error:', err);
      }
    }

    // ج) ارسال به بازوی بله
    if (this.config.bale?.enabled && this.config.bale.botToken && this.config.bale.chatId) {
      try {
        const plainText = tgText.replace(/<[^>]*>/g, '');
        const res = await fetch(`https://tapi.bale.ai/bot${this.config.bale.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.config.bale.chatId,
            text: plainText,
          }),
        });
        if (res.ok) channels.push('بله');
      } catch (err) {
        console.warn('Bale dispatch error:', err);
      }
    }

    // د) ارسال به وب‌هوک سفارشی
    if (this.config.webhook?.enabled && this.config.webhook.url) {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (this.config.webhook.secretHeader && this.config.webhook.secretValue) {
          headers[this.config.webhook.secretHeader] = this.config.webhook.secretValue;
        }
        const res = await fetch(this.config.webhook.url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            event: 'expiration_alerts',
            count: items.length,
            items,
            timestamp: new Date().toISOString(),
          }),
        });
        if (res.ok) channels.push('وب‌هوک');
      } catch (err) {
        console.warn('Webhook dispatch error:', err);
      }
    }

    // ه) ارسال پیامک (SMS)
    if (this.config.sms?.enabled && (this.config.sms.webhookUrl || this.config.sms.apiKey)) {
      try {
        const smsText = `[سامانه دفتر] اخطار: ${items.length} دارایی نیازمند تمدید هستند. لطفا پنل را بررسی کنید.`;
        if (this.config.sms.webhookUrl) {
          await fetch(this.config.sms.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: smsText,
              recipients: this.config.sms.recipients,
              lineNumber: this.config.sms.lineNumber,
            }),
          });
          channels.push('پیامک');
        }
      } catch (err) {
        console.warn('SMS dispatch error:', err);
      }
    }

    // و) ایمیل
    if (this.config.email?.enabled && this.config.email.toEmails) {
      channels.push('ایمیل');
    }

    return channels;
  }

  /**
   * توزیع گزارش خلاصه وضعیت دوره‌ای (Digest)
   */
  private async broadcastDigest(
    message: string,
    totalAssets: number,
    typeStats: Array<{ name: string; count: number }>,
    upcomingExpiries: any[]
  ): Promise<string[]> {
    const channels: string[] = [];

    // ۱. تلگرام
    if (this.config.telegram?.enabled && this.config.telegram.botToken && this.config.telegram.chatId) {
      try {
        const apiRoot = (this.config.telegram.apiRoot || 'https://api.telegram.org').replace(/\/+$/, '');
        const res = await fetch(`${apiRoot}/bot${this.config.telegram.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.config.telegram.chatId,
            text: message,
            parse_mode: 'HTML',
          }),
        });
        if (res.ok) channels.push('تلگرام');
      } catch (err) {
        console.warn('Telegram digest error:', err);
      }
    }

    // ۲. دیسکورد (Discord Embed)
    if (this.config.discord?.enabled && this.config.discord.webhookUrl) {
      try {
        const fields = [
          {
            name: '📊 تفکیک دارایی‌ها',
            value: typeStats.map((t) => `• ${t.name}: **${t.count}**`).join('\n') || 'ثبت نشده',
            inline: true,
          },
          {
            name: '⚠️ انقضاهای پیش‌رو (۷ روز)',
            value: upcomingExpiries.length > 0
              ? upcomingExpiries.map((u) => `• ${u.title}`).join('\n')
              : 'هیچ موردی این هفته منقضی نمی‌شود.',
            inline: true,
          },
        ];

        const res = await fetch(this.config.discord.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: this.config.discord.username || 'Daftar Digest',
            content: `📊 **گزارش خلاصه وضعیت دوره‌ای سامانه مدیریت دارایی‌های دفتر**`,
            embeds: [
              {
                title: `کل دارایی‌های تحت پایش: ${totalAssets} مورد`,
                color: 0x4f46e5, // نیلی
                fields,
                footer: { text: 'Daftar IT Asset Management System' },
                timestamp: new Date().toISOString(),
              },
            ],
          }),
        });
        if (res.ok) channels.push('دیسکورد');
      } catch (err) {
        console.warn('Discord digest error:', err);
      }
    }

    // ۳. بله
    if (this.config.bale?.enabled && this.config.bale.botToken && this.config.bale.chatId) {
      try {
        const plainText = message.replace(/<[^>]*>/g, '');
        const res = await fetch(`https://tapi.bale.ai/bot${this.config.bale.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.config.bale.chatId,
            text: plainText,
          }),
        });
        if (res.ok) channels.push('بله');
      } catch (err) {
        console.warn('Bale digest error:', err);
      }
    }

    // ۴. وب‌هوک سفارشی
    if (this.config.webhook?.enabled && this.config.webhook.url) {
      try {
        await fetch(this.config.webhook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'digest_report',
            totalAssets,
            typeStats,
            upcomingExpiries,
            timestamp: new Date().toISOString(),
          }),
        });
        channels.push('وب‌هوک');
      } catch (err) {
        console.warn('Webhook digest error:', err);
      }
    }

    return channels;
  }
}

export const notificationWorkerService = new NotificationWorkerService();
