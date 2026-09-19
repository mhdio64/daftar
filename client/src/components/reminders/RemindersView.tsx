import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle2, RotateCw, Calendar } from 'lucide-react';
import { remindersService, ReminderItem, RemindersResponse } from '../../services/reminders.service.ts';
import { RenewModal } from './RenewModal.tsx';
import { useToast } from '../../context/ToastContext.tsx';

const getRelativeDate = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

const calculateDaysRemaining = (dateStr: string) => {
  const target = new Date(dateStr).getTime();
  const now = new Date().getTime();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
};

const getStatus = (days: number): 'expired' | 'critical' | 'warningHigh' | 'warningMid' | 'healthy' => {
  if (days < 0) return 'expired';
  if (days <= 1) return 'critical';
  if (days <= 7) return 'warningHigh';
  if (days <= 30) return 'warningMid';
  return 'healthy';
};

const generateDemoReminders = (): ReminderItem[] => [
  {
    id: 'rem_1',
    title: 'سرور اصلی دیتابیس (Hetzner AX101)',
    assetType: {
      id: 'vps',
      name: 'سرورهای مجازی (VPS)',
      icon: 'Server',
    },
    expiryDate: getRelativeDate(-3),
    daysRemaining: -3,
    status: 'expired',
  },
  {
    id: 'rem_2',
    title: 'دامنه اختصاصی پورتال (company.ir)',
    assetType: {
      id: 'domains',
      name: 'دامنه‌ها و DNS',
      icon: 'Globe',
    },
    expiryDate: getRelativeDate(1),
    daysRemaining: 1,
    status: 'critical',
  },
  {
    id: 'rem_3',
    title: 'گواهینامه امنیتی SSL وایلدکارت (*.company.com)',
    assetType: {
      id: 'domains',
      name: 'دامنه‌ها و DNS',
      icon: 'Globe',
    },
    expiryDate: getRelativeDate(5),
    daysRemaining: 5,
    status: 'warningHigh',
  },
  {
    id: 'rem_4',
    title: 'لایسنس تیمی ابزارهای توسعه JetBrains',
    assetType: {
      id: 'licenses',
      name: 'لایسنس نرم‌افزارها',
      icon: 'Key',
    },
    expiryDate: getRelativeDate(22),
    daysRemaining: 22,
    status: 'warningMid',
  },
  {
    id: 'rem_5',
    title: 'سرور پشتیبان ابری (Cloud VPS Backup)',
    assetType: {
      id: 'vps',
      name: 'سرورهای مجازی (VPS)',
      icon: 'Server',
    },
    expiryDate: getRelativeDate(60),
    daysRemaining: 60,
    status: 'healthy',
  },
];

const computeCounts = (items: ReminderItem[]) => {
  return {
    total: items.length,
    expired: items.filter((i) => i.status === 'expired').length,
    critical: items.filter((i) => i.status === 'critical').length,
    warningHigh: items.filter((i) => i.status === 'warningHigh').length,
    warningMid: items.filter((i) => i.status === 'warningMid').length,
  };
};

