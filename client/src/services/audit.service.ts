import { api } from './api.ts';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'READ_SECRET'
  | 'COPY_SECRET'
  | 'LOGIN'
  | 'LOGOUT'
  | '2FA_ENABLE'
  | '2FA_DISABLE'
  | 'EXPORT_BACKUP'
  | 'RESTORE_BACKUP'
  | string;

export interface AuditLogItem {
  id: string;
  userId: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    role: string;
  };
  action: AuditAction;
  targetEntity: 'Asset' | 'AssetType' | 'User' | 'Attachment' | 'System' | string;
  targetId: string;
  diff?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface AuditStats {
  totalEvents: number;
  secretViews: number;
  recentSecretViews: number;
  todayChanges: number;
  loginEvents: number;
}

export interface AuditFilterParams {
  page?: number;
  limit?: number;
  action?: string;
  userId?: string;
  targetEntity?: string;
  search?: string;
}

const LOCAL_STORAGE_KEY = 'daftar_audit_logs';

/**
 * ایجاد لاگ‌های نمونه پیش‌فرض جهت نمایش در حالت دمو/آفلاین
 */
function getDefaultDemoLogs(): AuditLogItem[] {
  const now = Date.now();
  return [
    {
      id: 'log-1',
      userId: 'usr-1',
      user: { id: 'usr-1', fullName: 'مهدی رحیمی', username: 'admin', role: 'ADMIN' },
      action: 'READ_SECRET',
      targetEntity: 'Asset',
      targetId: 'vps-1 (سرور اصلی Hetzner - دیتاسنتر نورنبرگ)',
      diff: {
        field: 'root_password',
        accessType: 'VIEW',
        note: 'آشکارسازی چشمی رمز روت سرور با تایمر ۳۰ ثانیه‌ای',
      },
      ipAddress: '192.168.1.140',
      userAgent: navigator.userAgent,
      createdAt: new Date(now - 10 * 60 * 1000).toISOString(), // ۱۰ دقیقه پیش
    },
    {
      id: 'log-2',
      userId: 'usr-1',
      user: { id: 'usr-1', fullName: 'مهدی رحیمی', username: 'admin', role: 'ADMIN' },
      action: 'COPY_SECRET',
      targetEntity: 'Asset',
      targetId: 'db-prod (پایگاه داده PostgreSQL)',
      diff: {
        field: 'password',
        accessType: 'COPY',
        note: 'کپی مستقیم رمز عبور به حافظه موقت (Clipboard)',
      },
      ipAddress: '192.168.1.140',
      userAgent: navigator.userAgent,
      createdAt: new Date(now - 45 * 60 * 1000).toISOString(), // ۴۵ دقیقه پیش
    },
    {
      id: 'log-3',
      userId: 'usr-1',
      user: { id: 'usr-1', fullName: 'مهدی رحیمی', username: 'admin', role: 'ADMIN' },
      action: '2FA_ENABLE',
      targetEntity: 'User',
      targetId: 'admin (مدیر کل سیستم)',
      diff: {
        method: 'TOTP_RFC6238',
        note: 'راه‌اندازی تایید دو مرحله‌ای با Google Authenticator و کدهای پشتیبان',
      },
      ipAddress: '192.168.1.140',
      userAgent: navigator.userAgent,
      createdAt: new Date(now - 3 * 3600 * 1000).toISOString(), // ۳ ساعت پیش
    },
    {
      id: 'log-4',
      userId: 'usr-2',
      user: { id: 'usr-2', fullName: 'سارا احمدی', username: 'operator', role: 'EDITOR' },
      action: 'UPDATE',
      targetEntity: 'Asset',
      targetId: 'vps-lb (لودبالانسر شبکه)',
      diff: {
        ip_address: { old: '10.0.1.5:80', new: '10.0.1.5:443' },
        os_type: { old: 'Ubuntu 20.04', new: 'Ubuntu 24.04 LTS' },
      },
      ipAddress: '192.168.1.112',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      createdAt: new Date(now - 6 * 3600 * 1000).toISOString(),
    },
    {
      id: 'log-5',
      userId: 'usr-1',
      user: { id: 'usr-1', fullName: 'مهدی رحیمی', username: 'admin', role: 'ADMIN' },
      action: 'LOGIN',
      targetEntity: 'User',
      targetId: 'admin',
      diff: { method: 'PASSWORD' },
      ipAddress: '192.168.1.140',
      userAgent: navigator.userAgent,
      createdAt: new Date(now - 8 * 3600 * 1000).toISOString(),
    },
    {
      id: 'log-6',
      userId: 'usr-1',
      user: { id: 'usr-1', fullName: 'مهدی رحیمی', username: 'admin', role: 'ADMIN' },
      action: 'CREATE',
      targetEntity: 'Asset',
      targetId: 'license-jet (لایسنس JetBrains All Products)',
      diff: {
        title: 'لایسنس JetBrains',
        cost_amount: 550,
        cost_currency: 'USD',
      },
      ipAddress: '192.168.1.140',
      userAgent: navigator.userAgent,
      createdAt: new Date(now - 24 * 3600 * 1000).toISOString(),
    },
  ];
}

