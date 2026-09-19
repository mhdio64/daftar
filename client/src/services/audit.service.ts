import { api } from './api.ts';

export interface AuditLogItem {
  id: string;
  userId: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    role: string;
  };
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ_SECRET' | 'LOGIN' | 'LOGOUT' | string;
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

export const auditService = {
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
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.action && params.action !== 'ALL') query.set('action', params.action);
    if (params.userId && params.userId !== 'ALL') query.set('userId', params.userId);
    if (params.targetEntity && params.targetEntity !== 'ALL') query.set('targetEntity', params.targetEntity);
    if (params.search) query.set('search', params.search);

    return api.get(`/audit-logs?${query.toString()}`);
  },

  /**
   * دریافت آمار کلی و شاخص‌های امنیتی
   */
  async getStats(): Promise<AuditStats> {
    return api.get<AuditStats>('/audit-logs/stats');
  },

  /**
   * دریافت گزارش اکسل رسمی از لاگ‌های ممیزی
   */
  async exportExcel(params: AuditFilterParams = {}): Promise<void> {
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

    if (!res.ok) {
      throw new Error('خطا در صدور گزارش اکسل ممیزی');
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `گزارش_ممیزی_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
