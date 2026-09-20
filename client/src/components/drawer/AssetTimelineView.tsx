import React, { useState, useEffect } from 'react';
import {
  History,
  RotateCcw,
  Edit3,
  PlusCircle,
  KeyRound,
  Clock,
  X,
  AlertTriangle,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { Asset, AssetTimelineItem, assetsService } from '../../services/assets.service.ts';
import { AssetType } from '../../services/asset-types.service.ts';
import { useToast } from '../../context/ToastContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

interface AssetTimelineViewProps {
  asset: Asset;
  assetType: AssetType;
  onRollbackSuccess?: (updatedAsset: Asset) => void;
}

/**
 * تبدیل زمان به برچسب نسبی فارسی (مانند «۵ دقیقه پیش»)
 */
function getRelativeTimePersian(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSec < 60) return 'همین حالا';
  if (diffMin < 60) return `${diffMin} دقیقه پیش`;
  if (diffHours < 24) return `${diffHours} ساعت پیش`;
  if (diffDays === 1) return 'دیروز';
  if (diffDays < 30) return `${diffDays} روز پیش`;
  if (diffMonths < 12) return `${diffMonths} ماه پیش`;
  return `${Math.floor(diffDays / 365)} سال پیش`;
}

/**
 * تبدیل تاریخ به فرمت خورشیدی با ساعت دقیق
 */