/**
 * دریافت لیست محلی لاگ‌ها از LocalStorage
 */
function getLocalLogs(): AuditLogItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      const defaults = getDefaultDemoLogs();
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }
    return JSON.parse(raw);
  } catch {
    return getDefaultDemoLogs();
  }
}

/**
 * ذخیره لیست محلی لاگ‌ها در LocalStorage
 */
function saveLocalLogs(logs: AuditLogItem[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(logs.slice(0, 300)));
  } catch (err) {
    console.warn('Failed to save audit logs to localStorage:', err);
  }
}

export const auditService = {
  /**
   * ثبت بلادرنگ یک رخداد ممیزی و امنیتی (همگام با سرور و ذخیره محلی)
   */
  async recordAudit(entry: {
    action: AuditAction;
    targetEntity: 'Asset' | 'AssetType' | 'User' | 'Attachment' | 'System' | string;
    targetId: string;
    diff?: Record<string, any> | null;
  }): Promise<AuditLogItem> {
    let currentUser = {
      id: 'usr-1',
      username: 'admin',
      fullName: 'مدیر سامانه',
      role: 'ADMIN',
    };

    try {
      const rawUser = localStorage.getItem('daftar_user');
      if (rawUser) {
        const u = JSON.parse(rawUser);
        currentUser = {
          id: u.id || 'usr-1',
          username: u.username || 'admin',
          fullName: u.fullName || u.username || 'مدیر سامانه',
          role: u.role || 'ADMIN',
        };
      }
    } catch {
      // استفاده از پیش‌فرض
    }

    const newLogItem: AuditLogItem = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId: currentUser.id,
      user: currentUser,
      action: entry.action,
      targetEntity: entry.targetEntity,
      targetId: entry.targetId,
      diff: entry.diff || null,
      ipAddress: '192.168.1.140',
      userAgent: navigator.userAgent,
      createdAt: new Date().toISOString(),
    };

    // ۱. افزودن به صف محلی در ابتدای لیست
    const local = getLocalLogs();
    const updated = [newLogItem, ...local];
    saveLocalLogs(updated);

    // ارسال رویداد جهت به‌روزرسانی زنده UI در صورت باز بودن تب لاگ‌ها
    window.dispatchEvent(new CustomEvent('daftar:audit_log_added', { detail: newLogItem }));

    // ۲. ارسال پس‌زمینه به API سرور در صورت دسترسی
    try {
      await api.post('/audit-logs', {
        action: entry.action,
        targetEntity: entry.targetEntity,
        targetId: entry.targetId,
        diff: entry.diff,
      });
    } catch {
      // سرور آفلاین است یا دیتابیس در دسترس نیست، داده لوکال حفظ شده است
    }

    return newLogItem;
  },

  /**
   * دریافت لیست لاگ‌های ممیزی با فیلترها و صفحه‌بندی
   */
  async getAll(params: AuditFilterParams = {}): Promise<{
    items: AuditLogItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = params.page || 1;
    const limit = params.limit || 25;

    try {
      const query = new URLSearchParams();
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      if (params.action && params.action !== 'ALL') query.set('action', params.action);
      if (params.userId && params.userId !== 'ALL') query.set('userId', params.userId);
      if (params.targetEntity && params.targetEntity !== 'ALL') query.set('targetEntity', params.targetEntity);
      if (params.search) query.set('search', params.search);

      const serverRes = await api.get<{
        items: AuditLogItem[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>(`/audit-logs?${query.toString()}`);

      if (serverRes && serverRes.items) {
        return serverRes;
      }
    } catch {
      // فال‌بک کامل آفلاین و دمو
    }

    // فیلتر روی لاگ‌های محلی
    let all = getLocalLogs();

    // فیلتر نوع اکشن
    if (params.action && params.action !== 'ALL') {
      if (params.action === 'SECRET_ACCESS') {
        all = all.filter((l) => l.action === 'READ_SECRET' || l.action === 'COPY_SECRET');
      } else if (params.action === 'ASSET_CHANGES') {
        all = all.filter((l) => ['CREATE', 'UPDATE', 'DELETE'].includes(l.action));
      } else if (params.action === 'AUTH_EVENTS') {
        all = all.filter((l) => ['LOGIN', 'LOGOUT', '2FA_ENABLE', '2FA_DISABLE'].includes(l.action));
      } else {
        all = all.filter((l) => l.action === params.action);
      }
    }

    // فیلتر موجودیت
    if (params.targetEntity && params.targetEntity !== 'ALL') {
      all = all.filter((l) => l.targetEntity === params.targetEntity);
    }

    // فیلتر کاربر
    if (params.userId && params.userId !== 'ALL') {
      all = all.filter((l) => l.userId === params.userId || l.user.username === params.userId);
    }

    // جستجوی متنی
    if (params.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      all = all.filter((l) =>
        l.targetId.toLowerCase().includes(q) ||
        l.user.fullName.toLowerCase().includes(q) ||
        l.user.username.toLowerCase().includes(q) ||
        (l.ipAddress && l.ipAddress.includes(q)) ||
        (l.diff && JSON.stringify(l.diff).toLowerCase().includes(q))
      );
    }

    const total = all.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const skip = (page - 1) * limit;
    const items = all.slice(skip, skip + limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  },

  /**
   * دریافت آمار کلی و شاخص‌های امنیتی
   */
  async getStats(): Promise<AuditStats> {
    try {
      const stats = await api.get<AuditStats>('/audit-logs/stats');
      if (stats) return stats;
    } catch {
      // محاسبه زنده از داده‌های محلی
    }

    const all = getLocalLogs();
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const secretViews = all.filter((l) => l.action === 'READ_SECRET' || l.action === 'COPY_SECRET').length;
    const recentSecretViews = all.filter(
      (l) => (l.action === 'READ_SECRET' || l.action === 'COPY_SECRET') && new Date(l.createdAt).getTime() >= oneDayAgo
    ).length;
    const todayChanges = all.filter(
      (l) => ['CREATE', 'UPDATE', 'DELETE'].includes(l.action) && new Date(l.createdAt).getTime() >= startOfToday.getTime()
    ).length;
    const loginEvents = all.filter((l) => l.action === 'LOGIN').length;

    return {
      totalEvents: all.length,
      secretViews,
      recentSecretViews,
      todayChanges,
      loginEvents,
    };
  },

  /**
   * دریافت گزارش اکسل رسمی از لاگ‌های ممیزی
   */
  async exportExcel(params: AuditFilterParams = {}): Promise<void> {
    try {
      const query = new URLSearchParams();
      if (params.action && params.action !== 'ALL') query.set('action', params.action);
      if (params.userId && params.userId !== 'ALL') query.set('userId', params.userId);
      if (params.targetEntity && params.targetEntity !== 'ALL') query.set('targetEntity', params.targetEntity);

      const token = localStorage.getItem('daftar_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/audit-logs/export-excel?${query.toString()}`, {
        headers,
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `گزارش_ممیزی_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
    } catch {
      // فال‌بک تولید فایل خروجی در مرورگر
    }

    // خروجی CSV استاندارد با UTF-8 BOM جهت باز شدن صحیح در اکسل فارسی
    const logsRes = await this.getAll({ ...params, limit: 1000 });
    const items = logsRes.items;

    const actionNames: Record<string, string> = {
      CREATE: 'ثبت جدید',
      UPDATE: 'ویرایش اطلاعات',
      DELETE: 'حذف اطلاعات',
      READ_SECRET: 'مشاهده رمز محرمانه (چشمی)',
      COPY_SECRET: 'کپی مستقیم رمز محرمانه',
      LOGIN: 'ورود به سامانه',
      LOGOUT: 'خروج از سامانه',
      '2FA_ENABLE': 'فعال‌سازی 2FA',
      '2FA_DISABLE': 'غیرفعال‌سازی 2FA',
      EXPORT_BACKUP: 'خروجی بکاپ',
      RESTORE_BACKUP: 'بازیابی بکاپ',
    };

    const headers = ['ردیف', 'تاریخ و ساعت', 'نام کاربر', 'شناسه کاربری', 'نقش', 'عملیات', 'موجودیت', 'شناسه هدف', 'آدرس IP', 'توضیحات و تغییرات'];
    const rows = items.map((l, idx) => [
      idx + 1,
      new Date(l.createdAt).toLocaleString('fa-IR'),
      `"${(l.user.fullName || l.user.username).replace(/"/g, '""')}"`,
      `"${l.user.username}"`,
      l.user.role === 'ADMIN' ? 'مدیر ارشد' : l.user.role === 'EDITOR' ? 'اپراتور' : 'مشاهده‌گر',
      `"${actionNames[l.action] || l.action}"`,
      `"${l.targetEntity}"`,
      `"${(l.targetId || '').replace(/"/g, '""')}"`,
      `"${l.ipAddress || '—'}"`,
      `"${JSON.stringify(l.diff || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `گزارش_ممیزی_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
