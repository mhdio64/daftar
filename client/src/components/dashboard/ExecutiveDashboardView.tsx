import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  Layers,
  ArrowUpRight,
  ExternalLink,
  RefreshCw,
  Server,
  Mail,
  Globe,
  Key,
  Database,
  Calendar,
  DollarSign,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  Search,
  Filter,
} from 'lucide-react';
import { AssetType } from '../../services/asset-types.service';
import { Asset, assetsService, DashboardSummaryResponse } from '../../services/assets.service';

interface ExecutiveDashboardViewProps {
  assetTypes: AssetType[];
  onNavigateToCategory: (typeId: string) => void;
  onSelectAsset: (asset: Asset) => void;
}

export const ExecutiveDashboardView: React.FC<ExecutiveDashboardViewProps> = ({
  assetTypes,
  onNavigateToCategory,
  onSelectAsset,
}) => {
  const [data, setData] = useState<DashboardSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('all');
  const [selectedCurrencyTab, setSelectedCurrencyTab] = useState<'تومان' | 'دلار ($)' | 'یورو (€)'>('تومان');
  const [searchQuery, setSearchQuery] = useState('');

  // دریافت آیکون دسته‌بندی
  const getCategoryIcon = (iconName?: string) => {
    switch (iconName?.toLowerCase()) {
      case 'server':
        return <Server className="w-4 h-4 text-indigo-500" />;
      case 'mail':
        return <Mail className="w-4 h-4 text-emerald-500" />;
      case 'globe':
        return <Globe className="w-4 h-4 text-sky-500" />;
      case 'key':
        return <Key className="w-4 h-4 text-amber-500" />;
      case 'database':
        return <Database className="w-4 h-4 text-purple-500" />;
      default:
        return <Layers className="w-4 h-4 text-slate-500" />;
    }
  };

  // بارگذاری داده‌های داشبورد (با فال‌بک لوکال برای حالت دمو/آفلاین)
  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const summary = await assetsService.getDashboardSummary();
      setData(summary);
      setIsLoading(false);
      return;
    } catch {
      // فال‌بک: محاسبه مستقیم از داده‌های محلی یا نمونه
    }

    computeLocalDashboardData();
  };

  const computeLocalDashboardData = () => {
    try {
      let localAssets: any[] = [];
      const stored = localStorage.getItem('daftar_demo_assets');
      if (stored) {
        localAssets = JSON.parse(stored);
      } else {
        // نمونه‌های پیش‌فرض در صورت خالی بودن
        localAssets = [
          {
            id: 'vps-1',
            assetTypeId: 'vps',
            title: 'سرور اصلی دیتاسنتر تهران',
            tags: ['Production', 'اصلی', 'Critical'],
            expiryDate: new Date(Date.now() + 55 * 86400000).toISOString(),
            values: {
              ip_address: '192.168.10.15:22',
              root_user: 'root',
              cost_amount: '4,500,000',
              cost_currency: 'تومان',
              billing_cycle: 'ماهانه',
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'vps-2',
            assetTypeId: 'vps',
            title: 'لودبالانسر و پروکسی شبکه',
            tags: ['Production', 'شبکه'],
            expiryDate: new Date(Date.now() + 180 * 86400000).toISOString(),
            values: {
              ip_address: '10.0.1.5:443',
              root_user: 'admin',
              cost_amount: '1,800,000',
              cost_currency: 'تومان',
              billing_cycle: 'ماهانه',
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'vps-3',
            assetTypeId: 'vps',
            title: 'سرور بکاپ آلمان (Hetzner AX)',
            tags: ['Backup', 'آلمان'],
            expiryDate: new Date(Date.now() + 6 * 86400000).toISOString(),
            values: {
              ip_address: '89.144.20.12',
              root_user: 'backup_usr',
              cost_amount: '38',
              cost_currency: 'یورو (€)',
              billing_cycle: 'ماهانه',
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'dom-1',
            assetTypeId: 'domains',
            title: 'دامنه اصلی شرکت (company.ir)',
            tags: ['Production', 'برند'],
            expiryDate: new Date(Date.now() + 320 * 86400000).toISOString(),
            values: {
              domain_name: 'company.ir',
              cost_amount: '650,000',
              cost_currency: 'تومان',
              billing_cycle: 'سالانه',
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'dom-2',
            assetTypeId: 'domains',
            title: 'دامنه بین‌المللی برند (company.com)',
            tags: ['بین‌المللی', 'برند'],
            expiryDate: new Date(Date.now() + 14 * 86400000).toISOString(),
            values: {
              domain_name: 'company.com',
              cost_amount: '16',
              cost_currency: 'دلار ($)',
              billing_cycle: 'سالانه',
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'lic-1',
            assetTypeId: 'licenses',
            title: 'لایسنس ابری JetBrains All Products',
            tags: ['Cloud', 'توسعه'],
            expiryDate: new Date(Date.now() + 190 * 86400000).toISOString(),
            values: {
              software_name: 'JetBrains Toolbox',
              cost_amount: '290',
              cost_currency: 'دلار ($)',
              billing_cycle: 'سالانه',
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'lic-2',
            assetTypeId: 'licenses',
            title: 'اشتراک سالانه GitKraken Pro',
            tags: ['ابزار', 'توسعه'],
            expiryDate: new Date(Date.now() - 2 * 86400000).toISOString(), // منقضی شده
            values: {
              software_name: 'GitKraken Client',
              cost_amount: '60',
              cost_currency: 'دلار ($)',
              billing_cycle: 'سالانه',
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'em-1',
            assetTypeId: 'email',
            title: 'ایمیل رسمی مدیر عامل',
            tags: ['مدیریت', 'Internal'],
            values: {
              email_address: 'ceo@company.ir',
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'em-2',
            assetTypeId: 'email',
            title: 'ایمیل دپارتمان مالی',
            tags: ['مالی', 'Internal'],
            values: {
              email_address: 'finance@company.ir',
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
      }

      // آمار دسته‌بندی‌ها
      const categoryStats = assetTypes.map((t) => {
        const count = localAssets.filter((a) => a.assetTypeId === t.id).length;
        return {
          id: t.id,
          name: t.name,
          slug: t.slug,
          icon: t.icon,
          count,
        };
      });

      // دارایی‌های نزدیک انقضا (کمتر از ۳۰ روز یا گذشته)
      const now = new Date();
      const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 3600 * 1000);

      const expiringAssets = localAssets
        .filter((a) => a.expiryDate && new Date(a.expiryDate) <= thirtyDaysLater)
        .sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime())
        .map((a) => {
          const type = assetTypes.find((t) => t.id === a.assetTypeId);
          const expDate = new Date(a.expiryDate!);
          return {
            id: a.id,
            title: a.title,
            assetTypeId: a.assetTypeId,
            assetTypeName: type?.name,
            assetTypeIcon: type?.icon,
            expiryDate: a.expiryDate!,
            isExpired: expDate < now,
            daysRemaining: Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24)),
          };
        });

      // جمع هزینه‌ها
      const costTotals: Record<string, { monthly: number; yearly: number }> = {
        'تومان': { monthly: 0, yearly: 0 },
        'دلار ($)': { monthly: 0, yearly: 0 },
        'یورو (€)': { monthly: 0, yearly: 0 },
      };

      const costDrivers: any[] = [];

      for (const a of localAssets) {
        const vals = a.values || {};
        const rawCost = vals.cost_amount;
        if (!rawCost) continue;

        const numStr = String(rawCost).replace(/,/g, '').replace(/[^\d.]/g, '');
        const num = parseFloat(numStr);
        if (isNaN(num) || num <= 0) continue;

        const curr = vals.cost_currency || 'تومان';
        const cycle = vals.billing_cycle || 'ماهانه';

        if (!costTotals[curr]) {
          costTotals[curr] = { monthly: 0, yearly: 0 };
        }

        if (cycle === 'سالانه') {
          costTotals[curr].yearly += num;
          costTotals[curr].monthly += Math.round(num / 12);
        } else {
          costTotals[curr].monthly += num;
          costTotals[curr].yearly += num * 12;
        }

        const type = assetTypes.find((t) => t.id === a.assetTypeId);

        costDrivers.push({
          id: a.id,
          title: a.title,
          assetTypeId: a.assetTypeId,
          assetTypeName: type?.name,
          assetTypeIcon: type?.icon,
          amount: num,
          formattedAmount: num.toLocaleString('fa-IR'),
          currency: curr,
          billingCycle: cycle,
          monthlyNormalized: cycle === 'سالانه' ? Math.round(num / 12) : num,
        });
      }

      costDrivers.sort((a, b) => b.monthlyNormalized - a.monthlyNormalized);

      setData({
        totalAssets: localAssets.length,
        categoryStats,
        expiringAssets,
        costTotals,
        costDrivers: costDrivers.slice(0, 10),
      });
    } catch (e) {
      console.error('Error calculating dashboard data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [assetTypes]);

  // تاریخ امروز به فرمت فارسی
  const todayPersian = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('fa-IR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date());
    } catch {
      return 'امروز';
    }
  }, []);

  // محاسبه آمار فیلتر شده
  const filteredCategoryStats = useMemo(() => {
    if (!data) return [];
    if (selectedFilterCategory === 'all') return data.categoryStats;
    return data.categoryStats.filter((c) => c.id === selectedFilterCategory);
  }, [data, selectedFilterCategory]);

  const filteredExpiring = useMemo(() => {
    if (!data) return [];
    let items = data.expiringAssets;
    if (selectedFilterCategory !== 'all') {
      items = items.filter((a) => a.assetTypeId === selectedFilterCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(
        (a) => a.title.toLowerCase().includes(q) || a.assetTypeName?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [data, selectedFilterCategory, searchQuery]);

  const filteredCostDrivers = useMemo(() => {
    if (!data) return [];
    let items = data.costDrivers;
    if (selectedFilterCategory !== 'all') {
      items = items.filter((a) => a.assetTypeId === selectedFilterCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(
        (a) => a.title.toLowerCase().includes(q) || a.assetTypeName?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [data, selectedFilterCategory, searchQuery]);

  const expiredCount = useMemo(() => {
    return data?.expiringAssets.filter((a) => a.isExpired).length || 0;
  }, [data]);

  const urgentCount = useMemo(() => {
    return data?.expiringAssets.filter((a) => !a.isExpired && a.daysRemaining <= 7).length || 0;
  }, [data]);

  // یافتن دارایی برای باز کردن مودال
  const handleAssetClick = (assetId: string) => {
    try {
      const stored = localStorage.getItem('daftar_demo_assets');
      if (stored) {
        const list: Asset[] = JSON.parse(stored);
        const match = list.find((a) => a.id === assetId);
        if (match) {
          onSelectAsset(match);
          return;
        }
      }
    } catch {}

    // تلاش برای بازیابی از سرویس
    assetsService.getById(assetId).then(onSelectAsset).catch(() => {
      // ساخت شیء موقت اگر یافت نشد
      const stub: any = {
        id: assetId,
        title: 'جزئیات دارایی',
        values: {},
      };
      onSelectAsset(stub);
    });
  };

  if (isLoading && !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm font-medium">در حال تجمیع و تحلیل آمار دارایی‌ها و هزینه‌ها...</p>
      </div>
    );
  }

  const tomanMonthly = data?.costTotals['تومان']?.monthly || 0;
  const tomanYearly = data?.costTotals['تومان']?.yearly || 0;
  const usdMonthly = data?.costTotals['دلار ($)']?.monthly || 0;
  const usdYearly = data?.costTotals['دلار ($)']?.yearly || 0;
  const eurMonthly = data?.costTotals['یورو (€)']?.monthly || 0;
  const eurYearly = data?.costTotals['یورو (€)']?.yearly || 0;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-canvas p-6 space-y-6">
      {/* ۱. هدر اصلی داشبورد مدیریتی */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-border-subtle">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                داشبورد آماری و هزینه‌های دارایی‌ها
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                نمای مدیریتی یکپارچه: تحلیل بودجه‌های جاری، وضعیت دسته‌بندی‌ها و دیده‌بانی سررسیدها
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* نشان تاریخ زنده فارسی */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-subtle text-xs font-medium text-slate-700 dark:text-slate-300 shadow-xs">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span>{todayPersian}</span>
          </div>

          {/* فیلتر دسته */}
          <div className="relative">
            <select
              value={selectedFilterCategory}
              onChange={(e) => setSelectedFilterCategory(e.target.value)}
              className="appearance-none bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-subtle rounded-xl px-3 py-1.5 pr-8 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-xs cursor-pointer"
            >
              <option value="all">تمام دسته‌بندی‌ها</option>
              {assetTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <Filter className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* دکمه بروزرسانی */}
          <button
            onClick={fetchDashboardData}
            title="بروزرسانی آمار"
            className="p-2 rounded-xl bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-subtle text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-surface-2 transition shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ۲. کارت‌های شاخص کلیدی (KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* شاخص ۱: مجموع دارایی‌ها */}
        <div className="p-4 rounded-2xl bg-white dark:bg-surface-1 border border-slate-200/80 dark:border-border-subtle shadow-xs relative overflow-hidden group hover:border-indigo-500/50 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">کل دارایی‌های ثبت‌شده</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {(data?.totalAssets || 0).toLocaleString('fa-IR')}
            </span>
            <span className="text-xs text-slate-500">قلم دارایی</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-border-subtle/50 pt-2">
            <span>در {assetTypes.length} دسته‌بندی فعال</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">پایش ۱۰۰٪</span>
          </div>
        </div>

        {/* شاخص ۲: بودجه ماهانه تومانی */}
        <div className="p-4 rounded-2xl bg-white dark:bg-surface-1 border border-slate-200/80 dark:border-border-subtle shadow-xs relative overflow-hidden group hover:border-emerald-500/50 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">هزینه ماهانه (تومان)</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {tomanMonthly.toLocaleString('fa-IR')}
            </span>
            <span className="text-xs text-slate-500">تومان / ماه</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-border-subtle/50 pt-2">
            <span>تخمین سالانه:</span>
            <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
              {tomanYearly.toLocaleString('fa-IR')} ت
            </span>
          </div>
        </div>

        {/* شاخص ۳: تعهدات ارزی ماهانه (دلار و یورو) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-surface-1 border border-slate-200/80 dark:border-border-subtle shadow-xs relative overflow-hidden group hover:border-sky-500/50 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">هزینه‌های ارزی (ماهانه)</span>
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                ${usdMonthly.toLocaleString('en-US')}
              </span>
              <span className="text-[11px] text-slate-400 font-sans">دلار</span>
            </div>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-800 dark:text-slate-200 font-mono">
                €{eurMonthly.toLocaleString('en-US')}
              </span>
              <span className="text-[11px] text-slate-400 font-sans">یورو</span>
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-border-subtle/50 pt-2">
            <span>سالانه:</span>
            <span className="font-mono text-sky-600 dark:text-sky-400 font-medium">
              ${usdYearly} + €{eurYearly}
            </span>
          </div>
        </div>

        {/* شاخص ۴: وضعیت سررسید و انقضا */}
        <div className="p-4 rounded-2xl bg-white dark:bg-surface-1 border border-slate-200/80 dark:border-border-subtle shadow-xs relative overflow-hidden group hover:border-amber-500/50 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">رادار انقضا و تمدید</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {(data?.expiringAssets.length || 0).toLocaleString('fa-IR')}
            </span>
            <span className="text-xs text-slate-500">نیاز به تمدید</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] border-t border-slate-100 dark:border-border-subtle/50 pt-2">
            {expiredCount > 0 ? (
              <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {expiredCount.toLocaleString('fa-IR')} مورد منقضی‌شده!
              </span>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">هیچ انقضای بحرانی نداریم</span>
            )}
            {urgentCount > 0 && (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                {urgentCount.toLocaleString('fa-IR')} اضطراری (۷ روز)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ۳. بخش نموداری و تفکیک دسته‌ها + بودجه‌بندی ارزی */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ستون راست: توزیع دارایی‌ها در دسته‌بندی‌ها */}
        <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-surface-1 border border-slate-200/80 dark:border-border-subtle p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  توزیع دارایی‌ها بر اساس دسته‌بندی
                </h2>
              </div>
              <span className="text-xs text-slate-400">کلیک برای مشاهده دسته</span>
            </div>

            <div className="space-y-3.5">
              {filteredCategoryStats.map((cat) => {
                const total = data?.totalAssets || 1;
                const percentage = Math.round((cat.count / total) * 100) || 0;

                return (
                  <div
                    key={cat.id}
                    onClick={() => onNavigateToCategory(cat.id)}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-surface-2 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/20 border border-slate-200/60 dark:border-border-subtle cursor-pointer transition group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        {getCategoryIcon(cat.icon)}
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                          {cat.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {cat.count.toLocaleString('fa-IR')}
                        </span>
                        <span className="text-[11px] text-slate-400">({percentage}٪)</span>
                        <ChevronLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:-translate-x-1 transition" />
                      </div>
                    </div>

                    {/* نوار پیشرفت بصری */}
                    <div className="w-full bg-slate-200 dark:bg-surface-3 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500 group-hover:bg-indigo-500"
                        style={{ width: `${Math.max(percentage, 3)}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {filteredCategoryStats.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400">
                  هیچ دسته‌بندی فعالی ثبت نشده است.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-border-subtle flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>تعداد کل دسته‌های تعریف‌شده: {assetTypes.length} دسته</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-medium">
              قابلیت افزودن فیلد هزینه به همه دسته‌ها
            </span>
          </div>
        </div>

        {/* ستون چپ: تحلیل بودجه چندارزی (Multi-Currency Budgeting) */}
        <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-surface-1 border border-slate-200/80 dark:border-border-subtle p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  برآورد بودجه و مخارج ارزی
                </h2>
              </div>

              {/* تب‌های ارز */}
              <div className="flex items-center bg-slate-100 dark:bg-surface-2 p-1 rounded-xl text-[11px] font-medium">
                {(['تومان', 'دلار ($)', 'یورو (€)'] as const).map((curr) => (
                  <button
                    key={curr}
                    onClick={() => setSelectedCurrencyTab(curr)}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      selectedCurrencyTab === curr
                        ? 'bg-white dark:bg-surface-1 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>

            {/* جزئیات ارز انتخاب‌شده */}
            {(() => {
              const activeStats = data?.costTotals[selectedCurrencyTab] || { monthly: 0, yearly: 0 };
              const symbol =
                selectedCurrencyTab === 'تومان'
                  ? 'تومان'
                  : selectedCurrencyTab === 'دلار ($)'
                  ? '$'
                  : '€';

              return (
                <div className="space-y-4">
                  {/* باکس برآورد ماهانه و سالانه */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-surface-2 border border-slate-200/70 dark:border-border-subtle">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                        تخمین هزینه ماهانه
                      </span>
                      <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
                        {symbol === 'تومان'
                          ? `${activeStats.monthly.toLocaleString('fa-IR')} ${symbol}`
                          : `${symbol}${activeStats.monthly.toLocaleString('en-US')}`}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        نرخ جریان مستمر ماهانه
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-surface-2 border border-slate-200/70 dark:border-border-subtle">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                        برآورد هزینه سالانه
                      </span>
                      <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 font-mono">
                        {symbol === 'تومان'
                          ? `${activeStats.yearly.toLocaleString('fa-IR')} ${symbol}`
                          : `${symbol}${activeStats.yearly.toLocaleString('en-US')}`}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        تعهد مالی ۱۲ ماهه
                      </span>
                    </div>
                  </div>

                  {/* راهنمای دوره‌های پرداخت */}
                  <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-500/20 text-xs space-y-2">
                    <div className="flex items-center justify-between text-indigo-900 dark:text-indigo-200 font-medium">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        مدل‌سازی خودکار دوره‌ها
                      </span>
                      <span className="text-[10px] font-mono bg-indigo-100 dark:bg-indigo-900/50 px-2 py-0.5 rounded-full">
                        هوشمند
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      هزینه‌های سالانه به صورت ماهانه تقسیم بر ۱۲ نرمال‌سازی می‌شوند و هزینه‌های ماهانه برای ۱۲ ماه سال ضرب می‌شوند تا درک کاملی از هزینه‌کرد سازمان ارائه گردد.
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-border-subtle text-center">
            <span className="text-[11px] text-slate-400">
              ارزها و دوره‌های پرداخت در جزئیات فیلدهای هر دارایی قابل تغییر هستند
            </span>
          </div>
        </div>
      </div>

      {/* ۴. دو پنل عملیاتی پایین: پرهزینه‌ترین دارایی‌ها + رادار انقضا و تمدید */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* پنل ۱: پرهزینه‌ترین دارایی‌ها (Top Cost Drivers) */}
        <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-surface-1 border border-slate-200/80 dark:border-border-subtle p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                پرهزینه‌ترین دارایی‌ها (سهم بودجه)
              </h2>
            </div>
            <span className="text-xs text-slate-400">مرتب‌سازی بر اساس نرمال ماهانه</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-border-subtle text-slate-500 dark:text-slate-400 font-medium">
                  <th className="pb-2.5 pr-2 font-normal">عنوان دارایی</th>
                  <th className="pb-2.5 px-2 font-normal">دسته</th>
                  <th className="pb-2.5 px-2 font-normal">تعرفه و دوره</th>
                  <th className="pb-2.5 px-2 font-normal">سهم ماهانه</th>
                  <th className="pb-2.5 pl-2 text-left font-normal">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-border-subtle/50">
                {filteredCostDrivers.map((driver) => (
                  <tr
                    key={driver.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-surface-2 transition group"
                  >
                    <td className="py-2.5 pr-2 font-bold text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(driver.assetTypeIcon)}
                        <span className="truncate max-w-[180px]">{driver.title}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-slate-600 dark:text-slate-400">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-surface-2 text-[10px] font-medium">
                        {driver.assetTypeName || 'عمومی'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 font-mono">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {driver.formattedAmount} {driver.currency}
                      </span>
                      <span className="text-[10px] text-slate-400 mr-1 font-sans">
                        ({driver.billingCycle})
                      </span>
                    </td>
                    <td className="py-2.5 px-2 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {driver.monthlyNormalized.toLocaleString('fa-IR')} {driver.currency}/ماه
                    </td>
                    <td className="py-2.5 pl-2 text-left">
                      <button
                        onClick={() => handleAssetClick(driver.id)}
                        className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded hover:bg-slate-100 dark:hover:bg-surface-3 transition"
                        title="مشاهده جزئیات دارایی"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredCostDrivers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      هیچ دارایی دارای مبلغ ثبت‌شده در این دسته یافت نشد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* پنل ۲: رادار سررسید و انقضا (Upcoming Expirations Radar) */}
        <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-surface-1 border border-slate-200/80 dark:border-border-subtle p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  رادار انقضا و سررسیدها (۳۰ روز آینده)
                </h2>
              </div>
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                {filteredExpiring.length.toLocaleString('fa-IR')} قلم
              </span>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-0.5">
              {filteredExpiring.map((exp) => {
                const isUrgent = !exp.isExpired && exp.daysRemaining <= 7;

                return (
                  <div
                    key={exp.id}
                    onClick={() => handleAssetClick(exp.id)}
                    className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                      exp.isExpired
                        ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 hover:border-rose-400'
                        : isUrgent
                        ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 hover:border-amber-400'
                        : 'bg-slate-50 dark:bg-surface-2 border-slate-200/70 dark:border-border-subtle hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-white dark:bg-surface-1 shadow-2xs">
                        {getCategoryIcon(exp.assetTypeIcon)}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {exp.title}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>{exp.assetTypeName}</span>
                          <span>•</span>
                          <span className="font-mono">
                            {new Date(exp.expiryDate).toLocaleDateString('fa-IR')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {exp.isExpired ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          منقضی شده
                        </span>
                      ) : isUrgent ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
                          {exp.daysRemaining.toLocaleString('fa-IR')} روز مانده
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300">
                          {exp.daysRemaining.toLocaleString('fa-IR')} روز
                        </span>
                      )}
                      <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                );
              })}

              {filteredExpiring.length === 0 && (
                <div className="text-center py-10 text-slate-400 flex flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    وضعیت سررسیدها عالی است
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    هیچ دارایی در ۳۰ روز آینده منقضی نمی‌شود.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-border-subtle flex items-center justify-between text-xs text-slate-500">
            <span>سیستم یادآورهای هوشمند فعال است</span>
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              پایش خودکار ایمیل و نوتیفیکیشن
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