export function RemindersView() {
  const { showToast } = useToast();
  const [data, setData] = useState<RemindersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedForRenew, setSelectedForRenew] = useState<ReminderItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'expired' | 'critical' | 'warningHigh'>('all');

  const fetchReminders = async () => {
    setIsLoading(true);
    try {
      const res = await remindersService.getAll();
      setData(res);
    } catch (err: any) {
      console.warn('API reminders unreachable, falling back to demo mode:', err);
      const demoItems = generateDemoReminders();
      setData({
        counts: computeCounts(demoItems),
        items: demoItems,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const handleRenewSuccess = (itemId: string, newExpiryDate: string, _cost: number | null) => {
    setData((prev) => {
      if (!prev) return null;
      const daysRemaining = calculateDaysRemaining(newExpiryDate);
      const status = getStatus(daysRemaining);
      const updatedItems = prev.items.map((i) =>
        i.id === itemId
          ? {
              ...i,
              expiryDate: newExpiryDate,
              daysRemaining,
              status,
            }
          : i
      );
      return {
        counts: computeCounts(updatedItems),
        items: updatedItems,
      };
    });
  };

  const filteredItems = (data?.items || []).filter((item) => {
    if (filter === 'expired') return item.status === 'expired';
    if (filter === 'critical') return item.status === 'critical' || item.status === 'expired';
    if (filter === 'warningHigh') return item.status === 'warningHigh' || item.status === 'critical' || item.status === 'expired';
    return true;
  });

  return (
    <div className="flex-1 flex flex-col min-w-0 p-6 overflow-auto text-right">
      {/* هدر بخش سررسیدها */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <span>سامانه پایش سررسیدها و یادآور تمدید</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            مدیریت موعد انقضای سرورها، لایسنس‌ها، دامنه‌ها و سرویس‌های سازمان
          </p>
        </div>

        <button
          onClick={fetchReminders}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-border-strong bg-white dark:bg-surface-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-surface-elevated hover:text-slate-900 dark:hover:text-white transition shadow-2xs"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>به‌روزرسانی لیست</span>
        </button>
      </div>

      {/* کارت‌های خلاصه آمار */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-subtle shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">کل سرویس‌های دارای سررسید</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono">{data?.counts.total ?? 0}</div>
        </div>

        <div className="p-4 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/30 shadow-xs">
          <div className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>منقضی شده</span>
          </div>
          <div className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1 font-mono">{data?.counts.expired ?? 0}</div>
        </div>

        <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 shadow-xs">
          <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>سررسید فوری (کمتر از ۷ روز)</span>
          </div>
          <div className="text-2xl font-bold text-amber-800 dark:text-amber-400 mt-1 font-mono">
            {(data?.counts.critical ?? 0) + (data?.counts.warningHigh ?? 0)}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 shadow-xs">
          <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>مهلت کافی (بیش از ۳۰ روز)</span>
          </div>
          <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-400 mt-1 font-mono">
            {Math.max(0, (data?.counts.total ?? 0) - ((data?.counts.expired ?? 0) + (data?.counts.warningMid ?? 0) + (data?.counts.warningHigh ?? 0) + (data?.counts.critical ?? 0)))}
          </div>
        </div>
      </div>

      {/* فیلترهای سریع */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
            filter === 'all' 
              ? 'bg-indigo-600 text-white shadow-xs' 
              : 'bg-white dark:bg-surface-2 border border-slate-200 dark:border-border-strong text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:text-white shadow-2xs'
          }`}
        >
          همه موارد ({data?.counts.total ?? 0})
        </button>
        <button
          onClick={() => setFilter('expired')}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
            filter === 'expired' 
              ? 'bg-rose-600 text-white shadow-xs' 
              : 'bg-white dark:bg-surface-2 border border-slate-200 dark:border-border-strong text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:text-white shadow-2xs'
          }`}
        >
          منقضی‌ها ({data?.counts.expired ?? 0})
        </button>
        <button
          onClick={() => setFilter('warningHigh')}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
            filter === 'warningHigh' 
              ? 'bg-amber-600 text-white shadow-xs' 
              : 'bg-white dark:bg-surface-2 border border-slate-200 dark:border-border-strong text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:text-white shadow-2xs'
          }`}
        >
          سررسید این هفته ({(data?.counts.critical ?? 0) + (data?.counts.warningHigh ?? 0)})
        </button>
      </div>

      {/* جدول سررسیدها */}
      <div className="border border-slate-200 dark:border-border-strong rounded-xl bg-white dark:bg-surface-1 overflow-hidden shadow-xs">
        <table className="w-full text-right border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-border-strong bg-slate-50/90 dark:bg-surface-2/60 text-slate-700 dark:text-slate-300 font-semibold">
              <th className="p-3">عنوان سرویس / دارایی</th>
              <th className="p-3">دسته</th>
              <th className="p-3">تاریخ سررسید</th>
              <th className="p-3">مهلت باقیمانده</th>
              <th className="p-3">وضعیت</th>
              <th className="p-3 text-center">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 dark:divide-border-subtle">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => {
                const dateStr = item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('fa-IR') : '—';

                return (
                  <tr key={item.id} className="hover:bg-slate-50/90 dark:hover:bg-surface-2/60 transition">
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">{item.title}</td>
                    <td className="p-3 font-medium text-indigo-700 dark:text-indigo-400">{item.assetType.name}</td>
                    <td className="p-3 font-mono text-slate-700 dark:text-slate-300">{dateStr}</td>
                    <td className="p-3 font-mono font-medium text-slate-800 dark:text-slate-200">
                      {item.daysRemaining < 0
                        ? `${Math.abs(item.daysRemaining)} روز گذشته`
                        : `${item.daysRemaining} روز مانده`}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          item.status === 'expired'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200/90 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30'
                            : item.status === 'critical'
                            ? 'bg-rose-50 text-rose-800 border border-rose-300 animate-pulse font-bold dark:bg-rose-500/20 dark:text-rose-400'
                            : item.status === 'warningHigh'
                            ? 'bg-amber-50 text-amber-900 border border-amber-200/90 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30'
                            : item.status === 'warningMid'
                            ? 'bg-yellow-50 text-yellow-900 border border-yellow-200/90 dark:bg-yellow-500/10 dark:text-yellow-300'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200/90 dark:bg-emerald-500/15 dark:text-emerald-400'
                        }`}
                      >
                        {item.status === 'expired'
                          ? 'منقضی شده'
                          : item.status === 'critical'
                          ? 'بحرانی (امروز)'
                          : item.status === 'warningHigh'
                          ? 'نیاز به تمدید فوری'
                          : item.status === 'warningMid'
                          ? 'تمدید در ماه جاری'
                          : 'فعال و معتبر'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setSelectedForRenew(item)}
                        className="px-3 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-semibold dark:bg-indigo-600/20 dark:hover:bg-indigo-600 dark:text-indigo-300 dark:hover:text-white dark:border-indigo-500/30 transition shadow-2xs"
                      >
                        ثبت تمدید
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400">
                  موردی با این فیلتر یافت نشد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* مودال ثبت تمدید */}
      {selectedForRenew && (
        <RenewModal
          item={selectedForRenew}
          onClose={() => setSelectedForRenew(null)}
          onRenewed={handleRenewSuccess}
        />
      )}
    </div>
  );
}
