import React, { useState, useRef, useEffect } from 'react';
import { TagBadge } from './TagBadge.tsx';
import { Tag, Plus, Check } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  existingTags?: string[];
  placeholder?: string;
  maxTags?: number;
}

const DEFAULT_PRESETS = [
  'Production',
  'Staging',
  'Critical',
  'Backup',
  'Cloud',
  'شبکه',
  'داخلی',
];

export function TagInput({
  tags = [],
  onChange,
  existingTags = [],
  placeholder = 'برچسب را تایپ کرده و اینتر بزنید...',
  maxTags = 15,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestedIndex, setSuggestedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // پاکسازی و افزودن تگ جدید
  const addTag = (rawTag: string) => {
    const cleanTag = rawTag.trim().replace(/^#+/, '');
    if (!cleanTag) return;
    if (tags.length >= maxTags) return;

    // جلوگیری از تگ تکراری با مقایسه غیرحساس به بزرگی و کوچکی
    const isDuplicate = tags.some((t) => t.toLowerCase() === cleanTag.toLowerCase());
    if (isDuplicate) {
      setInputValue('');
      return;
    }

    onChange([...tags, cleanTag]);
    setInputValue('');
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  // پیشنهادات بر اساس متن ورودی
  const suggestions = React.useMemo(() => {
    if (!inputValue.trim()) return [];
    const query = inputValue.trim().toLowerCase();
    
    // تلفیق تگ‌های موجود در سیستم و پریست‌ها
    const allPool = Array.from(new Set([...existingTags, ...DEFAULT_PRESETS]));
    return allPool
      .filter((t) => t.toLowerCase().includes(query))
      .filter((t) => !tags.some((cur) => cur.toLowerCase() === t.toLowerCase()))
      .slice(0, 6);
  }, [inputValue, existingTags, tags]);

  // ریست ایندکس انتخاب suggestion هنگام تغییر ورودی
  useEffect(() => {
    setSuggestedIndex(0);
  }, [inputValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === '،') {
      e.preventDefault();
      if (suggestions.length > 0 && suggestedIndex >= 0 && suggestedIndex < suggestions.length) {
        addTag(suggestions[suggestedIndex]);
      } else {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // حذف آخرین تگ با زدن Backspace در صورت خالی بودن اینپوت
      removeTag(tags[tags.length - 1]);
    } else if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      setSuggestedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp' && suggestions.length > 0) {
      e.preventDefault();
      setSuggestedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Escape') {
      setInputValue('');
    }
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      {/* جعبه حاوی چیپ‌ها و اینپوت */}
      <div
        onClick={() => inputRef.current?.focus()}
        className={`min-h-[42px] w-full p-1.5 rounded-lg border bg-white dark:bg-surface-2 transition-all flex flex-wrap items-center gap-1.5 cursor-text ${
          isFocused
            ? 'border-indigo-600 ring-1 ring-indigo-600/20 dark:border-indigo-500'
            : 'border-slate-300 dark:border-border-strong hover:border-slate-400 dark:hover:border-border-subtle'
        }`}
      >
        <Tag className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />

        {/* لیست تگ‌های انتخاب‌شده */}
        {tags.map((tag) => (
          <TagBadge
            key={tag}
            tag={tag}
            size="sm"
            onRemove={() => removeTag(tag)}
          />
        ))}

        {/* فیلد ورودی متن تگ */}
        {tags.length < maxTags && (
          <div className="relative flex-1 min-w-[120px]">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              placeholder={tags.length === 0 ? placeholder : ''}
              className="w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none py-1 px-1 font-medium"
            />

            {/* منوی پیشنهادات هوشمند زیر اینپوت */}
            {isFocused && suggestions.length > 0 && (
              <div className="absolute top-full right-0 mt-1.5 w-56 bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-xl shadow-xl p-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                <div className="text-[10px] font-semibold text-slate-400 px-2 py-1">
                  پیشنهادات برچسب:
                </div>
                {suggestions.map((sug, idx) => (
                  <button
                    key={sug}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addTag(sug);
                    }}
                    className={`w-full text-right px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition ${
                      idx === suggestedIndex
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-2'
                    }`}
                  >
                    <span>{sug}</span>
                    <Plus className="w-3 h-3 opacity-60" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* چیپ‌های پیش‌فرض آماده برای تگ‌گذاری با ۱ کلیک */}
      <div className="flex items-center flex-wrap gap-1 pt-0.5">
        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium ml-1">
          برچسب‌های آماده:
        </span>
        {DEFAULT_PRESETS.map((preset) => {
          const isAdded = tags.some((t) => t.toLowerCase() === preset.toLowerCase());
          return (
            <button
              key={preset}
              type="button"
              disabled={isAdded || tags.length >= maxTags}
              onClick={() => addTag(preset)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition flex items-center gap-1 ${
                isAdded
                  ? 'bg-slate-100 dark:bg-surface-2 text-slate-400 border-transparent cursor-not-allowed opacity-60'
                  : 'bg-slate-50 hover:bg-indigo-50 dark:bg-surface-2/60 dark:hover:bg-surface-elevated text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-300 border-slate-200 dark:border-border-strong hover:border-indigo-300 shadow-2xs'
              }`}
            >
              {isAdded ? <Check className="w-2.5 h-2.5" /> : <Plus className="w-2.5 h-2.5" />}
              <span>{preset}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
