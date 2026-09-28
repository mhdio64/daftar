import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import {
  Search,
  X,
  RotateCcw,
  Tag,
  Filter,
  Plus,
  Upload,
  Sliders,
  Server,
  BookOpen,
  Network,
  Check,
  Copy,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { Asset } from '../../services/assets.service';
import { AssetType, FieldDefinition as SchemaFieldDefinition } from '../../services/asset-types.service';
import { AssetIcon } from '../common/AssetIcon';
import { TagBadge } from '../common/TagBadge';
import { SecretCell } from './SecretCell';
import { checkAssetExpiry } from '../../data/sample-assets';
import { useToast } from '../../context/ToastContext';
import type { ParsedRow } from '../../services/excel.service';

const CategoryWikiView = lazy(() =>
  import('../wiki/CategoryWikiView.tsx').then((m) => ({ default: m.CategoryWikiView }))
);
const ExcelImportModal = lazy(() =>
  import('../modals/ExcelImportModal.tsx').then((m) => ({ default: m.ExcelImportModal }))
);

interface AssetGridViewProps {
  activeAssetType: AssetType;
  assets: Asset[];
  isAssetsLoading: boolean;
  visibleFields: SchemaFieldDefinition[];
  assetTypes: AssetType[];
  allOrgAssets: Asset[];
  userRole?: string;
  density: 'compact' | 'comfortable';
  onDensityChange: (d: 'compact' | 'comfortable') => void;
  onSelectAsset: (asset: Asset) => void;
  onAddNewAsset: () => void;
  onBatchImport: (validRows: ParsedRow[]) => Promise<void>;
  onOpenSchemaModal: () => void;
  onChangeTypeIcon: (type: AssetType) => void;
  onUpdateWiki: (typeId: string, newMarkdown: string) => Promise<void>;
}

export const AssetGridView: React.FC<AssetGridViewProps> = ({
  activeAssetType,
  assets,
  isAssetsLoading,
  visibleFields,
  assetTypes,
  allOrgAssets,
  userRole,
  density,
  onDensityChange,
  onSelectAsset,
  onAddNewAsset,
  onBatchImport,
  onOpenSchemaModal,
  onChangeTypeIcon,
  onUpdateWiki,
}) => {
  const { showToast } = useToast();
  const [categoryViewTab, setCategoryViewTab] = useState<'grid' | 'wiki'>('grid');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // استیت‌های فیلتر پیشرفته و سیستم برچسب‌ها
  const [filterSearch, setFilterSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagFilterMode, setTagFilterMode] = useState<'AND' | 'OR'>('OR');
  const [expiryStatusFilter, setExpiryStatusFilter] = useState<'all' | 'has_expiry' | 'urgent' | 'expired'>('all');
  const [copiedCellId, setCopiedCellId] = useState<string | null>(null);

  // ریست فیلترها هنگام تغییر دسته‌بندی فعال
  useEffect(() => {
    setFilterSearch('');
    setSelectedTags([]);
    setExpiryStatusFilter('all');
    setCategoryViewTab('grid');
  }, [activeAssetType.id]);

  // استخراج تمام برچسب‌های موجود در دسته جاری به همراه تعداد
  const availableTagsWithCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of (assets || [])) {
      if (Array.isArray(a.tags)) {
        for (const t of a.tags) {
          const clean = t.trim();
          if (clean) {
            counts.set(clean, (counts.get(clean) || 0) + 1);
          }
        }
      }
    }
    return Array.from(counts.entries()).map(([tag, count]) => ({ tag, count }));
  }, [assets]);

  // دارایی‌های فیلتر شده بر اساس متن، برچسب‌ها و وضعیت سررسید
  const filteredAssets = useMemo(() => {
    return (assets || []).filter((asset) => {
      // ۱. فیلتر متنی (جستجو در عنوان، برچسب‌ها و کلیه فیلدها)
      if (filterSearch.trim()) {
        const q = filterSearch.trim().toLowerCase();
        const titleMatch = (asset.title || '').toLowerCase().includes(q);
        const tagsMatch = (asset.tags || []).some((t: string) => t.toLowerCase().includes(q));
        const valuesMatch = Object.values(asset.values || {}).some((v) =>
          String(v || '').toLowerCase().includes(q)
        );
        if (!titleMatch && !tagsMatch && !valuesMatch) return false;
      }

      // ۲. فیلتر برچسب‌ها
      if (selectedTags.length > 0) {
        const assetTags = (asset.tags || []).map((t: string) => t.toLowerCase());
        if (tagFilterMode === 'AND') {
          const hasAll = selectedTags.every((st) => assetTags.includes(st.toLowerCase()));
          if (!hasAll) return false;
        } else {
          const hasAny = selectedTags.some((st) => assetTags.includes(st.toLowerCase()));
          if (!hasAny) return false;
        }
      }

      // ۳. فیلتر سررسید و انقضا
      if (expiryStatusFilter !== 'all') {
        const status = checkAssetExpiry(asset);
        if (expiryStatusFilter === 'has_expiry' && !status.hasExpiry) return false;
        if (expiryStatusFilter === 'expired' && !status.isExpired) return false;
        if (expiryStatusFilter === 'urgent' && !status.isUrgent) return false;
      }

      return true;
    });
  }, [assets, filterSearch, selectedTags, tagFilterMode, expiryStatusFilter]);

  const activeFiltersCount =
    (filterSearch.trim() ? 1 : 0) +
    selectedTags.length +
    (expiryStatusFilter !== 'all' ? 1 : 0);

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSingleTagFilter = (tag: string) => {
    if (selectedTags.length === 1 && selectedTags[0] === tag) {
      setSelectedTags([]);
      showToast(`فیلتر برچسب «${tag}» غیرفعال شد.`, 'info');
    } else {
      setSelectedTags([tag]);
      showToast(`فیلتر بر اساس برچسب «${tag}» فعال شد.`, 'info');
    }
  };

  const handleClearAllFilters = () => {
    setFilterSearch('');
    setSelectedTags([]);
    setExpiryStatusFilter('all');
    showToast('کلیه فیلترها پاکسازی شدند.', 'info');
  };

  const handleCopy = (text: string, identifier: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedCellId(identifier);
    showToast('کپی در کلیپ‌بورد انجام شد.', 'success');
    setTimeout(() => setCopiedCellId(null), 1500);
  };

  return (
    <>
      {/* نوار ابزار دسته فعال و سوئیچ تب‌ها */}
      <div className="p-6 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              {userRole === 'ADMIN' ? (
                <button
                  type="button"
                  onClick={() => onChangeTypeIcon(activeAssetType)}
                  className="p-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:scale-105 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition shadow-2xs group cursor-pointer"
                  title="کلیک برای تغییر آیکون این نوع دارایی (مدیر سامانه)"
                >
                  <AssetIcon
                    name={activeAssetType.icon || 'Server'}
                    className="w-5 h-5 group-hover:scale-110 transition-transform"
                  />
                </button>
              ) : (
                <span className="text-indigo-600 dark:text-indigo-400">
                  <AssetIcon name={activeAssetType.icon || 'Server'} className="w-5 h-5" />
                </span>
              )}
              <span>{activeAssetType.name}</span>
              {userRole === 'ADMIN' && (
                <button
                  type="button"
                  onClick={() => onChangeTypeIcon(activeAssetType)}
                  className="text-xs font-normal text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                  title="تغییر آیکون این نوع دارایی"
                >
                  (تغییر آیکون)
                </button>
              )}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {activeAssetType.description || 'مدیریت دارایی‌ها، دسترسی‌ها و مستندات این دسته‌بندی'}
            </p>
          </div>

          {categoryViewTab === 'grid' && (
            <div className="flex items-center gap-2.5">
              {/* سوئیچ تراکم جدول */}
              <div className="bg-slate-100 dark:bg-surface-2 border border-slate-200 dark:border-border-strong rounded-lg p-0.5 flex text-xs shadow-2xs">
                <button
                  type="button"
                  onClick={() => onDensityChange('compact')}
                  className={`px-3 py-1 rounded-md transition font-medium text-xs ${
                    density === 'compact'
                      ? 'bg-white text-indigo-700 shadow-xs dark:bg-indigo-600 dark:text-white font-semibold'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                  title="نمایش فشرده با تراکم بالا (مشاهده بیشترین تعداد ردیف در صفحه)"
                >
                  فشرده
                </button>
                <button
                  type="button"
                  onClick={() => onDensityChange('comfortable')}
                  className={`px-3 py-1 rounded-md transition font-medium text-xs ${
                    density === 'comfortable'
                      ? 'bg-white text-indigo-700 shadow-xs dark:bg-indigo-600 dark:text-white font-semibold'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                  title="نمایش عادی با فضای تنفسی بیشتر و ارتفاع باز ردیف‌ها"
                >
                  عادی
                </button>
              </div>


              {(userRole === 'ADMIN' || userRole === 'EDITOR') && (
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-border-strong bg-white dark:bg-surface-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-surface-elevated hover:text-slate-900 dark:hover:text-white transition shadow-2xs"
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>ورود از اکسل</span>
                </button>
              )}

              {userRole === 'ADMIN' && (
                <button
                  onClick={onOpenSchemaModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-border-strong bg-white dark:bg-surface-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-surface-elevated hover:text-slate-900 dark:hover:text-white transition shadow-2xs"
                >
                  <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>تنظیم فیلدها ({activeAssetType.schemaDefinition?.length || 0})</span>
                </button>
              )}

              {(userRole === 'ADMIN' || userRole === 'EDITOR') && (
                <button
                  onClick={onAddNewAsset}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-medium text-white shadow-xs shadow-indigo-600/20 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>افزودن دارایی جدید</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* سوئیچر تب‌های درون دسته: دارایی‌ها و ویکی */}
        <div className="flex border-b border-slate-200 dark:border-border-subtle text-xs gap-6 -mb-px">
          <button
            type="button"
            onClick={() => setCategoryViewTab('grid')}
            className={`pb-3 font-bold transition border-b-2 flex items-center gap-2 ${
              categoryViewTab === 'grid'
                ? 'text-indigo-600 border-indigo-600 dark:text-indigo-400 dark:border-indigo-500'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border-transparent'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>دارایی‌ها و رکوردهای ثبت‌شده</span>
            <span
              className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold ${
                categoryViewTab === 'grid'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                  : 'bg-slate-100 dark:bg-surface-2 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-border-strong'
              }`}
            >
              {assets.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryViewTab('wiki')}
            className={`pb-3 font-bold transition border-b-2 flex items-center gap-2 ${
              categoryViewTab === 'wiki'
                ? 'text-indigo-600 border-indigo-600 dark:text-indigo-400 dark:border-indigo-500'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border-transparent'
            }`}
          >
            <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>ویکی و مستندات جامع دسته</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200/60 dark:border-indigo-500/30">
              Wiki
            </span>
          </button>
        </div>
      </div>

      {categoryViewTab === 'grid' ? (
        /* جدول داده اکسل‌گونه پویا به همراه نوار فیلتر پیشرفته */
        <div className="flex-1 px-6 pb-6 overflow-auto pt-3 flex flex-col min-h-0">
          {/* نوار فیلترهای پیشرفته و برچسب‌ها */}
          <div className="mb-3 bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-xl p-3 shadow-2xs space-y-2.5 shrink-0">
            {/* ردیف اول: جستجوی متنی زنده، فیلتر وضعیت سررسید، دکمه پاکسازی، و آمار */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-lg">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    placeholder="جستجو در عنوان دارایی، فیلدها و برچسب‌ها..."
                    className="w-full bg-slate-50 dark:bg-surface-2 border border-slate-200 dark:border-border-strong rounded-lg pr-9 pl-8 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition"
                  />
                  {filterSearch && (
                    <button
                      onClick={() => setFilterSearch('')}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-surface-elevated text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                      title="پاک کردن متن جستجو"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* فیلتر وضعیت سررسید */}
                <select
                  value={expiryStatusFilter}
                  onChange={(e) => setExpiryStatusFilter(e.target.value as any)}
                  className="bg-slate-50 dark:bg-surface-2 border border-slate-200 dark:border-border-strong rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition cursor-pointer font-medium"
                >
                  <option value="all">همه وضعیت‌ها</option>
                  <option value="has_expiry">📅 دارای سررسید</option>
                  <option value="urgent">⚠️ تمدید فوری (&lt; ۳۰ روز)</option>
                  <option value="expired">🚨 منقضی‌شده</option>
                </select>
              </div>

              {/* بخش آمار نتایج و دکمه پاکسازی فیلترها */}
              <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  نمایش{' '}
                  <strong className="text-slate-900 dark:text-white font-mono font-bold">
                    {filteredAssets.length}
                  </strong>{' '}
                  از <span className="font-mono">{assets.length}</span> رکورد
                </span>

                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllFilters}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 text-[11px] font-semibold transition shadow-2xs"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>پاکسازی فیلترها ({activeFiltersCount})</span>
                  </button>
                )}
              </div>
            </div>

            {/* ردیف دوم: چیپ‌های برچسب موجود در دسته جاری با شمارنده و سوئیچ AND/OR */}
            {availableTagsWithCount.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-border-subtle flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center flex-wrap gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 ml-1">
                    <Tag className="w-3 h-3 text-indigo-500" />
                    <span>برچسب‌ها:</span>
                  </span>

                  {/* دکمه همه برچسب‌ها */}
                  <button
                    type="button"
                    onClick={() => setSelectedTags([])}
                    className={`text-[11px] px-2.5 py-0.5 rounded-md font-medium border transition ${
                      selectedTags.length === 0
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-semibold'
                        : 'bg-slate-50 dark:bg-surface-2 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-border-strong hover:bg-slate-100 dark:hover:bg-surface-elevated'
                    }`}
                  >
                    همه ({assets.length})
                  </button>

                  {/* چیپ‌های تک‌تک برچسب‌ها */}
                  {availableTagsWithCount.map(({ tag, count }) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <TagBadge
                        key={tag}
                        tag={tag}
                        count={count}
                        isSelected={isSelected}
                        onClick={() => handleToggleTag(tag)}
                        className="cursor-pointer"
                      />
                    );
                  })}
                </div>

                {/* سوئیچ منطق AND / OR هنگام انتخاب چند برچسب */}
                {selectedTags.length > 1 && (
                  <div className="flex items-center gap-1 text-[10px] bg-slate-100 dark:bg-surface-2 p-0.5 rounded-lg border border-slate-200 dark:border-border-strong animate-in fade-in">
                    <span className="text-slate-500 px-1.5 font-medium">منطق فیلتر:</span>
                    <button
                      type="button"
                      onClick={() => setTagFilterMode('OR')}
                      className={`px-2 py-0.5 rounded font-semibold transition ${
                        tagFilterMode === 'OR'
                          ? 'bg-white dark:bg-surface-elevated text-indigo-700 dark:text-indigo-300 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      یا (OR)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTagFilterMode('AND')}
                      className={`px-2 py-0.5 rounded font-semibold transition ${
                        tagFilterMode === 'AND'
                          ? 'bg-white dark:bg-surface-elevated text-indigo-700 dark:text-indigo-300 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      و (AND)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* جدول داده اکسل‌گونه */}
          <div className="border border-slate-200 dark:border-border-strong rounded-xl bg-white dark:bg-surface-1 overflow-hidden shadow-xs flex-1">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr
                  className={`border-b border-slate-200 dark:border-border-strong bg-slate-50/90 dark:bg-surface-2/60 text-slate-700 dark:text-slate-300 font-semibold transition-all ${
                    density === 'compact' ? 'text-[11px]' : 'text-xs'
                  }`}
                >
                  <th className={`${density === 'compact' ? 'py-2 px-3' : 'py-3.5 px-4'} w-12 text-center`}>#</th>
                  <th className={density === 'compact' ? 'py-2 px-3' : 'py-3.5 px-4'}>عنوان دارایی</th>

                  {/* رندر ستون‌های داینامیک انتخاب‌شده توسط کاربر */}
                  {visibleFields.map((field) => (
                    <th key={field.id} className={density === 'compact' ? 'py-2 px-3' : 'py-3.5 px-4'}>
                      {field.label}
                    </th>
                  ))}

                  <th className={`${density === 'compact' ? 'py-2 px-3' : 'py-3.5 px-4'} w-16 text-center`}>جزئیات</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y divide-slate-200/80 dark:divide-border-subtle ${
                  density === 'compact' ? 'text-[11px]' : 'text-xs'
                }`}
              >
                {isAssetsLoading ? (
                  <tr>
                    <td
                      colSpan={visibleFields.length + 3}
                      className="p-8 text-center text-slate-500 dark:text-slate-400"
                    >
                      در حال بارگذاری اطلاعات دارایی‌ها...
                    </td>
                  </tr>
                ) : filteredAssets.length > 0 ? (
                  filteredAssets.map((asset, index) => {
                    const cellPadding = density === 'compact' ? 'py-1.5 px-3' : 'py-3.5 px-4';
                    return (
                      <tr
                        key={asset.id}
                        onClick={() => onSelectAsset(asset)}
                        className={`hover:bg-slate-50/90 dark:hover:bg-surface-2/60 transition-all cursor-pointer ${
                          density === 'compact' ? 'min-h-[40px]' : 'h-14'
                        }`}
                      >
                        <td className={`${cellPadding} text-center text-slate-400 dark:text-slate-500 font-mono`}>
                          {index + 1}
                        </td>

                        {/* ستون عنوان اصلی و برچسب‌های رنگی سطر */}
                        <td className={`${cellPadding} font-semibold text-slate-900 dark:text-slate-100`}>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-surface-2 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-border-strong">
                                <AssetIcon
                                  name={asset.icon || activeAssetType?.icon || 'Server'}
                                  className="w-3.5 h-3.5"
                                />
                              </div>
                              <span>{asset.title}</span>
                              {(() => {
                                const rels = (asset.values as any)?.__relations || asset.relations;
                                const count = Array.isArray(rels) ? rels.length : 0;
                                if (count === 0) return null;
                                return (
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                                    title={`${count} ارتباط و وابستگی ثبت‌شده`}
                                  >
                                    <Network className="w-2.5 h-2.5" />
                                    <span>{count}</span>
                                  </span>
                                );
                              })()}
                            </div>
                            {asset.tags && asset.tags.length > 0 && (
                              <div className="flex items-center flex-wrap gap-1">
                                {(asset.tags as string[]).map((t: string) => (
                                  <TagBadge
                                    key={t}
                                    tag={t}
                                    size="xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSingleTagFilter(t);
                                    }}
                                    isSelected={selectedTags.includes(t)}
                                    title={`کلیک برای فیلتر بر اساس «${t}»`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* سلول‌های مقادیر بر اساس ستون‌های انتخابی */}
                        {visibleFields.map((field) => {
                          const val = asset.values?.[field.name];
                          const cellId = `${asset.id}-${field.name}`;
                          const isCopyable = Boolean(field.isCopyable);

                          if (field.type === 'secret') {
                            return (
                              <td key={field.id} className={cellPadding}>
                                <SecretCell assetId={asset.id} fieldKey={field.name} />
                              </td>
                            );
                          }

                          if (field.type === 'ip_port') {
                            return (
                              <td key={field.id} className={cellPadding}>
                                {val ? (
                                  <div className="inline-flex items-center gap-1.5">
                                    {isCopyable && (
                                      <button
                                        onClick={(e) => handleCopy(String(val), cellId, e)}
                                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-surface-elevated text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition shrink-0"
                                        title={`کپی ${field.label}`}
                                      >
                                        {copiedCellId === cellId ? (
                                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                        ) : (
                                          <Copy className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
                                        )}
                                      </button>
                                    )}
                                    <span
                                      dir="ltr"
                                      className={`font-mono font-medium rounded bg-slate-100 text-slate-800 border border-slate-200/90 dark:bg-surface-2 dark:text-indigo-300 dark:border-border-strong ${
                                        density === 'compact' ? 'text-[11px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1'
                                      }`}
                                    >
                                      {val}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-600">—</span>
                                )}
                              </td>
                            );
                          }

                          if (field.type === 'email') {
                            return (
                              <td key={field.id} className={cellPadding}>
                                {val ? (
                                  <div className="inline-flex items-center gap-1.5" dir="ltr">
                                    {isCopyable && (
                                      <button
                                        onClick={(e) => handleCopy(String(val), cellId, e)}
                                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-surface-elevated text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition shrink-0"
                                        title={`کپی ${field.label}`}
                                      >
                                        {copiedCellId === cellId ? (
                                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                        ) : (
                                          <Copy className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
                                        )}
                                      </button>
                                    )}
                                    <a
                                      href={`mailto:${val}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className={`inline-flex items-center gap-1 text-indigo-600 dark:text-cyan-400 hover:underline font-mono ${
                                        density === 'compact' ? 'text-[11px]' : 'text-xs'
                                      }`}
                                      title={`ارسال ایمیل به ${val}`}
                                    >
                                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <span>{val}</span>
                                    </a>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-600">—</span>
                                )}
                              </td>
                            );
                          }

                          if (field.type === 'jalali_date') {
                            return (
                              <td key={field.id} className={cellPadding}>
                                {val ? (
                                  <div className="inline-flex items-center gap-1.5">
                                    {isCopyable && (
                                      <button
                                        onClick={(e) => handleCopy(String(val), cellId, e)}
                                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-surface-elevated text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition shrink-0"
                                        title={`کپی ${field.label}`}
                                      >
                                        {copiedCellId === cellId ? (
                                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                        ) : (
                                          <Copy className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
                                        )}
                                      </button>
                                    )}
                                    <span
                                      className={`inline-flex items-center rounded-md font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30 ${
                                        density === 'compact' ? 'text-[10px] px-1.5 py-0.5' : 'text-[11px] px-2.5 py-1'
                                      }`}
                                    >
                                      {val}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-600">—</span>
                                )}
                              </td>
                            );
                          }

                          return (
                            <td key={field.id} className={`${cellPadding} text-slate-700 dark:text-slate-300`}>
                              {val ? (
                                <div className="inline-flex items-center gap-1.5 max-w-full">
                                  {isCopyable && (
                                    <button
                                      onClick={(e) => handleCopy(String(val), cellId, e)}
                                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-surface-elevated text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition shrink-0"
                                      title={`کپی ${field.label}`}
                                    >
                                      {copiedCellId === cellId ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
                                      )}
                                    </button>
                                  )}
                                  <span className="truncate">{val}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-600">—</span>
                              )}
                            </td>
                          );
                        })}

                        <td className={`${cellPadding} text-center`}>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 inline" />
                        </td>
                      </tr>
                    );
                  })
                ) : assets.length > 0 ? (
                  /* وضعیت زمانی که دارایی وجود دارد اما با فیلترها تطابق ندارد */
                  <tr>
                    <td
                      colSpan={visibleFields.length + 3}
                      className="p-12 text-center text-slate-500 dark:text-slate-400"
                    >
                      <div className="max-w-xs mx-auto space-y-2">
                        <Filter className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          دارایی‌ای مطابق با فیلترهای انتخابی یافت نشد
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          لطفاً عبارت جستجو را تغییر دهید یا فیلترهای برچسب را پاکسازی کنید.
                        </p>
                        <button
                          onClick={handleClearAllFilters}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-600/20 dark:hover:bg-indigo-600/30 dark:text-indigo-300 text-xs font-semibold border border-indigo-200 dark:border-indigo-500/30 transition shadow-2xs"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>پاکسازی فیلترها</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  /* وضعیت عدم وجود هرگونه دارایی در دسته */
                  <tr>
                    <td
                      colSpan={visibleFields.length + 3}
                      className="p-12 text-center text-slate-500 dark:text-slate-400"
                    >
                      <div className="max-w-xs mx-auto space-y-3">
                        <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                          هنوز هیچ دارایی در دسته «{activeAssetType.name}» ثبت نشده است.
                        </div>
                        {(userRole === 'ADMIN' || userRole === 'EDITOR') && (
                          <div className="flex items-center justify-center gap-2 pt-1">
                            <button
                              onClick={onAddNewAsset}
                              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs shadow-indigo-600/20 transition"
                            >
                              ثبت اولین {activeAssetType.name}
                            </button>
                            <button
                              onClick={() => setIsImportModalOpen(true)}
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-border-strong bg-white dark:bg-surface-2 hover:bg-slate-50 dark:hover:bg-surface-elevated text-xs font-semibold text-slate-700 dark:text-slate-200 transition shadow-2xs"
                            >
                              <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>بارگذاری از اکسل</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* تب ویکی و مستندات مارکداون در سطح دسته */
        <Suspense
          fallback={
            <div className="p-12 text-center text-xs text-slate-400">در حال بارگذاری مستندات...</div>
          }
        >
          <CategoryWikiView
            assetType={activeAssetType}
            onUpdateWiki={(updatedMarkdown) => onUpdateWiki(activeAssetType.id, updatedMarkdown)}
          />
        </Suspense>
      )}

      <Suspense fallback={null}>
        {isImportModalOpen && (
          <ExcelImportModal
            isOpen={isImportModalOpen}
            assetType={activeAssetType}
            onClose={() => setIsImportModalOpen(false)}
            onImport={onBatchImport}
          />
        )}
      </Suspense>
    </>
  );
};
