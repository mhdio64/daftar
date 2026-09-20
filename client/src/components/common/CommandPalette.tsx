import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Server, 
  Mail, 
  Globe, 
  Key, 
  Database, 
  ArrowRight, 
  Copy, 
  Check, 
  X,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Asset, assetsService } from '../../services/assets.service.ts';
import { AssetType } from '../../services/asset-types.service.ts';
import { useToast } from '../../context/ToastContext.tsx';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAsset: (asset: Asset) => void;
  assetTypes?: AssetType[];
  currentAssets?: Asset[];
}

// نرمال‌سازی متون جهت جستجوی دقیق حروف فارسی و عربی
function normalizeText(text: string | null | undefined): string {
  return (text || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, '') // حذف اعراب
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\s\-_]+/g, ' ')
    .trim();
}

// استخراج آیکون مناسب بر اساس نام آیکون یا شناسه دسته
function getCategoryIcon(iconName: string | undefined, typeId: string) {
  const name = (iconName || '').toLowerCase();
  if (name === 'server' || typeId === 'vps') return <Server className="w-4 h-4" />;
  if (name === 'mail' || typeId === 'email') return <Mail className="w-4 h-4" />;
  if (name === 'globe' || typeId === 'domains') return <Globe className="w-4 h-4" />;
  if (name === 'key' || typeId === 'licenses') return <Key className="w-4 h-4" />;
  return <Database className="w-4 h-4" />;
}

