import React, { useState, useMemo } from 'react';
import { X, Search, Check, RotateCcw, Sparkles } from 'lucide-react';
import { ASSET_ICONS, AssetIcon, AssetIconItem } from './AssetIcon.tsx';

interface IconPickerModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  currentIcon?: string | null;
  defaultCategoryIcon?: string;
  showResetToDefault?: boolean;
  onSelect: (iconName: string | null) => void;
  onClose: () => void;
}

const CATEGORIES = [
  { id: 'all', label: 'همه آیکون‌ها' },
  { id: 'servers', label: 'سرور و زیرساخت' },
  { id: 'network', label: 'شبکه و وب' },
  { id: 'data', label: 'داده و دیتابیس' },
  { id: 'security', label: 'امنیت و دسترسی' },
  { id: 'hardware', label: 'سخت‌افزار' },
  { id: 'services', label: 'سرویس‌ها' },
];

export const IconPickerModal: React.FC<IconPickerModalProps> = ({
  isOpen,
  title,
  description,
  currentIcon,
  defaultCategoryIcon = 'Server',
  showResetToDefault = true,
  onSelect,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedIcon, setSelectedIcon] = useState<string | null>(currentIcon || null);

  // همگام‌سازی آیکون با باز شدن مجدد مدال
  React.useEffect(() => {
    if (isOpen) {
      setSelectedIcon(currentIcon || null);
    }
  }, [isOpen, currentIcon]);

  // فیلتر کردن آیکون‌ها بر اساس دسته‌بندی و عبارت جستجو
  const filteredIcons = useMemo(() => {
    return ASSET_ICONS.filter((item: AssetIconItem) => {
      // فیلتر دسته
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // فیلتر جستجو
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        item.name.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, selectedCategory]);

  if (!isOpen) return null;

  const handleApply = () => {
    onSelect(selectedIcon);
    onClose();
  };

  const handleResetToDefault = () => {
    setSelectedIcon(null);
    onSelect(null);
    onClose();
  };

  const activeIconName = selectedIcon || defaultCategoryIcon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        dir="rtl"
      >
        {/* هدر مدال */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-border-subtle bg-slate-50/70 dark:bg-surface-2/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30">
              <AssetIcon name={activeIconName} className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{title || 'انتخاب آیکون'}</span>
                {selectedIcon && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {selectedIcon}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {description || (selectedIcon
                  ? `آیکون «${selectedIcon}» انتخاب شده است.`
                  : `در حال حاضر از آیکون پیش‌فرض (${defaultCategoryIcon}) استفاده می‌شود.`)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-surface-elevated transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* نوار جستجو و فیلتر */}
        <div className="p-4 border-b border-slate-200 dark:border-border-subtle bg-white dark:bg-surface-1 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی آیکون (مثلاً سرور، داکر، دیتابیس، قفل، وای‌فای، server...)"
              className="w-full pr-9 pl-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-surface-2 border border-slate-200 dark:border-border-strong text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                پاک کردن
              </button>
            )}
          </div>

          {/* تب‌های دسته‌بندی */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition text-xs shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-surface-2 dark:text-slate-300 dark:hover:bg-surface-3'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* گرید آیکون‌ها */}
        <div className="flex-1 overflow-y-auto p-4 max-h-[380px]">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {filteredIcons.map((item) => {
              const isSelected = selectedIcon === item.id;
              const isCategoryDefault = !selectedIcon && defaultCategoryIcon.toLowerCase() === item.id.toLowerCase();
              const IconComp = item.component;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedIcon(item.id)}
                  className={`p-3 rounded-xl border text-right transition flex flex-col justify-between gap-2 relative group cursor-pointer ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 dark:border-indigo-500 shadow-xs ring-2 ring-indigo-500/20'
                      : isCategoryDefault
                      ? 'border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/30 dark:bg-indigo-950/20 hover:border-indigo-400'
                      : 'border-slate-200 dark:border-border-strong bg-slate-50/50 dark:bg-surface-2/40 hover:bg-slate-100 dark:hover:bg-surface-2 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center transition ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : isCategoryDefault
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                          : 'bg-white dark:bg-surface-1 text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 border border-slate-200/80 dark:border-border-subtle'
                      }`}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>

                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                    {!isSelected && isCategoryDefault && (
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                        پیش‌فرض دسته
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {item.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                      {item.id}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredIcons.length === 0 && (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Search className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-xs">هیچ آیکونی با عبارت «{searchQuery}» یافت نشد.</p>
            </div>
          )}
        </div>

        {/* فوتر مدال */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-border-subtle bg-slate-50 dark:bg-surface-2/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showResetToDefault && selectedIcon && (
              <button
                type="button"
                onClick={handleResetToDefault}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-surface-elevated transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>بازنشانی به آیکون پیش‌فرض</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-surface-elevated transition"
            >
              انصراف
            </button>

            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>انتخاب این آیکون</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
