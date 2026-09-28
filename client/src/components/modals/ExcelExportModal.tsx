import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  Filter,
  Folder,
  Building2,
  Shield,
  Calendar,
  Tag,
  Sparkles,
  Layers,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { AssetType } from '../../services/asset-types.service.ts';
import { Asset } from '../../services/assets.service.ts';
import {
  exportCustomAssetsToExcel,
  exportComprehensiveFinancialExcel,
  fetchAllOrgAssets,
} from '../../services/excel.service.ts';
import { useToast } from '../../context/ToastContext.tsx';

interface ExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeAssetType?: AssetType;
  currentAssets: Asset[];
  filteredAssets: Asset[];
  assetTypes: AssetType[];
  allOrgAssets?: Asset[];
}

export function ExcelExportModal({
  isOpen,
  onClose,
  activeAssetType,
  currentAssets,
  filteredAssets,
  assetTypes,
  allOrgAssets = [],
}: ExcelExportModalProps) {
  const { showToast } = useToast();

  const [exportScope, setExportScope] = useState<'organization_all' | 'category_all' | 'filtered'>('organization_all');
  const [maskSecrets, setMaskSecrets] = useState(true);
  const [includeTags, setIncludeTags] = useState(true);
  const [includeDates, setIncludeDates] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [orgAssetsList, setOrgAssetsList] = useState<Asset[]>(allOrgAssets);
  const [isLoadingOrgAssets, setIsLoadingOrgAssets] = useState(false);

  // واکشی کامل دارایی‌های کل سازمان در صورت نیاز
  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      setIsLoadingOrgAssets(true);
      fetchAllOrgAssets(assetTypes)
        .then((items) => {
          if (isMounted && items && items.length > 0) {
            setOrgAssetsList(items);
          }
        })
        .finally(() => {
          if (isMounted) setIsLoadingOrgAssets(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, assetTypes]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      if (exportScope === 'organization_all') {
        const finalAssets = orgAssetsList.length > 0 ? orgAssetsList : await fetchAllOrgAssets(assetTypes);
        if (finalAssets.length === 0) {
          throw new Error('هیچ دارایی در سامانه ثبت نشده است.');
        }

        exportComprehensiveFinancialExcel(assetTypes, finalAssets, {
          includeSecrets: !maskSecrets,
          includeTags,
          includeDates,
        });

        showToast(
          `کتابچه چند شیتی کل سازمان (${finalAssets.length} دارایی در ${assetTypes.length} شیت تفکیکی) با استایل رسمی صادر شد.`,
          'success'
        );
      } else if (exportScope === 'category_all') {
        if (!activeAssetType) throw new Error('دسته‌بندی فعلی مشخص نیست.');
        if (currentAssets.length === 0) throw new Error('هیچ دارایی در این دسته ثبت نشده است.');

        exportCustomAssetsToExcel(activeAssetType, currentAssets, {
          includeSecrets: !maskSecrets,
          includeTags,
          includeDates,
          scopeLabel: 'کل_دسته',
        });

        showToast(`خروجی اکسل آراسته دسته «${activeAssetType.name}» با موفقیت دانلود شد.`, 'success');
      } else {
        if (!activeAssetType) throw new Error('دسته‌بندی فعلی مشخص نیست.');
        if (filteredAssets.length === 0) throw new Error('سطری در فیلتر جاری وجود ندارد.');

        exportCustomAssetsToExcel(activeAssetType, filteredAssets, {
          includeSecrets: !maskSecrets,
          includeTags,
          includeDates,
          scopeLabel: 'فیلترشده',
        });

        showToast(`خروجی اکسل (${filteredAssets.length} سطر فیلترشده) با موفقیت دانلود شد.`, 'success');
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
        {/* هدر مدال */}
        <div className="p-5 border-b border-slate-200 dark:border-border-subtle bg-linear-to-r from-indigo-50/70 via-slate-50 to-emerald-50/50 dark:from-indigo-950/20 dark:via-surface-2/40 dark:to-emerald-950/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  خروجی اکسل هوشمند و گزارش چند شیتی
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  استایل گرافیکی + RTL
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                صدور فایل استاندارد (.xlsx) با تفکیک شیت برای هر دارایی و رنگ‌بندی رسمی سازمانی
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

        {/* بدنه مدال */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
          {/* بخش اول: انتخاب دامنه گزارش */}
          <div>
            <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between mb-2.5">
              <span>۱. دامنه و نوع خروجی فایل اکسل:</span>
              <span className="text-[11px] text-slate-400 font-normal">
                {assetTypes.length} دسته فعال در سامانه
              </span>
            </label>

            <div className="grid grid-cols-1 gap-2.5">
              {/* گزینه ۱ (پیشنهادی): گزارش جامع کل سازمان چند شیتی */}
              <div
                onClick={() => setExportScope('organization_all')}
                className={`p-3.5 rounded-xl border cursor-pointer transition relative overflow-hidden ${
                  exportScope === 'organization_all'
                    ? 'bg-linear-to-br from-indigo-50/90 to-purple-50/50 border-indigo-500 text-indigo-950 dark:from-indigo-950/40 dark:to-purple-950/20 dark:border-indigo-500/60 dark:text-indigo-200 ring-2 ring-indigo-500/25 shadow-xs'
                    : 'bg-white dark:bg-surface-2 border-slate-200 dark:border-border-subtle hover:border-slate-300 dark:hover:border-border-strong text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                      exportScope === 'organization_all'
                        ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/30'
                        : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                    }`}>
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs">
                          کتابچه جامع کل سازمان (Multi-Sheet Comprehensive)
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/40">
                          پیشنهادی امور مالی و مدیران
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                        کل دیتای سازمان در یک فایل واحد: <strong>یک شیت داشبورد کلان و خلاصه مالی</strong> + <strong>یک شیت اختصاصی و مستقل برای هر دسته دارایی</strong> (سرورها، دامنه‌ها، نرم‌افزارها، دیتابیس‌ها و...).
                      </p>

                      {/* ویژگی‌های این خروجی */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        <span className="px-2 py-0.5 rounded-md bg-white/80 dark:bg-surface-1 border border-indigo-200 dark:border-indigo-800/40 text-[10.5px] text-indigo-700 dark:text-indigo-300 flex items-center gap-1 font-medium">
                          <Layers className="w-3 h-3 text-indigo-500" />
                          شیت مستقل برای هر دسته
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white/80 dark:bg-surface-1 border border-indigo-200 dark:border-indigo-800/40 text-[10.5px] text-indigo-700 dark:text-indigo-300 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          رنگ‌بندی رسمی و راست‌به‌چپ (RTL)
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white/80 dark:bg-surface-1 border border-indigo-200 dark:border-indigo-800/40 text-[10.5px] text-indigo-700 dark:text-indigo-300 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          محاسبه هزینه‌ها و اقلام سررسید
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-surface-1 border border-indigo-200 dark:border-indigo-800/50 text-indigo-800 dark:text-indigo-200 shadow-2xs block">
                      {isLoadingOrgAssets ? (
                        <span className="flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          شمارش...
                        </span>
                      ) : (
                        `${orgAssetsList.length} دارایی`
                      )}
                    </span>
                    <span className="text-[10px] text-slate-400 block text-center mt-1">
                      {assetTypes.length} شیت
                    </span>
                  </div>
                </div>
              </div>

              {/* گزینه ۲: کل دسته جاری */}
              <div
                onClick={() => setExportScope('category_all')}
                className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                  exportScope === 'category_all'
                    ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 dark:bg-emerald-500/10 dark:border-emerald-500/50 dark:text-emerald-300 ring-2 ring-emerald-500/25'
                    : 'bg-white dark:bg-surface-2 border-slate-200 dark:border-border-subtle hover:border-slate-300 dark:hover:border-border-strong text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${
                    exportScope === 'category_all'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    <Folder className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs">
                      فقط دارایی‌های دسته «{activeAssetType?.name || 'جاری'}»
                    </div>
                    <div className="text-[11px] opacity-75">
                      یک فایل تک‌شیتی شامل تمامی مشخصات، فیلدهای فنی و برچسب‌های این دسته
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong">
                  {currentAssets.length} دارایی
                </span>
              </div>

              {/* گزینه ۳: سطرهای فیلترشده */}
              <div
                onClick={() => setExportScope('filtered')}
                className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                  exportScope === 'filtered'
                    ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 dark:bg-emerald-500/10 dark:border-emerald-500/50 dark:text-emerald-300 ring-2 ring-emerald-500/25'
                    : 'bg-white dark:bg-surface-2 border-slate-200 dark:border-border-subtle hover:border-slate-300 dark:hover:border-border-strong text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${
                    exportScope === 'filtered'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-surface-elevated text-slate-600 dark:text-slate-400'
                  }`}>
                    <Filter className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs">سطرهای فیلترشده جاری جدول</div>
                    <div className="text-[11px] opacity-75">
                      فقط ردیف‌های منطبق با عبارت جستجو و برچسب‌های انتخاب‌شده
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong">
                  {filteredAssets.length} دارایی
                </span>
              </div>
            </div>
          </div>

          {/* بخش دوم: پیش‌نمایش شیت‌های تولیدی */}
          {exportScope === 'organization_all' && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-2/40 border border-slate-200/80 dark:border-border-subtle">
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-500" />
                <span>شیت‌های اختصاصی که در فایل اکسل ایجاد خواهند شد:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 font-bold text-[10.5px] border border-indigo-200 dark:border-indigo-800">
                  📊 خلاصه کل سازمان
                </span>
                {assetTypes.map((type) => {
                  const count = orgAssetsList.filter((a) => a.assetTypeId === type.id).length;
                  return (
                    <span
                      key={type.id}
                      className="px-2 py-0.5 rounded-md bg-white dark:bg-surface-1 text-slate-700 dark:text-slate-300 text-[10.5px] border border-slate-200 dark:border-border-strong flex items-center gap-1"
                    >
                      <span>{type.name}</span>
                      <span className="text-[9.5px] text-slate-400 font-bold">({count})</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* بخش سوم: تنظیمات امنیت و فیلدها */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-surface-2/60 border border-slate-200 dark:border-border-subtle space-y-2.5">
            <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
              ۲. تنظیمات امنیت و محتوای خروجی
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={maskSecrets}
                onChange={(e) => setMaskSecrets(e.target.checked)}
                className="rounded border-slate-300 dark:border-border-strong bg-white dark:bg-surface-2 text-indigo-600 focus:ring-0 w-4 h-4"
              />
              <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>
                <strong>ماسک‌سازی رمزهای عبور و اطلاعات محرمانه (••••••••)</strong> — ویژه ارائه به حسابداری و پرسنل عمومی
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={includeTags}
                onChange={(e) => setIncludeTags(e.target.checked)}
                className="rounded border-slate-300 dark:border-border-strong bg-white dark:bg-surface-2 text-indigo-600 focus:ring-0 w-4 h-4"
              />
              <Tag className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>درج ستون برچسب‌ها و تگ‌های سازمانی (Labels & Tags)</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={includeDates}
                onChange={(e) => setIncludeDates(e.target.checked)}
                className="rounded border-slate-300 dark:border-border-strong bg-white dark:bg-surface-2 text-indigo-600 focus:ring-0 w-4 h-4"
              />
              <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>درج تاریخ ثبت، تاریخ سررسید تمدید شمسی و برچسب وضعیت اعتبار</span>
            </label>
          </div>
        </div>

        {/* فوتر مدال */}
        <div className="p-4 border-t border-slate-200 dark:border-border-subtle bg-slate-50/70 dark:bg-surface-2/40 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-border-strong text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-elevated transition"
          >
            انصراف
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isExporting}
            className="px-5 py-2.5 rounded-xl bg-linear-to-r from-indigo-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 text-xs font-bold text-white shadow-md shadow-indigo-600/25 flex items-center gap-2 transition disabled:opacity-50 active:scale-98"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>در حال آماده‌سازی و استایل‌دهی شیت‌ها...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>
                  {exportScope === 'organization_all'
                    ? `دانلود کارنامه جامع سازمان (${assetTypes.length} شیت تفکیکی)`
                    : 'دانلود فایل اکسل (.xlsx)'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
