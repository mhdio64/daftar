import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Eye,
  LogIn,
  LogOut,
  PlusCircle,
  Edit3,
  Trash2,
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  User,
  Monitor,
  Check,
  X,
  FileSpreadsheet,
  AlertTriangle,
  ArrowUpDown,
  FileCode,
  Layers,
  ChevronRight,
  ChevronLeft
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
    } catch {
      // داده‌های نمونه و واقع‌گرایانه ممیزی برای حالت دمو
      const demoLogs: AuditLogItem[] = [
        {
          id: 'log-1',
          userId: 'usr-1',
          user: { id: 'usr-1', fullName: 'مهدی رحیمی', username: 'admin', role: 'ADMIN' },
          action: 'READ_SECRET',
          targetEntity: 'Asset',
          targetId: 'vps-1 (سرور اصلی دیتاسنتر تهران)',
          diff: { fieldKey: 'root_password', reason: 'مشاهده پسورد روت سرور با تایمر امنیتی' },
          ipAddress: '192.168.1.140',
          userAgent: 'Mozilla/5.0 (Linux; X11; Ubuntu; Linux x86_64)',
          createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // ۱۵ دقیقه پیش
        },
        {
          id: 'log-2',
          userId: 'usr-2',
          user: { id: 'usr-2', fullName: 'سارا احمدی', username: 'operator', role: 'EDITOR' },
          action: 'UPDATE',
          targetEntity: 'Asset',
          targetId: 'vps-2 (لودبالانسر شبکه)',
          diff: {
            ip_address: { old: '10.0.1.5:80', new: '10.0.1.5:443' },
            os_type: { old: 'Debian 11', new: 'Debian 12' },
          },
          ipAddress: '192.168.1.112',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // ۲ ساعت پیش
        },
        {
          id: 'log-3',
          userId: 'usr-1',
          user: { id: 'usr-1', fullName: 'مهدی رحیمی', username: 'admin', role: 'ADMIN' },
          action: 'CREATE',
          targetEntity: 'Attachment',
          targetId: 'openvpn-client-profile.ovpn',
          diff: { originalName: 'openvpn-client-profile.ovpn', sizeBytes: 14250, assetId: 'vps-1' },
          ipAddress: '192.168.1.140',
          userAgent: 'Mozilla/5.0 (Linux; X11; Ubuntu; Linux x86_64)',
          createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
        },
        {
          id: 'log-4',
          userId: 'usr-1',
          user: { id: 'usr-1', fullName: 'مهدی رحیمی', username: 'admin', role: 'ADMIN' },
          action: 'UPDATE',
          targetEntity: 'AssetType',
          targetId: 'vps (سرورهای مجازی)',
          diff: { wikiUpdated: true, section: 'راهنمای جامع مدیریت سرورها' },
          ipAddress: '192.168.1.140',
          userAgent: 'Mozilla/5.0 (Linux; X11; Ubuntu; Linux x86_64)',
          createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        },
        {
          id: 'log-5',
          userId: 'usr-3',
          user: { id: 'usr-3', fullName: 'علی حسینی', username: 'viewer_user', role: 'VIEWER' },
          action: 'LOGIN',
          targetEntity: 'User',
          targetId: 'usr-3',
          diff: { loginMethod: 'PASSWORD_AUTH' },
          ipAddress: '178.252.189.44',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
        },
        {
          id: 'log-6',
          userId: 'usr-1',
          user: { id: 'usr-1', fullName: 'مهدی رحیمی', username: 'admin', role: 'ADMIN' },
          action: 'DELETE',
          targetEntity: 'Asset',
          targetId: 'vps-old-test (سرور آزمایشی راه‌اندازی)',
          diff: { title: 'سرور تستی حذف‌شده', ip_address: '127.0.0.1:8080' },
          ipAddress: '192.168.1.140',
          userAgent: 'Mozilla/5.0 (Linux; X11; Ubuntu; Linux x86_64)',
          createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
        },
      ];

      setLogs(demoLogs);
      setTotalPages(1);
      setTotalCount(demoLogs.length);
      setStats({
        totalEvents: demoLogs.length,
        secretViews: 1,
        recentSecretViews: 1,
        todayChanges: 3,
        loginEvents: 1,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [actionFilter, entityFilter, page]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await auditService.exportExcel({
        action: actionFilter,
        targetEntity: entityFilter,
      });
      showToast('گزارش اکسل ممیزی با موفقیت دانلود شد.', 'success');
    } catch (err: any) {
      showToast(err.message || 'خطا در صدور گزارش اکسل', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // استایل‌ها و برچسب‌های رنگی هر عملیات
  const getActionBadge = (action: string) => {
    switch (action) {
      case 'READ_SECRET':
        return {
          icon: <Eye className="w-3.5 h-3.5" />,
          label: 'مشاهده رمز محرمانه',
          className: 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 border-amber-300 dark:border-amber-500/40',
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
        log.user.username.toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-canvas dark:bg-canvas text-right">
      {/* هدر صفحه لاگ‌های ممیزی */}
      <div className="p-6 pb-4 border-b border-slate-200 dark:border-border-subtle bg-white dark:bg-surface-1 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-500/30 flex items-center justify-center shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>لاگ‌های ممیزی و رهگیری رویدادهای امنیتی</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 font-semibold border border-indigo-200/60 dark:border-indigo-500/30">
                  Audit Trail
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ثبت کلیه تغییرات داده‌ها، افشای اطلاعات و گذرواژه‌های محرمانه، و نشست‌های کاربران
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || logs.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-border-strong bg-white dark:bg-surface-2 hover:bg-slate-50 dark:hover:bg-surface-elevated text-xs font-semibold text-slate-700 dark:text-slate-200 transition shadow-2xs disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{isExporting ? 'در حال صدور اکسل...' : 'خروجی اکسل ممیزی'}</span>
          </button>
        </div>

        {/* ۴ کارت شاخص امنیتی (Security KPI Cards) */}
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

          {/* کارت ۲: افشای اطلاعات محرمانه (هشدار امنیتی) */}
          <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>افشای رمزهای محرمانه</span>
              </div>
              <div className="text-lg font-black text-amber-900 dark:text-amber-200 mt-1">
                {stats ? stats.secretViews : 1} <span className="text-xs font-normal text-amber-700 dark:text-amber-400">بار ({stats?.recentSecretViews || 1} بار در ۲۴ ساعت گذشته)</span>
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
                {stats ? stats.todayChanges : 3} <span className="text-xs font-normal text-slate-500">عملیات (ایجاد/ویرایش/حذف)</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-200/60 dark:border-sky-500/30">
              <Edit3 className="w-4 h-4" />
            </div>
          </div>

          {/* کارت ۴: ورودهای موفق */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-border-strong bg-slate-50/70 dark:bg-surface-2/40 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">جلسات ورود به سامانه</div>
              <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                {stats ? stats.loginEvents : 1} <span className="text-xs font-normal text-slate-500">ورود موفق</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-500/30">
              <LogIn className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* نوار ابزار فیلترها و جستجو */}
      <div className="px-6 py-3 border-b border-slate-200 dark:border-border-subtle bg-slate-50/60 dark:bg-surface-1/60 flex items-center justify-between gap-3 shrink-0 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* باکس جستجو */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="جستجو در IP، کاربر یا شناسه..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg pr-8 pl-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 transition"
            />
          </div>

          {/* فیلتر نوع عملیات */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">عملیات:</span>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:border-indigo-600"
            >
              <option value="ALL">کلیه عملیات‌ها</option>
              <option value="READ_SECRET">👁️ مشاهده رمز محرمانه (READ_SECRET)</option>
              <option value="CREATE">➕ ثبت جدید (CREATE)</option>
              <option value="UPDATE">✏️ ویرایش (UPDATE)</option>
              <option value="DELETE">🗑️ حذف (DELETE)</option>
              <option value="LOGIN">🔑 ورود به سامانه (LOGIN)</option>
              <option value="LOGOUT">🚪 خروج (LOGOUT)</option>
            </select>
          </div>

          {/* فیلتر موجودیت */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">موجودیت:</span>
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:border-indigo-600"
            >
              <option value="ALL">کلیه موجودیت‌ها</option>
              <option value="Asset">🖥️ دارایی‌ها (Asset)</option>
              <option value="AssetType">📁 دسته‌بندی‌ها (AssetType)</option>
              <option value="User">👤 کاربران (User)</option>
              <option value="Attachment">📎 فایل‌های پیوست (Attachment)</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          نمایش {filteredLogs.length} رکورد
        </div>
      </div>

      {/* جدول داده‌های لاگ‌های ممیزی */}
      <div className="flex-1 px-6 py-4 overflow-auto">
        <div className="border border-slate-200 dark:border-border-strong rounded-xl bg-white dark:bg-surface-1 overflow-hidden shadow-xs">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-border-strong bg-slate-50/90 dark:bg-surface-2/60 text-slate-700 dark:text-slate-300 font-bold">
                <th className="p-3 w-12 text-center">#</th>
                <th className="p-3 w-40">زمان و تاریخ</th>
                <th className="p-3 w-44">کاربر مجری</th>
                <th className="p-3 w-44">نوع عملیات</th>
                <th className="p-3">موجودیت و شناسه هدف</th>
                <th className="p-3 w-32" dir="ltr">آدرس IP</th>
                <th className="p-3 w-28 text-center">جزئیات و Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-border-subtle">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-500 dark:text-slate-400">
                    در حال بارگذاری لاگ‌های ممیزی...
                  </td>
                </tr>
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log, index) => {
                  const badge = getActionBadge(log.action);
                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-slate-50/90 dark:hover:bg-surface-2/50 transition ${
                        log.action === 'READ_SECRET'
                          ? 'bg-amber-50/30 dark:bg-amber-950/10'
                          : log.action === 'DELETE'
                          ? 'bg-rose-50/20 dark:bg-rose-950/10'
                          : ''
                      }`}
                    >
                      <td className="p-3 text-center text-slate-400 dark:text-slate-500 font-mono">
                        {(page - 1) * 25 + index + 1}
                      </td>

                      {/* زمان */}
                      <td className="p-3 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(log.createdAt).toLocaleDateString('fa-IR')}</span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(log.createdAt).toLocaleTimeString('fa-IR', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                      </td>

                      {/* کاربر مجری */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-surface-2 border border-slate-200 dark:border-border-strong text-slate-700 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold">
                            {log.user.fullName?.slice(0, 1) || 'ک'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                              {log.user.fullName || log.user.username}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono leading-tight">
                              @{log.user.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* نوع عملیات */}
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border ${badge.className}`}
                        >
                          {badge.icon}
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* موجودیت و شناسه هدف */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-surface-2 border border-slate-200 dark:border-border-strong text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-300">
                            {log.targetEntity}
                          </span>
                          <span className="text-slate-800 dark:text-slate-200 font-medium truncate max-w-xs">
                            {log.targetId}
                          </span>
                        </div>
                      </td>

                      {/* IP */}
                      <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-400" dir="ltr">
                        {log.ipAddress || '—'}
                      </td>

                      {/* دکمه جزئیات */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-border-strong bg-white dark:bg-surface-2 hover:bg-slate-50 dark:hover:bg-surface-elevated text-slate-700 dark:text-slate-200 text-[11px] font-semibold transition shadow-2xs"
                        >
                          بررسی Diff
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    هیچ رویدادی مطابق فیلترهای انتخابی یافت نشد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* صفحه‌بندی */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <div>
              صفحه {page} از {totalPages} (کل ردیف‌ها: {totalCount})
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-border-strong bg-white dark:bg-surface-2 disabled:opacity-40 transition shadow-2xs"
              >
                قبلی
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-border-strong bg-white dark:bg-surface-2 disabled:opacity-40 transition shadow-2xs"
              >
                بعدی
              </button>
            </div>
          </div>
        )}
      </div>

      {/* مودال نمایش جزئیات لاگ و تفاوت‌های Diff */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl shadow-2xl p-6 text-right flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* هدر مودال */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-border-subtle shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    جزئیات لاگ ممیزی و تغییرات
                  </h3>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    شناسه رکورد: {selectedLog.id}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-surface-2 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* محتوای مودال */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
              {/* خلاصه اطلاعات رویداد */}
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
                  <span className="text-slate-500 dark:text-slate-400 block mb-0.5">آدرس IP و کلاینت:</span>
                  <span className="font-mono text-slate-900 dark:text-white" dir="ltr">
                    {selectedLog.ipAddress || '127.0.0.1'}
                  </span>
                </div>
              </div>

              {/* کادر هشدار اختصاصی در صورت افشای اطلاعات محرمانه */}
              {selectedLog.action === 'READ_SECRET' && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>گزارش دسترسی به فیلد محرمانه (Password Reveal Trail)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    کاربر <strong>{selectedLog.user.fullName}</strong> فیلد محرمانه دارایی{' '}
                    <strong>{selectedLog.targetId}</strong> را در تاریخ مذکور رمزگشایی و مشاهده نموده است. رمز
                    به مدت ۳۰ ثانیه در فرانت‌اند نمایش داده شده و مجدداً ماسک گردیده است.
                  </p>
                </div>
              )}

              {/* جدول مقایسه تغییرات (Diff Table) */}
              {selectedLog.diff ? (
                <div className="space-y-2">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span>تحلیل تغییرات مقادیر (Diff Analysis):</span>
                    <span className="text-[11px] font-mono text-slate-400">JSON Payload</span>
                  </div>

                  <div className="border border-slate-200 dark:border-border-strong rounded-xl overflow-hidden">
                    <table className="w-full text-right border-collapse text-xs">
                      <thead className="bg-slate-100 dark:bg-surface-2 border-b border-slate-200 dark:border-border-strong text-slate-700 dark:text-slate-300 font-bold">
                        <tr>
                          <th className="p-2.5 w-1/3">فیلد تغییر یافته</th>
                          <th className="p-2.5 w-1/3 text-rose-700 dark:text-rose-400">مقدار قبلی (Old)</th>
                          <th className="p-2.5 w-1/3 text-emerald-700 dark:text-emerald-400">مقدار جدید (New)</th>
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
                                {hasOldNew ? String(val.new ?? '—') : String(val)}
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
                  تغییرات ساختاری اضافی برای این لاگ ثبت نشده است.
                </div>
              )}
            </div>

            {/* فوتر مودال */}
            <div className="pt-4 border-t border-slate-200 dark:border-border-subtle flex justify-end shrink-0">
              <button
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
