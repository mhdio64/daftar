import React from 'react';
import { X, Check, Tag as TagIcon } from 'lucide-react';

export interface TagBadgeProps {
  tag: string;
  size?: 'xs' | 'sm' | 'md';
  onRemove?: () => void;
  onClick?: (e: React.MouseEvent) => void;
  isSelected?: boolean;
  count?: number;
  showIcon?: boolean;
  className?: string;
  title?: string;
}

interface TagColorTheme {
  bg: string;
  text: string;
  border: string;
  dot: string;
  selectedBg: string;
  selectedText: string;
  selectedBorder: string;
}

const COLOR_PALETTES: TagColorTheme[] = [
  // Indigo
  {
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-500/30',
    dot: 'bg-indigo-500',
    selectedBg: 'bg-indigo-600 text-white dark:bg-indigo-500 dark:text-white',
    selectedText: 'text-white',
    selectedBorder: 'border-indigo-600 dark:border-indigo-400',
  },
  // Emerald
  {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    dot: 'bg-emerald-500',
    selectedBg: 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-white',
    selectedText: 'text-white',
    selectedBorder: 'border-emerald-600 dark:border-emerald-400',
  },
  // Amber
  {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-500/30',
    dot: 'bg-amber-500',
    selectedBg: 'bg-amber-600 text-white dark:bg-amber-500 dark:text-white',
    selectedText: 'text-white',
    selectedBorder: 'border-amber-600 dark:border-amber-400',
  },
  // Rose
  {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-500/30',
    dot: 'bg-rose-500',
    selectedBg: 'bg-rose-600 text-white dark:bg-rose-500 dark:text-white',
    selectedText: 'text-white',
    selectedBorder: 'border-rose-600 dark:border-rose-400',
  },
  // Purple
  {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-500/30',
    dot: 'bg-purple-500',
    selectedBg: 'bg-purple-600 text-white dark:bg-purple-500 dark:text-white',
    selectedText: 'text-white',
    selectedBorder: 'border-purple-600 dark:border-purple-400',
  },
  // Sky
  {
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-500/30',
    dot: 'bg-sky-500',
    selectedBg: 'bg-sky-600 text-white dark:bg-sky-500 dark:text-white',
    selectedText: 'text-white',
    selectedBorder: 'border-sky-600 dark:border-sky-400',
  },
  // Teal
  {
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-500/30',
    dot: 'bg-teal-500',
    selectedBg: 'bg-teal-600 text-white dark:bg-teal-500 dark:text-white',
    selectedText: 'text-white',
    selectedBorder: 'border-teal-600 dark:border-teal-400',
  },
];

/**
 * تعیین پالت رنگی بر اساس کلمات کلیدی هوشمند یا هش قطعی رشته
 */
export function getTagTheme(tagName: string): TagColorTheme {
  const norm = tagName.trim().toLowerCase();

  // نگاشت‌های معنایی اختصاصی
  if (/prod|production|اصلی|پروداکشن|live|انلاین/i.test(norm)) return COLOR_PALETTES[1]; // Emerald
  if (/stage|staging|استیجنگ|تست|test|qa/i.test(norm)) return COLOR_PALETTES[2]; // Amber
  if (/crit|urgent|فوری|حساس|خطر|امنیتی|security/i.test(norm)) return COLOR_PALETTES[3]; // Rose
  if (/backup|پشتیبان|بکاپ|آرشیو|archive/i.test(norm)) return COLOR_PALETTES[4]; // Purple
  if (/cloud|ابری|شبکه|dns|پروکسی|proxy|infra/i.test(norm)) return COLOR_PALETTES[5]; // Sky
  if (/db|database|دیتابیس|مالی|بانک|finance/i.test(norm)) return COLOR_PALETTES[6]; // Teal
  if (/internal|داخلی|مدیریت|پرسنل|dev|توسعه/i.test(norm)) return COLOR_PALETTES[0]; // Indigo

  // محاسبه هش قطعی
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = (hash << 5) - hash + norm.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % COLOR_PALETTES.length;
  return COLOR_PALETTES[index];
}

export function TagBadge({
  tag,
  size = 'sm',
  onRemove,
  onClick,
  isSelected = false,
  count,
  showIcon = false,
  className = '',
  title,
}: TagBadgeProps) {
  const theme = getTagTheme(tag);

  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.2 rounded font-medium gap-1',
    sm: 'text-[11px] px-2 py-0.5 rounded-md font-medium gap-1.5',
    md: 'text-xs px-2.5 py-1 rounded-lg font-medium gap-1.5',
  }[size];

  const isInteractive = Boolean(onClick);

  return (
    <span
      onClick={onClick}
      title={title || (isInteractive ? `فیلتر بر اساس «${tag}»` : undefined)}
      className={`inline-flex items-center border transition-all select-none ${sizeClasses} ${
        isSelected
          ? `${theme.selectedBg} ${theme.selectedBorder} shadow-2xs font-semibold`
          : `${theme.bg} ${theme.text} ${theme.border} ${
              isInteractive ? 'hover:brightness-95 dark:hover:brightness-110 cursor-pointer shadow-2xs hover:scale-[1.02]' : ''
            }`
      } ${className}`}
    >
      {/* نشانگر کوچک نقطه یا آیکون وضعیت انتخاب */}
      {isSelected ? (
        <Check className="w-3 h-3 shrink-0 stroke-[2.5]" />
      ) : showIcon ? (
        <TagIcon className="w-2.5 h-2.5 opacity-70 shrink-0" />
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${theme.dot}`} />
      )}

      {/* نام برچسب */}
      <span className="truncate max-w-[140px]">{tag}</span>

      {/* شمارنده ردیف‌ها در حالت فیلتر */}
      {count !== undefined && (
        <span
          className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${
            isSelected
              ? 'bg-white/20 text-white'
              : 'bg-black/5 dark:bg-white/10 opacity-80'
          }`}
        >
          {count}
        </span>
      )}

      {/* دکمه حذف برچسب در حالت ویرایش */}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="mr-0.5 -ml-0.5 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/20 transition shrink-0 opacity-70 hover:opacity-100"
          title="حذف این برچسب"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}
