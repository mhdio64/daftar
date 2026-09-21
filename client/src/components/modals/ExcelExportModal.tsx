import React, { useState } from 'react';
import { X, Download, FileSpreadsheet, Filter, Folder, Building2, Shield, Check, Calendar, Tag } from 'lucide-react';
import { AssetType } from '../../services/asset-types.service.ts';
import { Asset } from '../../services/assets.service.ts';
import { exportCustomAssetsToExcel, exportComprehensiveFinancialExcel } from '../../services/excel.service.ts';
import { useToast } from '../../context/ToastContext.tsx';

interface ExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeAssetType?: AssetType;
  currentAssets: Asset[];
  filteredAssets: Asset[];
  assetTypes: AssetType[];
  allOrgAssets: Asset[];
}

export function ExcelExportModal({
  isOpen,
  onClose,
  activeAssetType,
  currentAssets,
  filteredAssets,
  assetTypes,
  allOrgAssets,
}: ExcelExportModalProps) {
  const { showToast } = useToast();

  const [exportScope, setExportScope] = useState<'filtered' | 'category_all' | 'organization_all'>(
    filteredAssets.length !== currentAssets.length ? 'filtered' : 'category_all'
  );
  const [maskSecrets, setMaskSecrets] = useState(true);
  const [includeTags, setIncludeTags] = useState(true);
  const [includeDates, setIncludeDates] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleDownload = () => {
    setIsExporting(true);
    try {
      if (exportScope === 'filtered') {
        if (!activeAssetType) throw new Error('دسته‌بندی فعلی نامشخص است.');
        if (filteredAssets.length === 0) throw new Error('سطری در فیلتر جاری وجود ندارد.');
        exportCustomAssetsToExcel(activeAssetType, filteredAssets, {
          includeSecrets: !maskSecrets,
          includeTags,
          includeDates,
          scopeLabel: 'فیلترشده',
        });
        showToast(`خروجی اکسل (${filteredAssets.length} سطر فیلترشده) با موفقیت دانلود شد.`, 'success');
      } else if (exportScope === 'category_all') {
        if (!activeAssetType) throw new Error('دسته‌بندی فعلی نامشخص است.');
        if (currentAssets.length === 0) throw new Error('هیچ دارایی در این دسته ثبت نشده است.');
        exportCustomAssetsToExcel(activeAssetType, currentAssets, {
          includeSecrets: !maskSecrets,
          includeTags,
          includeDates,
          scopeLabel: 'کل_دسته',
        });
        showToast(`خروجی اکسل کل دسته «${activeAssetType.name}» با موفقیت دانلود شد.`, 'success');
      } else {
        if (allOrgAssets.length === 0) throw new Error('هیچ دارایی در سامانه ثبت نشده است.');
        exportComprehensiveFinancialExcel(assetTypes, allOrgAssets, {
          includeSecrets: !maskSecrets,
          includeTags,
          includeDates,
        });
        showToast('کتابچه جامع مالی و حسابداری سازمان (چند شیتی) با موفقیت صادر شد.', 'success');
      }
      onClose();
    } catch (err: any) {
      showToast(err.message || 'خطا در ایجاد فایل اکسل', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white dark:bg-surface-1 rounded-2xl border border-slate-200 dark:border-border-strong shadow-2xl overflow-hidden flex flex-col text-right animate-in zoom-in-95 duration-150"
      >
        {/* هدر مودال */}
        <div className="p-5 border-b border-slate-200 dark:border-border-subtle bg-slate-50/70 dark:bg-surface-2/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                خروجی اکسل و گزارش‌های تحلیلی
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                صدور فایل استاندارد (.xlsx) مناسب واحدهای مالی، حسابداری و حسابرسی
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-surface-2 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* بدنه مودال */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
          {/* بخش اول: انتخاب دامنه گزارش */}
          <div>
            <label className="font-bold text-slate-800 dark:text-slate-200 block mb-2">
              ۱. محدوده و دامنه داده‌های گزارش
            </label>
            <div className="grid grid-cols-1 gap-2.5">
              {/* گزینه ۱: سطرهای فیلترشده */}
              <div
                onClick={() => setExportScope('filtered')}
                className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                  exportScope === 'filtered'
                    ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 dark:bg-emerald-500/10 dark:border-emerald-500/50 dark:text-emerald-300 ring-1 ring-emerald-500/30'
                    : 'bg-white dark:bg-surface-2 border-slate-200 dark:border-border-subtle hover:border-slate-300 dark:hover:border-border-strong text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Filter className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-xs">سطرهای فیلترشده جاری</div>
                    <div className="text-[11px] opacity-75">
                      فقط ردیف‌های منطبق با جستجو و برچسب‌های فعال
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white dark:bg-surface-1 border border-emerald-200 dark:border-emerald-500/30">
                  {filteredAssets.length} دارایی
                </span>
              </div>

              {/* گزینه ۲: کل دسته جاری */}
              <div
                onClick={() => setExportScope('category_all')}
                className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                  exportScope === 'category_all'
                    ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 dark:bg-emerald-500/10 dark:border-emerald-500/50 dark:text-emerald-300 ring-1 ring-emerald-500/30'
                    : 'bg-white dark:bg-surface-2 border-slate-200 dark:border-border-subtle hover:border-slate-300 dark:hover:border-border-strong text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Folder className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-xs">
                      کلیه دارایی‌های دسته «{activeAssetType?.name || 'جاری'}»
                    </div>
                    <div className="text-[11px] opacity-75">
                      تمامی رکوردهای این دسته‌بندی با ستون‌ها و مشخصات فنی
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong">
                  {currentAssets.length} دارایی
                </span>
              </div>

              {/* گزینه ۳: گزارش جامع کل سازمان */}
              <div
                onClick={() => setExportScope('organization_all')}
                className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                  exportScope === 'organization_all'
                    ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 dark:bg-emerald-500/10 dark:border-emerald-500/50 dark:text-emerald-300 ring-1 ring-emerald-500/30'
                    : 'bg-white dark:bg-surface-2 border-slate-200 dark:border-border-subtle hover:border-slate-300 dark:hover:border-border-strong text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-xs flex items-center gap-1.5">
                      <span>کتابچه جامع مالی و سازمانی (Multi-Sheet)</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        پیشنهادی مالی
                      </span>
                    </div>
                    <div className="text-[11px] opacity-75">
                      شامل شیت خلاصه مدیریتی/مالی + شیت مستقل برای هر دسته
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong">
                  {allOrgAssets.length} دارایی ({assetTypes.length} دسته)
                </span>
              </div>
            </div>
          </div>

          {/* بخش دوم: تنظیمات محتوا و امنیت */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-surface-2/60 border border-slate-200 dark:border-border-subtle space-y-2.5">
            <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
              ۲. تنظیمات امنیت و فیلدهای خروجی
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={maskSecrets}
                onChange={(e) => setMaskSecrets(e.target.checked)}
                className="rounded border-slate-300 dark:border-border-strong bg-white dark:bg-surface-2 text-emerald-600 focus:ring-0 w-4 h-4"
              />
              <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>
                <strong>ماسک‌سازی رمزهای عبور و اطلاعات محرمانه (••••••••)</strong> — ویژه ارائه به حسابداری و پرسنل غیر فنی
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={includeTags}
                onChange={(e) => setIncludeTags(e.target.checked)}
                className="rounded border-slate-300 dark:border-border-strong bg-white dark:bg-surface-2 text-emerald-600 focus:ring-0 w-4 h-4"
              />
              <Tag className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>درج ستون برچسب‌ها و تگ‌های سازمانی (Labels & Tags)</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={includeDates}
                onChange={(e) => setIncludeDates(e.target.checked)}
                className="rounded border-slate-300 dark:border-border-strong bg-white dark:bg-surface-2 text-emerald-600 focus:ring-0 w-4 h-4"
              />
              <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>درج ستون تاریخ ثبت و سررسید انقضا/تمدید شمسی</span>
            </label>
          </div>
        </div>

        {/* فوتر مودال */}
        <div className="p-4 border-t border-slate-200 dark:border-border-subtle bg-slate-50/70 dark:bg-surface-2/40 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-border-strong text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-elevated transition"
          >
            انصراف
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isExporting}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-sm shadow-emerald-600/30 flex items-center gap-2 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'در حال آماده‌سازی...' : 'دانلود فایل اکسل (.xlsx)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