// پایگاه داده جامع دارایی‌های دمو جهت جستجوی بلادرنگ در تمام دسته‌بندی‌ها
const DEFAULT_SEARCH_POOL: Asset[] = [
  {
    id: 'vps-1',
    assetTypeId: 'vps',
    assetType: { id: 'vps', name: 'سرورهای مجازی (VPS)', slug: 'vps', icon: 'Server', schemaDefinition: [], displayOrder: 1 },
    title: 'سرور اصلی دیتاسنتر تهران',
    values: {
      ip_address: '192.168.10.15:22',
      ssh_port: '22',
      root_user: 'root',
      root_password: '••••••••',
      os_type: 'Ubuntu 24.04',
      expiry_date: '۱۴۰۵/۰۲/۱۵',
    },
    docsMarkdown: '# راهنمای اتصال به سرور تهران\n- آی‌پی: 192.168.10.15\n- دستور اتصال SSH:\n`ssh root@192.168.10.15 -p 22`',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vps-2',
    assetTypeId: 'vps',
    assetType: { id: 'vps', name: 'سرورهای مجازی (VPS)', slug: 'vps', icon: 'Server', schemaDefinition: [], displayOrder: 1 },
    title: 'لودبالانسر و پروکسی شبکه',
    values: {
      ip_address: '10.0.1.5:443',
      ssh_port: '2222',
      root_user: 'admin',
      root_password: '••••••••',
      os_type: 'Debian 12',
      expiry_date: '۱۴۰۴/۱۲/۲۸',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vps-3',
    assetTypeId: 'vps',
    assetType: { id: 'vps', name: 'سرورهای مجازی (VPS)', slug: 'vps', icon: 'Server', schemaDefinition: [], displayOrder: 1 },
    title: 'سرور بکاپ آلمان (Hetzner)',
    values: {
      ip_address: '89.144.20.12',
      ssh_port: '22',
      root_user: 'backup_usr',
      root_password: '••••••••',
      os_type: 'Rocky Linux 9',
      expiry_date: '۷ روز دیگر',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'em-1',
    assetTypeId: 'email',
    assetType: { id: 'email', name: 'ایمیل‌های سازمانی', slug: 'email', icon: 'Mail', schemaDefinition: [], displayOrder: 2 },
    title: 'ایمیل رسمی مدیر عامل',
    values: {
      email_address: 'ceo@company.ir',
      password: '••••••••',
      department: 'مدیریت',
      storage_quota: '50 GB',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'em-2',
    assetTypeId: 'email',
    assetType: { id: 'email', name: 'ایمیل‌های سازمانی', slug: 'email', icon: 'Mail', schemaDefinition: [], displayOrder: 2 },
    title: 'ایمیل دپارتمان مالی',
    values: {
      email_address: 'finance@company.ir',
      password: '••••••••',
      department: 'مالی',
      storage_quota: '20 GB',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'dom-1',
    assetTypeId: 'domains',
    assetType: { id: 'domains', name: 'دامنه‌ها و DNS', slug: 'domains', icon: 'Globe', schemaDefinition: [], displayOrder: 3 },
    title: 'دامنه اصلی شرکت (company.ir)',
    values: {
      domain_name: 'company.ir',
      registrar: 'ایران‌سرور / ایرنیک',
      expiry_date: '۱۴۰۵/۰۶/۳۰',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'dom-2',
    assetTypeId: 'domains',
    assetType: { id: 'domains', name: 'دامنه‌ها و DNS', slug: 'domains', icon: 'Globe', schemaDefinition: [], displayOrder: 3 },
    title: 'دامنه بین‌المللی برند (company.com)',
    values: {
      domain_name: 'company.com',
      registrar: 'Namecheap',
      expiry_date: '۱۴۰۴/۱۱/۱۵',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lic-1',
    assetTypeId: 'licenses',
    assetType: { id: 'licenses', name: 'لایسنس نرم‌افزارها', slug: 'licenses', icon: 'Key', schemaDefinition: [], displayOrder: 4 },
    title: 'لایسنس ابری JetBrains All Products',
    values: {
      software_name: 'JetBrains Toolbox',
      license_key: '••••••••',
      vendor: 'JetBrains s.r.o.',
      expiry_date: '۱۴۰۵/۰۱/۲۰',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lic-2',
    assetTypeId: 'licenses',
    assetType: { id: 'licenses', name: 'لایسنس نرم‌افزارها', slug: 'licenses', icon: 'Key', schemaDefinition: [], displayOrder: 4 },
    title: 'اشتراک سالانه GitKraken Pro',
    values: {
      software_name: 'GitKraken Client',
      license_key: '••••••••',
      vendor: 'Axosoft',
      expiry_date: '۱۴۰۴/۱۰/۰۱',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function CommandPalette({ isOpen, onClose, onSelectAsset, assetTypes, currentAssets }: CommandPaletteProps) {
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // گردآوری مخزن کامل دارایی‌ها برای جستجوی آفلاین/دمو
  const fullAssetPool = useMemo(() => {
    const map = new Map<string, Asset>();

    // دارایی‌های ذخیره‌شده در localStorage
    try {
      const stored = localStorage.getItem('daftar_demo_assets');
      if (stored) {
        const parsed: Asset[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          for (const a of parsed) map.set(a.id, a);
        }
      }
    } catch {
      // ignore
    }

    // دارایی‌های موجود در صفحه جاری
    if (currentAssets && currentAssets.length > 0) {
      for (const a of currentAssets) map.set(a.id, a);
    }

    // دارایی‌های دمو پیش‌فرض
    for (const a of DEFAULT_SEARCH_POOL) {
      if (!map.has(a.id)) {
        map.set(a.id, a);
      }
    }

    // تکمیل نام و متادیتا دسته در صورت فقدان
    const all = Array.from(map.values());
    if (assetTypes && assetTypes.length > 0) {
      const typeMap = new Map(assetTypes.map((t) => [t.id, t]));
      for (const a of all) {
        if (!a.assetType && a.assetTypeId && typeMap.has(a.assetTypeId)) {
          a.assetType = typeMap.get(a.assetTypeId)!;
        }
      }
    }

    return all;
  }, [currentAssets, assetTypes, isOpen]);

  // مدیریت کلیدهای کیبورد (Escape، فلش‌ها و Enter)
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results.length > 0 && results[selectedIndex]) {
          onSelectAsset(results[selectedIndex]);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose, results, selectedIndex, onSelectAsset]);

  // جستجوی دو مرحله‌ای (تلاش بک‌اند + فال‌بک قدرتمند کلاینت)
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      // در حالت خالی بودن جستجو، ۴ دارایی برتر به عنوان پیشنهاد نمایش داده می‌شوند
      setResults(fullAssetPool.slice(0, 5));
      setSelectedIndex(0);
      return;
    }

    const delay = setTimeout(async () => {
      setIsLoading(true);
      let matchedItems: Asset[] = [];

      try {
        // تلاش برای جستجو از طریق API بک‌اند
        const res = await assetsService.getAll({ search: trimmed, limit: 12 });
        if (res.items && res.items.length > 0) {
          matchedItems = res.items;
        }
      } catch {
        // سرور در دسترس نیست یا در حالت دمو هستیم
      }

      // در صورت در دسترس نبودن سرور یا خالی بودن پاسخ، جستجوی بلادرنگ در حافظه کلاینت
      if (matchedItems.length === 0) {
        const qNorm = normalizeText(trimmed);
        const searchTokens = qNorm.split(' ').filter(Boolean);

        matchedItems = fullAssetPool.filter((asset) => {
          const titleNorm = normalizeText(asset.title);
          const categoryNorm = normalizeText(asset.assetType?.name);
          const docsNorm = normalizeText(asset.docsMarkdown);

          // بررسی کلیه مقادیر فیلدها
          const valuesNorm = Object.values(asset.values || {})
            .map((v) => normalizeText(String(v || '')))
            .join(' ');

          const fullSearchTarget = `${titleNorm} ${categoryNorm} ${docsNorm} ${valuesNorm}`;

          // تمام توکن‌های جستجو باید در رکورد یافت شوند
          return searchTokens.every((token) => fullSearchTarget.includes(token));
        });
      }

      setResults(matchedItems.slice(0, 10));
      setSelectedIndex(0);
      setIsLoading(false);
    }, 150);

    return () => clearTimeout(delay);
  }, [query, fullAssetPool]);

  const handleCopy = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('مقدار کپی شد.', 'success');
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20 bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl shadow-2xl overflow-hidden text-right">
        
        {/* اینپوت جستجو */}
        <div className="p-3.5 border-b border-slate-200 dark:border-border-subtle flex items-center gap-3">
          <Search className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <input
            type="text"
            placeholder="جستجوی سریع در نام سرور، ایمیل، آی‌پی، دامنه، پورت و مستندات..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
            >
              پاک کردن
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* برچسب وضعیت فیلتر */}
        {!query.trim() && (
          <div className="px-3.5 py-1.5 bg-slate-50 dark:bg-surface-2 border-b border-slate-100 dark:border-border-subtle flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              دارایی‌های پرکاربرد و پیشنهادی
            </span>
            <span>کلیدهای ↑ و ↓ برای جابه‌جایی، Enter برای انتخاب</span>
          </div>
        )}

        {/* لیست نتایج */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 text-xs">
          {isLoading ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <span>در حال جستجوی بلادرنگ...</span>
            </div>
          ) : results.length > 0 ? (
            results.map((asset, idx) => {
              const ip = asset.values?.ip_address || asset.values?.ip;
              const email = asset.values?.email_address;
              const domain = asset.values?.domain_name;
              const software = asset.values?.software_name;
              const highlightedValue = ip || email || domain || software;
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={asset.id}
                  onClick={() => {
                    onSelectAsset(asset);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-2.5 rounded-xl transition cursor-pointer group ${
                    isSelected
                      ? 'bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30'
                      : 'hover:bg-slate-50 dark:hover:bg-surface-2 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-2 rounded-lg transition shrink-0 ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-indigo-50 border border-indigo-200/60 text-indigo-700 dark:bg-indigo-600/15 dark:text-indigo-400 dark:border-transparent'
                    }`}>
                      {getCategoryIcon(asset.assetType?.icon, asset.assetTypeId)}
                    </div>
                    <div className="truncate">
                      <div className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition truncate">
                        {asset.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="font-medium text-indigo-600 dark:text-indigo-400">
                          {asset.assetType?.name || asset.assetTypeId}
                        </span>
                        {asset.values?.os_type && (
                          <>
                            <span>•</span>
                            <span>{asset.values.os_type}</span>
                          </>
                        )}
                        {asset.values?.department && (
                          <>
                            <span>•</span>
                            <span>{asset.values.department}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {highlightedValue && (
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-surface-1 border border-slate-200 dark:border-border-strong px-2 py-0.5 rounded font-mono text-[11px] text-slate-800 dark:text-indigo-300 font-medium" dir="ltr">
                        <span className="truncate max-w-[140px]">{highlightedValue}</span>
                        <button
                          type="button"
                          onClick={(e) => handleCopy(highlightedValue, `val-${asset.id}`, e)}
                          className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                          title="کپی"
                        >
                          {copiedId === `val-${asset.id}` ? (
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3 opacity-60 hover:opacity-100" />
                          )}
                        </button>
                      </div>
                    )}
                    <ArrowRight className={`w-4 h-4 transition ${
                      isSelected
                        ? 'text-indigo-600 dark:text-indigo-400 translate-x-0.5'
                        : 'text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white'
                    }`} />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 space-y-1">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                نتیجه‌ای با عبارت «{query}» یافت نشد.
              </div>
              <div className="text-[11px]">
                می‌توانید بر اساس نام، آدرس IP، آدرس ایمیل، دامنه یا نام کاربری جستجو کنید.
              </div>
            </div>
          )}
        </div>

        {/* پاورقی کلیدهای میانبر */}
        <div className="px-3.5 py-2 bg-slate-50 dark:bg-surface-2 border-t border-slate-100 dark:border-border-subtle flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong font-mono">↵</kbd> مشاهده و ویرایش</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong font-mono">Esc</kbd> بستن</span>
          </div>
          <div>
            <span>تعداد دارایی‌های قابل جستجو: {fullAssetPool.length} مورد</span>
          </div>
        </div>

      </div>
    </div>
  );
}