function formatPersianDateTime(isoDate: string): string {
  const d = new Date(isoDate);
  const dateStr = d.toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = d.toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${dateStr} - ساعت ${timeStr}`;
}

/**
 * تعیین نام و عنوان فارسی برای فیلدها
 */
function resolveFieldLabel(key: string, assetType: AssetType): string {
  if (key === 'title') return 'عنوان دارایی';
  if (key === '__tags' || key === 'tags') return 'برچسب‌ها';
  if (key === 'expiryDate') return 'تاریخ سررسید / انقضا';
  if (key === 'docsMarkdown') return 'مستندات و ویکی فنی';

  if (Array.isArray(assetType.schemaDefinition)) {
    const found = assetType.schemaDefinition.find((f: any) => f.name === key);
    if (found && found.label) return found.label;
  }

  // اگر در اسکیما پیدا نشد
  return key.replace(/_/g, ' ');
}

/**
 * فرمت‌بندی خوانای مقادیر فیلدها در تایم‌لاین
 */
function formatFieldValue(val: any): string {
  if (val === null || val === undefined || val === '') return '(خالی)';
  if (Array.isArray(val)) {
    return val.length > 0 ? val.join('، ') : '(بدون برچسب)';
  }
  if (typeof val === 'boolean') {
    return val ? 'بله' : 'خیر';
  }
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

export function AssetTimelineView({ asset, assetType, onRollbackSuccess }: AssetTimelineViewProps) {
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();

  const [timeline, setTimeline] = useState<AssetTimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLogForRollback, setSelectedLogForRollback] = useState<AssetTimelineItem | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);

  // بارگذاری تایم‌لاین تغییرات از سرور (با پشتیبانی از حالت دمو)
  const fetchTimeline = async () => {
    setIsLoading(true);
    try {
      const logs = await assetsService.getTimeline(asset.id);
      if (logs && logs.length > 0) {
        setTimeline(logs);
      } else {
        generateDemoTimeline();
      }
    } catch {
      generateDemoTimeline();
    } finally {
      setIsLoading(false);
    }
  };

  // تولید داده‌های پیش‌فرض و واقعی برای حالت دمو یا دارایی‌های نمونه
  const generateDemoTimeline = () => {
    const localKey = `daftar_asset_timeline_${asset.id}`;
    const stored = localStorage.getItem(localKey);
    if (stored) {
      try {
        setTimeline(JSON.parse(stored));
        return;
      } catch {}
    }

    const now = Date.now();
    const demoItems: AssetTimelineItem[] = [
      {
        id: `log-demo-init-${asset.id}`,
        userId: 'usr-1',
        user: {
          id: 'usr-1',
          fullName: 'مهدی رحیمی',
          username: 'admin',
          role: 'ADMIN',
        },
        action: 'CREATE',
        targetEntity: 'Asset',
        targetId: asset.id,
        diff: {
          title: { new: asset.title },
        },
        createdAt: asset.createdAt || new Date(now - 7 * 24 * 3600 * 1000).toISOString(),
      },
    ];

    // اگر دارایی دارای مقادیری است، یک رویداد ویرایش واقع‌گرایانه اضافه می‌کنیم
    const valuesKeys = Object.keys(asset.values || {});
    if (valuesKeys.length > 0) {
      const firstKey = valuesKeys[0];
      const secondKey = valuesKeys[1] || valuesKeys[0];
      const curVal1 = asset.values[firstKey];
      const curVal2 = asset.values[secondKey];

      demoItems.unshift({
        id: `log-demo-update-${asset.id}`,
        userId: 'usr-2',
        user: {
          id: 'usr-2',
          fullName: 'سارا احمدی',
          username: 'operator',
          role: 'EDITOR',
        },
        action: 'UPDATE',
        targetEntity: 'Asset',
        targetId: asset.id,
        diff: {
          [firstKey]: {
            old: typeof curVal1 === 'number' ? curVal1 * 2 : `${curVal1 || 'قدیمی'}_old`,
            new: curVal1,
          },
          ...(secondKey !== firstKey
            ? {
                [secondKey]: {
                  old: typeof curVal2 === 'string' ? `${curVal2} (نسخه آزمایشی)` : curVal2,
                  new: curVal2,
                },
              }
            : {}),
        },
        createdAt: new Date(now - 2 * 24 * 3600 * 1000).toISOString(),
      });
    }

    localStorage.setItem(localKey, JSON.stringify(demoItems));
    setTimeline(demoItems);
  };

  useEffect(() => {
    fetchTimeline();
  }, [asset.id]);

  // استخراج فیلدهای قابل بازگردانی از یک رکورد ممیزی
  const getRestorableFields = (log: AssetTimelineItem) => {
    if (!log.diff || typeof log.diff !== 'object') return [];

    return Object.entries(log.diff).filter(([key, change]) => {
      // فیلدهای متادیتای داخلی مانند __actionType یا پسوردهای ماسک شده نادیده گرفته می‌شوند
      if (key.startsWith('__actionType') || key.startsWith('__rollback')) return false;
      if (!change || typeof change !== 'object') return false;
      if (!('old' in change)) return false;

      // فیلدهای رمز عبور که مقدارشان ماسک بوده قابل بازگردانی نیستند
      if (change.old === '••••••••' || change.new === '••••••••') return false;

      return true;
    });
  };

  // انجام عملیات بازگردانی
  const handleExecuteRollback = async () => {
    if (!selectedLogForRollback) return;
    setIsRollingBack(true);

    try {
      let updatedAsset: Asset;
      try {
        // تلاش برای ارتباط با سرور
        updatedAsset = await assetsService.rollback(asset.id, selectedLogForRollback.id);
      } catch {
        // فال‌بک کامل در حالت دمو / آفلاین
        const restorable = getRestorableFields(selectedLogForRollback);
        const newValues = { ...asset.values };
        let newTitle = asset.title;
        let newTags = asset.tags ? [...asset.tags] : [];

        for (const [key, change] of restorable) {
          if (key === 'title') {
            newTitle = String(change.old || newTitle);
          } else if (key === '__tags' || key === 'tags') {
            newTags = Array.isArray(change.old) ? change.old : newTags;
          } else {
            if (change.old === null || change.old === undefined) {
              delete newValues[key];
            } else {
              newValues[key] = change.old;
            }
          }
        }

        updatedAsset = {
          ...asset,
          title: newTitle,
          values: newValues,
          tags: newTags,
          updatedAt: new Date().toISOString(),
        };

        // ذخیره در localStorage برای دمو
        const localKey = `daftar_asset_timeline_${asset.id}`;
        const newLog: AssetTimelineItem = {
          id: `log-rollback-${Date.now()}`,
          userId: currentUser?.id || 'demo-admin',
          user: {
            id: currentUser?.id || 'demo-admin',
            fullName: currentUser?.fullName || 'کاربر جاری',
            username: currentUser?.username || 'admin',
            role: currentUser?.role || 'ADMIN',
          },
          action: 'UPDATE',
          targetEntity: 'Asset',
          targetId: asset.id,
          diff: {
            ...selectedLogForRollback.diff,
            __actionType: { old: null, new: 'ROLLBACK', note: 'بازگردانی مقادیر به نسخه پیشین' },
          },
          createdAt: new Date().toISOString(),
        };

        const updatedTimeline = [newLog, ...timeline];
        localStorage.setItem(localKey, JSON.stringify(updatedTimeline));
        setTimeline(updatedTimeline);

        // به‌روزرسانی دارایی‌های دمو در صورت وجود
        const demoAssets = localStorage.getItem('daftar_demo_assets');
        if (demoAssets) {
          try {
            const list = JSON.parse(demoAssets);
            const idx = list.findIndex((a: Asset) => a.id === asset.id);
            if (idx >= 0) {
              list[idx] = updatedAsset;
              localStorage.setItem('daftar_demo_assets', JSON.stringify(list));
            }
          } catch {}
        }
      }

      showToast('دارایی با موفقیت به مقادیر پیشین بازگردانی شد.', 'success');
      setSelectedLogForRollback(null);
      if (onRollbackSuccess) {
        onRollbackSuccess(updatedAsset);
      }
      fetchTimeline();
    } catch (err: any) {
      showToast(err.message || 'خطا در بازگردانی نسخه دارایی.', 'error');
    } finally {
      setIsRollingBack(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* هدر توضیحات تب تاریخچه */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-surface-2 border border-slate-200/80 dark:border-border-subtle flex items-start gap-3">
        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shrink-0">
          <History className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>تاریخچه تغییرات و نسخه‌بندی (Timeline & Audit Trail)</span>
            <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
              {timeline.length} رویداد
            </span>
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            تمامی ویرایش‌ها، تغییرات فیلدها و دسترسی‌های امنیتی به همراه تفاوت دقیق مقادیر ثبت می‌گردد. شما
            می‌توانید با استفاده از دکمه <strong>بازگردانی (Rollback)</strong>، دارایی را به هر نسخه دلخواه بازگردانید.
          </p>
        </div>
      </div>

      {/* وضعیت لودینگ */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span className="text-xs font-medium">در حال دریافت تاریخچه تغییرات...</span>
        </div>
      ) : timeline.length === 0 ? (
        /* وضعیت عدم وجود لاگ */
        <div className="py-12 text-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-border-strong rounded-2xl p-6">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-60 text-slate-400" />
          <p className="text-xs font-semibold">هیچ رویدادی برای این دارایی ثبت نشده است.</p>
          <span className="text-[11px] block mt-1">تغییرات آتی در اینجا نمایش داده خواهند شد.</span>
        </div>
      ) : (
        /* استریم تایم‌لاین */
        <div className="relative border-r-2 border-slate-200 dark:border-border-subtle mr-3 space-y-6">
          {timeline.map((item) => {
            const isCreate = item.action === 'CREATE';
            const isReadSecret = item.action === 'READ_SECRET';
            const isRollback =
              item.diff && typeof item.diff === 'object' && '__actionType' in item.diff;
            const restorableFields = getRestorableFields(item);
            const canRollback = !isCreate && !isReadSecret && restorableFields.length > 0;

            return (
              <div key={item.id} className="relative pr-6 group">
                {/* بولت و آیکون تایم‌لاین */}
                <div
                  className={`absolute -right-[13px] top-1.5 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-surface-1 transition shadow-xs ${
                    isCreate
                      ? 'bg-emerald-500 text-white'
                      : isRollback
                      ? 'bg-purple-500 text-white'
                      : isReadSecret
                      ? 'bg-amber-500 text-white'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  {isCreate ? (
                    <PlusCircle className="w-3.5 h-3.5" />
                  ) : isRollback ? (
                    <RotateCcw className="w-3.5 h-3.5" />
                  ) : isReadSecret ? (
                    <KeyRound className="w-3.5 h-3.5" />
                  ) : (
                    <Edit3 className="w-3.5 h-3.5" />
                  )}
                </div>

                {/* کارت رویداد */}
                <div className="p-4 rounded-xl bg-white dark:bg-surface-2 border border-slate-200 dark:border-border-subtle shadow-2xs hover:border-slate-300 dark:hover:border-border-strong transition">
                  {/* سطر بالا: مشخصات کاربر و زمان */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-border-subtle/60 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-surface-3 flex items-center justify-center font-bold text-[10px] text-slate-700 dark:text-slate-300">
                        {item.user?.fullName ? item.user.fullName[0] : 'U'}
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {item.user?.fullName || item.user?.username || 'کاربر نامشخص'}
                      </span>
                      {item.user?.role && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-surface-3 dark:text-slate-300">
                          {item.user.role === 'ADMIN'
                            ? 'مدیر سیستم'
                            : item.user.role === 'EDITOR'
                            ? 'ویرایشگر'
                            : 'بیننده'}
                        </span>
                      )}
                    </div>

                    {/* زمان رویداد */}
                    <div
                      className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]"
                      title={formatPersianDateTime(item.createdAt)}
                    >
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {getRelativeTimePersian(item.createdAt)}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="font-mono text-[10px] opacity-80 hidden sm:inline">
                        {new Date(item.createdAt).toLocaleTimeString('fa-IR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* بدنه رویداد: برچسب عملیات و مقایسه تغییرات (Diff) */}
                  <div className="pt-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          isCreate
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                            : isRollback
                            ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300'
                            : isReadSecret
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                            : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300'
                        }`}
                      >
                        {isCreate
                          ? 'ثبت و ایجاد اولیه دارایی'
                          : isRollback
                          ? 'بازگردانی نسخه قبلی'
                          : isReadSecret
                          ? 'مشاهده و افشای فیلد محرمانه'
                          : 'ویرایش مشخصات و فیلدها'}
                      </span>

                      {/* دکمه بازگردانی (Rollback) در صورت امکان */}
                      {canRollback && (
                        <button
                          type="button"
                          onClick={() => setSelectedLogForRollback(item)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/60 transition shadow-2xs group-hover:scale-105"
                          title="بازگردانی دارایی به وضعیت قبل از این تغییر"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>بازگردانی (Rollback)</span>
                        </button>
                      )}
                    </div>

                    {/* نمایش پیام اختصاصی در صورت بازگشایی رمز */}
                    {isReadSecret && (
                      <div className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span>
                            فیلد محرمانه «
                            {item.diff?.fieldKey
                              ? resolveFieldLabel(item.diff.fieldKey, assetType)
                              : item.diff?.field
                              ? resolveFieldLabel(item.diff.field, assetType)
                              : 'رمز عبور'}
                            » با تایید امنیتی مشاهده یا در کلیپ‌بورد کپی شد.
                          </span>
                        </div>
                      </div>
                    )}

                    {/* جدول تفاوت مقادیر (Diff Viewer) */}
                    {item.diff && typeof item.diff === 'object' && Object.keys(item.diff).length > 0 && !isReadSecret && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                          تغییرات اعمال‌شده در این نسخه:
                        </span>

                        <div className="rounded-lg border border-slate-200/80 dark:border-border-strong overflow-hidden bg-slate-50/50 dark:bg-surface-1">
                          <table className="w-full text-right text-xs">
                            <thead className="bg-slate-100/70 dark:bg-surface-3/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200/80 dark:border-border-subtle text-[11px]">
                              <tr>
                                <th className="py-1.5 px-3 w-1/3">فیلد</th>
                                <th className="py-1.5 px-3 w-1/3 text-rose-600 dark:text-rose-400">مقدار قبلی</th>
                                <th className="py-1.5 px-3 w-1/3 text-emerald-600 dark:text-emerald-400">مقدار جدید</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/60 dark:divide-border-subtle/60 text-[11px]">
                              {Object.entries(item.diff).map(([key, change]) => {
                                if (key.startsWith('__actionType') || key.startsWith('__rollback')) return null;

                                const hasOldNew = change && typeof change === 'object' && ('old' in change || 'new' in change);
                                const isSecret = change?.old === '••••••••' || change?.new === '••••••••';
                                const oldVal = hasOldNew ? change.old : undefined;
                                const newVal = hasOldNew ? change.new : change;

                                return (
                                  <tr key={key} className="hover:bg-slate-100/50 dark:hover:bg-surface-2/60 transition">
                                    <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                                      {resolveFieldLabel(key, assetType)}
                                    </td>

                                    {/* ستون مقدار قبلی */}
                                    <td className="py-2 px-3">
                                      {isSecret ? (
                                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-surface-3 text-slate-500 text-[10px] font-mono">
                                          •••••••• (محرمانه)
                                        </span>
                                      ) : oldVal !== undefined ? (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 font-mono text-[11px] line-through">
                                          {formatFieldValue(oldVal)}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 dark:text-slate-500">—</span>
                                      )}
                                    </td>

                                    {/* ستون مقدار جدید */}
                                    <td className="py-2 px-3">
                                      {isSecret ? (
                                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-surface-3 text-slate-500 text-[10px] font-mono">
                                          •••••••• (به‌روزشده)
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 font-mono text-[11px] font-medium">
                                          {formatFieldValue(newVal)}
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* مودال تایید بازگردانی (Rollback Confirmation Modal) */}
      {selectedLogForRollback && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* هدر مودال */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-border-subtle">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    تایید بازگردانی نسخه دارایی (Rollback)
                  </h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    بازگشت به مقادیر پیش از ویرایش مورخ{' '}
                    {formatPersianDateTime(selectedLogForRollback.createdAt)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLogForRollback(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-surface-2 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* محتوا و پیش‌نمایش فیلدهای قابل تغییر */}
            <div className="space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                با تایید این عملیات، فیلدهای تغییر یافته در این مرحله به مقادیر پیشین خود بازخواهند گشت و یک
                رکورد جدید در تایم‌لاین ثبت خواهد شد:
              </p>

              <div className="rounded-xl border border-slate-200 dark:border-border-strong overflow-hidden bg-slate-50 dark:bg-surface-2">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 dark:bg-surface-3 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-border-subtle">
                    <tr>
                      <th className="py-2 px-3">فیلد</th>
                      <th className="py-2 px-3 text-slate-500">مقدار فعلی</th>
                      <th className="py-2 px-3 text-indigo-600 dark:text-indigo-400">
                        مقدار پس از بازگردانی
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:divide-border-subtle text-[11px] font-mono">
                    {getRestorableFields(selectedLogForRollback).map(([key, change]) => {
                      const curVal =
                        key === 'title'
                          ? asset.title
                          : key === '__tags' || key === 'tags'
                          ? asset.tags
                          : asset.values?.[key];

                      return (
                        <tr key={key} className="hover:bg-slate-100/50 dark:hover:bg-surface-3/40">
                          <td className="py-2 px-3 font-sans font-semibold text-slate-800 dark:text-slate-200">
                            {resolveFieldLabel(key, assetType)}
                          </td>
                          <td className="py-2 px-3 text-slate-500">{formatFieldValue(curVal)}</td>
                          <td className="py-2 px-3 text-indigo-600 dark:text-indigo-300 font-bold bg-indigo-50/50 dark:bg-indigo-950/20">
                            {formatFieldValue(change.old)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  نکته امنیتی: فیلدهای محرمانه و رمزهای عبور به دلایل امنیتی در لاگ ثبت نمی‌شوند و تغییر
                  نمی‌کنند.
                </span>
              </div>
            </div>

            {/* دکمه‌های اکشن مودال */}
            <div className="pt-3 border-t border-slate-200 dark:border-border-subtle flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedLogForRollback(null)}
                disabled={isRollingBack}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-border-subtle hover:bg-slate-100 dark:hover:bg-surface-2 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleExecuteRollback}
                disabled={isRollingBack}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition"
              >
                {isRollingBack ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>در حال بازگردانی...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>تایید و اعمال بازگردانی</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
