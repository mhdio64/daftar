import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Eye,
  Copy,
  LogIn,
  LogOut,
  PlusCircle,
  Edit3,
  Trash2,
  Search,
  Download,
  Calendar,
  Clock,
  User,
  Monitor,
  Check,
  X,
  FileSpreadsheet,
  AlertTriangle,
  Layers,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Database
} from 'lucide-react';
import { auditService, AuditLogItem, AuditStats } from '../../services/audit.service.ts';
import { useToast } from '../../context/ToastContext.tsx';

export function AuditLogsView() {
  const { showToast } = useToast();

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // فیلترها و جستجو
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // مودال نمایش Diff و جزئیات
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  // بارگذاری داده‌های ممیزی
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [logsRes, statsRes] = await Promise.all([
        auditService.getAll({
          page,
          limit: 25,
          action: actionFilter,
          targetEntity: entityFilter,
          search: searchQuery,
        }),
        auditService.getStats(),
      ]);

      setLogs(logsRes.items || []);
      setTotalPages(logsRes.pagination?.totalPages || 1);
      setTotalCount(logsRes.pagination?.total || 0);
      setStats(statsRes);
    } catch (err: any) {
      console.warn('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [actionFilter, entityFilter, page]);

  // گوش دادن به رخدادهای جدید ثبت‌شده در هر بخش دیگر اپلیکیشن
  useEffect(() => {
    const handleLogAdded = () => {
      loadData();
    };
    window.addEventListener('daftar:audit_log_added', handleLogAdded);
    return () => window.removeEventListener('daftar:audit_log_added', handleLogAdded);
  }, [actionFilter, entityFilter, page]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await auditService.exportExcel({
        action: actionFilter,
        targetEntity: entityFilter,
      });
      showToast('گزارش اکسل ممیزی با موفقیت دریافت شد.', 'success');
    } catch (err: any) {
      showToast(err.message || 'خطا در صدور گزارش اکسل', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // استایل‌ها و برچسب‌های رنگی هر نوع عملیات
  const getActionBadge = (action: string) => {
    switch (action) {
      case 'READ_SECRET':
        return {
          icon: <Eye className="w-3.5 h-3.5" />,
          label: 'مشاهده رمز محرمانه (چشمی)',
          className: 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 border-amber-300 dark:border-amber-500/40',
        };
      case 'COPY_SECRET':
        return {
          icon: <Copy className="w-3.5 h-3.5" />,
          label: 'کپی مستقیم رمز محرمانه',
          className: 'bg-purple-100 text-purple-900 dark:bg-purple-500/20 dark:text-purple-300 border-purple-300 dark:border-purple-500/40',
        };
      case 'CREATE':
        return {
          icon: <PlusCircle className="w-3.5 h-3.5" />,
          label: 'ثبت جدید',
          className: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40',
        };
      case 'UPDATE':
        return {
          icon: <Edit3 className="w-3.5 h-3.5" />,
          label: 'ویرایش اطلاعات',
          className: 'bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-300 border-sky-300 dark:border-sky-500/40',
        };
      case 'DELETE':
        return {
          icon: <Trash2 className="w-3.5 h-3.5" />,
          label: 'حذف اطلاعات',
          className: 'bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-300 border-rose-300 dark:border-rose-500/40',
        };
      case 'LOGIN':
        return {
          icon: <LogIn className="w-3.5 h-3.5" />,
          label: 'ورود کاربر',
          className: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-500/20 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/40',
        };
      case 'LOGOUT':
        return {
          icon: <LogOut className="w-3.5 h-3.5" />,
          label: 'خروج کاربر',
          className: 'bg-slate-100 text-slate-800 dark:bg-surface-2 dark:text-slate-300 border-slate-300 dark:border-border-strong',
        };
      case '2FA_ENABLE':
        return {
          icon: <ShieldCheck className="w-3.5 h-3.5" />,
          label: 'فعال‌سازی 2FA',
          className: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40',
        };
      case '2FA_DISABLE':
        return {
          icon: <ShieldAlert className="w-3.5 h-3.5" />,
          label: 'غیرفعال‌سازی 2FA',
          className: 'bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-300 border-rose-300 dark:border-rose-500/40',
        };
      case 'EXPORT_BACKUP':
        return {
          icon: <Download className="w-3.5 h-3.5" />,
          label: 'خروجی فایل پشتیبان',
          className: 'bg-teal-100 text-teal-900 dark:bg-teal-500/20 dark:text-teal-300 border-teal-300 dark:border-teal-500/40',
        };
      case 'RESTORE_BACKUP':
        return {
          icon: <Database className="w-3.5 h-3.5" />,
          label: 'بازیابی فایل پشتیبان',
          className: 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 border-amber-300 dark:border-amber-500/40',
        };
      default:
        return {
          icon: <Layers className="w-3.5 h-3.5" />,
          label: action,
          className: 'bg-slate-100 text-slate-800 dark:bg-surface-2 dark:text-slate-300 border-slate-200',
        };
    }
  };

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(
      (log) =>
        log.targetId.toLowerCase().includes(q) ||
        (log.ipAddress && log.ipAddress.includes(q)) ||
        log.user.fullName.toLowerCase().includes(q) ||
        log.user.username.toLowerCase().includes(q) ||
        (log.diff && JSON.stringify(log.diff).toLowerCase().includes(q))
    );
  }, [logs, searchQuery]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-canvas dark:bg-canvas text-right">
      {/* هدر صفحه لاگ‌های ممیزی */}
      <div className="p-6 pb-4 border-b border-slate-200 dark:border-border-subtle bg-white dark:bg-surface-1 shrink-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-500/30 flex items-center justify-center shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>لاگ‌های ممیزی و رویدادهای امنیتی</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 font-semibold border border-indigo-200/60 dark:border-indigo-500/30">
                  Audit Trail
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ردیابی بلادرنگ مشاهده و کپی رمزهای عبور، تغییرات دارایی‌ها، نشست‌های ورود و رویدادهای سیستمی
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="p-2 rounded-xl border border-slate-200 dark:border-border-strong bg-white dark:bg-surface-2 hover:bg-slate-50 dark:hover:bg-surface-elevated text-slate-700 dark:text-slate-200 transition shadow-2xs"
              title="بارگذاری مجدد داده‌ها"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || logs.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-border-strong bg-white dark:bg-surface-2 hover:bg-slate-50 dark:hover:bg-surface-elevated text-xs font-semibold text-slate-700 dark:text-slate-200 transition shadow-2xs disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{isExporting ? 'در حال صدور...' : 'خروجی فایل ممیزی'}</span>
            </button>
          </div>
        </div>

        {/* ۴ کارت شاخص کلیدی امنیتی (Security KPI Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5">
          {/* کارت ۱: کل رویدادها */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-border-strong bg-slate-50/70 dark:bg-surface-2/40 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">کل رویدادهای ثبت‌شده</div>
              <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                {stats ? stats.totalEvents : totalCount} <span className="text-xs font-normal text-slate-500">مورد</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-500/30">
              <Layers className="w-4 h-4" />
            </div>
          </div>

          {/* کارت ۲: افشا یا کپی اطلاعات محرمانه (ردیابی رمزها) */}
          <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>دسترسی به رمزهای محرمانه</span>
              </div>
              <div className="text-lg font-black text-amber-900 dark:text-amber-200 mt-1">
                {stats ? stats.secretViews : 0} <span className="text-xs font-normal text-amber-700 dark:text-amber-400">بار ({stats?.recentSecretViews || 0} بار در ۲۴ ساعت گذشته)</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center border border-amber-300 dark:border-amber-500/40">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>

          {/* کارت ۳: تغییرات امروز */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-border-strong bg-slate-50/70 dark:bg-surface-2/40 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">تغییرات ثبت‌شده امروز</div>
              <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                {stats ? stats.todayChanges : 0} <span className="text-xs font-normal text-slate-500">عملیات (ایجاد/ویرایش/حذف)</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-200/60 dark:border-sky-500/30">
              <Edit3 className="w-4 h-4" />
            </div>
          </div>

          {/* کارت ۴: ورودهای موفق */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-border-strong bg-slate-50/70 dark:bg-surface-2/40 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">نشست‌های ورود کاربر</div>
              <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                {stats ? stats.loginEvents : 0} <span className="text-xs font-normal text-slate-500">ورود موفق</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-500/30">
              <LogIn className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* تب‌های دسترسی سریع فیلتر */}
      <div className="px-6 py-2.5 bg-slate-50/80 dark:bg-surface-1/40 border-b border-slate-200 dark:border-border-subtle flex items-center justify-between gap-3 overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => { setActionFilter('ALL'); setPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              actionFilter === 'ALL'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-surface-2'
            }`}
          >
            <span>همه رویدادها</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${actionFilter === 'ALL' ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-surface-3'}`}>
              {stats?.totalEvents || totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActionFilter('SECRET_ACCESS'); setPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              actionFilter === 'SECRET_ACCESS'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-amber-800 dark:text-amber-300 hover:bg-amber-100/60 dark:hover:bg-amber-950/40'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>دسترسی به رمزها (Secret Access)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${actionFilter === 'SECRET_ACCESS' ? 'bg-amber-600 text-white' : 'bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200'}`}>
              {stats?.secretViews || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActionFilter('ASSET_CHANGES'); setPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              actionFilter === 'ASSET_CHANGES'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-surface-2'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>تغییرات دارایی‌ها</span>
          </button>

          <button
            type="button"
            onClick={() => { setActionFilter('AUTH_EVENTS'); setPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              actionFilter === 'AUTH_EVENTS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-surface-2'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>ورود و امنیت 2FA</span>
          </button>
        </div>

        {/* فیلتر موجودیت */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-slate-500 font-medium">موجودیت:</span>
          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(1);
            }}
            className="bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-hidden focus:border-indigo-600 shadow-2xs"
          >
            <option value="ALL">کلیه موجودیت‌ها</option>
            <option value="Asset">🖥️ دارایی‌ها (Asset)</option>
            <option value="AssetType">📁 دسته‌بندی‌ها (AssetType)</option>
            <option value="User">👤 کاربران (User)</option>
            <option value="System">⚙️ تنظیمات و سیستم (System)</option>
            <option value="Attachment">📎 فایل‌های پیوست (Attachment)</option>
          </select>
        </div>
      </div>

      {/* نوار جستجوی زنده */}
      <div className="px-6 py-2.5 border-b border-slate-200 dark:border-border-subtle bg-white dark:bg-surface-1 flex items-center justify-between gap-3 shrink-0">
        <div className="relative w-full max-w-md">
          <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="جستجو در نام کاربر، آدرس IP، عنوان دارایی، کلید رمز..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-surface-2 border border-slate-200 dark:border-border-strong rounded-xl pr-9 pl-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-600 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          نمایش {filteredLogs.length} از {totalCount} رویداد
        </div>
      </div>

      {/* جدول داده‌های لاگ‌های ممیزی */}
      <div className="flex-1 px-6 py-4 overflow-auto">
        <div className="border border-slate-200 dark:border-border-strong rounded-2xl bg-white dark:bg-surface-1 overflow-hidden shadow-2xs">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-border-strong bg-slate-50/90 dark:bg-surface-2/60 text-slate-700 dark:text-slate-300 font-bold">
                <th className="p-3 w-12 text-center">#</th>
                <th className="p-3 w-40">زمان و تاریخ</th>
                <th className="p-3 w-44">کاربر مجری</th>
                <th className="p-3 w-48">نوع عملیات</th>
                <th className="p-3">موجودیت و شناسه هدف</th>
                <th className="p-3 w-32" dir="ltr">آدرس IP</th>
                <th className="p-3 w-28 text-center">جزئیات / Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-border-subtle">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                      <span>در حال بارگذاری لاگ‌های ممیزی...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log, index) => {
                  const badge = getActionBadge(log.action);
                  const isSecretAction = log.action === 'READ_SECRET' || log.action === 'COPY_SECRET';
                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-slate-50/90 dark:hover:bg-surface-2/50 transition ${
                        isSecretAction
                          ? 'bg-amber-50/35 dark:bg-amber-950/15 border-r-4 border-r-amber-500'
                          : log.action === 'DELETE'
                          ? 'bg-rose-50/20 dark:bg-rose-950/10 border-r-4 border-r-rose-500'
                          : ''
                      }`}
                    >
                      <td className="p-3 text-center text-slate-400 dark:text-slate-500 font-mono">
                        {(page - 1) * 25 + index + 1}
                      </td>

                      {/* زمان */}
                      <td className="p-3 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono text-[11px]">
                            {new Date(log.createdAt).toLocaleTimeString('fa-IR', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          {new Date(log.createdAt).toLocaleDateString('fa-IR')}
                        </div>
                      </td>

                      {/* کاربر */}
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {log.user.fullName || log.user.username}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          @{log.user.username} •{' '}
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-sans">
                            {log.user.role === 'ADMIN' ? 'مدیر ارشد' : log.user.role === 'EDITOR' ? 'اپراتور' : 'مشاهده‌گر'}
                          </span>
                        </div>
                      </td>

                      {/* نشان عملیات */}
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${badge.className}`}
                        >
                          {badge.icon}
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* موجودیت و شناسه هدف */}
                      <td className="p-3 text-slate-800 dark:text-slate-200">
                        <div className="font-medium text-xs break-all">
                          {log.targetId}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>نوع:</span>
                          <span className="font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-surface-2 text-slate-600 dark:text-slate-300">
                            {log.targetEntity}
                          </span>
                          {log.diff?.field && (
                            <span className="text-amber-700 dark:text-amber-400 font-mono mr-1">
                              [فیلد: {log.diff.field}]
                            </span>
                          )}
                        </div>
                      </td>

                      {/* آدرس IP */}
                      <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap" dir="ltr">
                        {log.ipAddress || '127.0.0.1'}
                      </td>

                      {/* دکمه مشاهده جزییات */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-border-strong hover:bg-slate-100 dark:hover:bg-surface-2 text-indigo-600 dark:text-indigo-400 text-xs font-medium transition shadow-2xs"
                        >
                          مشاهده
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShieldCheck className="w-8 h-8 text-slate-300" />
                      <span className="text-xs font-medium">هیچ رخداد ممیزی با فیلترهای انتخابی یافت نشد.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* کنترل‌های صفحه‌بندی */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 text-xs text-slate-500">
            <div>
              صفحه {page} از {totalPages}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-border-strong disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-surface-2"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-border-strong disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-surface-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* مودال بازرسی جزئیات رخداد ممیزی (Audit Event Inspector) */}
      {selectedLog && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedLog(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-xl bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl shadow-2xl p-6 text-right space-y-4 max-h-[90vh] flex flex-col overflow-hidden">
            {/* هدر مودال */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-border-subtle shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    جزئیات لاگ ممیزی و رویداد امنیتی
                  </h3>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    شناسه رکورد: {selectedLog.id}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-surface-2 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* محتوای مودال */}
            <div className="flex-1 overflow-y-auto space-y-4 text-xs">
              {/* کادر خلاصه فراداده */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-surface-2 border border-slate-200 dark:border-border-subtle">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-0.5">کاربر مجری:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedLog.user.fullName} (@{selectedLog.user.username})
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-0.5">زمان ثبت:</span>
                  <span className="font-mono text-slate-900 dark:text-white">
                    {new Date(selectedLog.createdAt).toLocaleString('fa-IR')}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-0.5">نوع عملیات:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedLog.action}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-0.5">آدرس IP:</span>
                  <span className="font-mono text-slate-900 dark:text-white" dir="ltr">
                    {selectedLog.ipAddress || '127.0.0.1'}
                  </span>
                </div>
              </div>

              {/* کادر هشدار اختصاصی در صورت دسترسی به فیلدهای محرمانه */}
              {(selectedLog.action === 'READ_SECRET' || selectedLog.action === 'COPY_SECRET') && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>گزارش رویداد دسترسی به مقادیر محرمانه (Secret Access Trail)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    کاربر <strong>{selectedLog.user.fullName}</strong> فیلد محرمانه{' '}
                    <code className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 font-mono font-bold">
                      {selectedLog.diff?.field || 'رمز عبور'}
                    </code>{' '}
                    مربوط به دارایی <strong>{selectedLog.targetId}</strong> را در ساعت مذکور{' '}
                    {selectedLog.action === 'COPY_SECRET' ? 'مستقیماً در کلیپ‌بورد کپی کرده است' : 'به مدت ۳۰ ثانیه آشکارسازی چشمی نموده است'}.
                  </p>
                </div>
              )}

              {/* جزئیات تغییرات و Diff */}
              {selectedLog.diff ? (
                <div className="space-y-2">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span>تحلیل تغییرات و مقادیر (Diff Analysis):</span>
                    <span className="text-[11px] font-mono text-slate-400">JSON Payload</span>
                  </div>

                  <div className="border border-slate-200 dark:border-border-strong rounded-xl overflow-hidden">
                    <table className="w-full text-right border-collapse text-xs">
                      <thead className="bg-slate-100 dark:bg-surface-2 border-b border-slate-200 dark:border-border-strong text-slate-700 dark:text-slate-300 font-bold">
                        <tr>
                          <th className="p-2.5 w-1/3">فیلد</th>
                          <th className="p-2.5 w-1/3 text-rose-700 dark:text-rose-400">مقدار قبلی (Old)</th>
                          <th className="p-2.5 w-1/3 text-emerald-700 dark:text-emerald-400">مقدار جدید / وضعیت (New)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/80 dark:divide-border-subtle font-mono text-[11px]">
                        {Object.entries(selectedLog.diff).map(([key, val]: [string, any]) => {
                          const hasOldNew = val && typeof val === 'object' && ('old' in val || 'new' in val);
                          return (
                            <tr key={key} className="hover:bg-slate-50 dark:hover:bg-surface-2/40">
                              <td className="p-2.5 font-sans font-semibold text-slate-800 dark:text-slate-200">
                                {key}
                              </td>
                              <td className="p-2.5 text-rose-600 dark:text-rose-300 bg-rose-50/40 dark:bg-rose-950/20">
                                {hasOldNew ? String(val.old ?? '—') : '—'}
                              </td>
                              <td className="p-2.5 text-emerald-600 dark:text-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20">
                                {hasOldNew ? String(val.new ?? '—') : typeof val === 'object' ? JSON.stringify(val) : String(val)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 border border-slate-200 dark:border-border-strong rounded-xl">
                  تغییرات ساختاری اضافی برای این رویداد ثبت نشده است.
                </div>
              )}
            </div>

            {/* فوتر مودال */}
            <div className="pt-3 border-t border-slate-200 dark:border-border-subtle flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold shadow-xs transition"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
