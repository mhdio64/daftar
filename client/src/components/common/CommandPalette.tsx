import React, { useState, useEffect } from 'react';
import { Search, Server, ArrowRight, Copy, Check, X } from 'lucide-react';
import { Asset, assetsService } from '../../services/assets.service.ts';
import { useToast } from '../../context/ToastContext.tsx';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAsset: (asset: Asset) => void;
}

export function CommandPalette({ isOpen, onClose, onSelectAsset }: CommandPaletteProps) {
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      return;
    }

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const delay = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await assetsService.getAll({ search: query.trim(), limit: 8 });
        setResults(res.items);
      } catch {
        // silent
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(delay);
  }, [query]);

  const handleCopy = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('مقدار کپی شد.', 'success');
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl shadow-2xl overflow-hidden text-right">
        {/* اینپوت جستجو */}
        <div className="p-3.5 border-b border-slate-200 dark:border-border-subtle flex items-center gap-3">
          <Search className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <input
            type="text"
            placeholder="جستجوی سریع در تمام سرورها، ایمیل‌ها، آدرس‌های IP و راهنماها..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none font-medium"
          />
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* لیست نتایج */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 text-xs">
          {isLoading ? (
            <div className="text-center py-6 text-slate-500 dark:text-slate-400">در حال جستجو...</div>
          ) : results.length > 0 ? (
            results.map((asset) => {
              const ip = asset.values.ip_address || asset.values.ip;
              return (
                <div
                  key={asset.id}
                  onClick={() => {
                    onSelectAsset(asset);
                    onClose();
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-surface-2 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200/60 text-indigo-700 dark:bg-indigo-600/15 dark:text-indigo-400 dark:border-transparent">
                      <Server className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition">
                        {asset.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{asset.assetType?.name}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {ip && (
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-surface-1 border border-slate-200 dark:border-border-strong px-2 py-0.5 rounded font-mono text-[11px] text-slate-800 dark:text-indigo-300 font-medium" dir="ltr">
                        <span>{ip}</span>
                        <button
                          onClick={(e) => handleCopy(ip, `ip-${asset.id}`, e)}
                          className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                        >
                          {copiedId === `ip-${asset.id}` ? (
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3 opacity-60 hover:opacity-100" />
                          )}
                        </button>
                      </div>
                    )}
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition" />
                  </div>
                </div>
              );
            })
          ) : query ? (
            <div className="text-center py-6 text-slate-500">نتیجه‌ای با عبارت جستجو شده یافت نشد.</div>
          ) : (
            <div className="text-center py-6 text-slate-500 text-[11px]">
              عبارت مورد نظر خود را تایپ کنید یا کلید <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-surface-2 border border-slate-200 dark:border-border-strong font-mono text-slate-700 dark:text-slate-300">Esc</kbd> را برای خروج بفشارید.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
