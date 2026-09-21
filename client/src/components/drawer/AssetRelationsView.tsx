import React, { useState, useEffect, useMemo } from 'react';
import {
  Network,
  Share2,
  Server,
  Globe,
  Database,
  Cpu,
  Layers,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  ExternalLink,
  Search,
  X,
  AlertTriangle,
  Info,
  Shield,
  Archive,
  Link2,
  GitFork,
  Radio,
  Check,
  Loader2
} from 'lucide-react';
import {
  Asset,
  AssetRelation,
  AssetRelationType,
  AssetRelationsData,
  assetsService
} from '../../services/assets.service.ts';
import { AssetType } from '../../services/asset-types.service.ts';
import { useToast } from '../../context/ToastContext.tsx';

interface AssetRelationsViewProps {
  asset: Asset;
  assetType: AssetType;
  onNavigateToAsset?: (assetId: string) => void;
  onRelationsUpdated?: () => void;
}

interface RelationConfig {
  label: string;
  inboundLabel: string;
  outboundLabel: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  lineColor: string;
  icon: any;
}

const RELATION_CONFIGS: Record<AssetRelationType, RelationConfig> = {
  HOSTED_ON: {
    label: 'میزبانی روی / مستقر در',
    inboundLabel: 'میزبان دارایی‌های زیر است',
    outboundLabel: 'مستقر و در حال اجرا روی',
    description: 'این دارایی روی سرور، کانتینر یا هاست مقصد میزبانی و اجرا می‌شود.',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    lineColor: '#6366f1',
    icon: Server,
  },
  DEPENDS_ON: {
    label: 'وابسته به / نیازمند سرویس',
    inboundLabel: 'پیش‌نیاز کارکرد دارایی‌های زیر است',
    outboundLabel: 'وابسته به و نیازمند سرویس',
    description: 'برای ارائه خدمات صحیح به پایگاه‌داده، کش یا سرویس دیگر متکی است.',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    badgeText: 'text-amber-700 dark:text-amber-300',
    lineColor: '#f59e0b',
    icon: GitFork,
  },
  POINTS_TO: {
    label: 'اشاره به / مسیریابی (DNS/Proxy)',
    inboundLabel: 'هدایت ترافیک و شبکه از',
    outboundLabel: 'اشاره به و مسیریابی به',
    description: 'ترافیک دامنه، رکورد DNS یا پروکسی را به این مقصد هدایت می‌کند.',
    badgeBg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800',
    badgeText: 'text-sky-700 dark:text-sky-300',
    lineColor: '#0ea5e9',
    icon: Globe,
  },
  BACKUP_OF: {
    label: 'نسخه پشتیبان از',
    inboundLabel: 'پشتیبان‌گیری شده توسط',
    outboundLabel: 'نسخه پشتیبان از دارایی',
    description: 'فضای ذخیره‌سازی، هارد اکسترنال یا باکت پشتیبان این دارایی است.',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    lineColor: '#10b981',
    icon: Archive,
  },
  RELATED_TO: {
    label: 'ارتباط عمومی / همبسته',
    inboundLabel: 'دارایی‌های مرتبط با این مورد',
    outboundLabel: 'مرتبط با دارایی',
    description: 'ارتباط کاری، سازمانی یا قراردادی بین این دو دارایی وجود دارد.',
    badgeBg: 'bg-slate-100 dark:bg-surface-3 border-slate-200 dark:border-border-strong',
    badgeText: 'text-slate-700 dark:text-slate-300',
    lineColor: '#64748b',
    icon: Share2,
  },
};

/**
 * تعیین آیکون دسته بر اساس نام آیکون یا کلمه کلیدی
 */
function resolveTypeIcon(iconName?: string) {
  switch (iconName?.toLowerCase()) {
    case 'server':
    case 'vps':
      return Server;
    case 'globe':
    case 'domain':
      return Globe;
    case 'database':
      return Database;
    case 'cpu':
      return Cpu;
    case 'shield':
    case 'key':
      return Shield;
    default:
      return Layers;
  }
}

export function AssetRelationsView({
  asset,
  assetType,
  onNavigateToAsset,
  onRelationsUpdated,
}: AssetRelationsViewProps) {
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
  const [relationsData, setRelationsData] = useState<AssetRelationsData>({ outbound: [], inbound: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);

  // استیت‌های مودال افزودن ارتباط
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetAssetId, setTargetAssetId] = useState('');
  const [selectedType, setSelectedType] = useState<AssetRelationType>('HOSTED_ON');
  const [relationNote, setRelationNote] = useState('');
  const [searchTargetQuery, setSearchTargetQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingRelationId, setDeletingRelationId] = useState<string | null>(null);

  // بارگذاری ارتباطات دارایی
  const loadRelations = async () => {
    setIsLoading(true);
    try {
      const res = await assetsService.getRelations(asset.id);
      setRelationsData(res);
    } catch {
      // فال‌بک دمو / لوکال
      loadDemoRelations();
    } finally {
      setIsLoading(false);
    }
  };

  // دریافت تمام دارایی‌ها برای انتخاب در منوی افزودن ارتباط
  const loadAvailableAssets = async () => {
    try {
      const res = await assetsService.getAll({ limit: 100 });
      setAvailableAssets(res.items.filter((a) => a.id !== asset.id));
    } catch {
      const stored = localStorage.getItem('daftar_demo_assets');
      if (stored) {
        try {
          const list = JSON.parse(stored);
          setAvailableAssets(list.filter((a: Asset) => a.id !== asset.id));
        } catch {}
      }
    }
  };

  // فال‌بک حالت دمو
  const loadDemoRelations = () => {
    const demoAssetsStr = localStorage.getItem('daftar_demo_assets');
    let allAssets: Asset[] = [];
    if (demoAssetsStr) {
      try {
        allAssets = JSON.parse(demoAssetsStr);
      } catch {}
    }

    const currentInList = allAssets.find((a) => a.id === asset.id) || asset;
    const outboundRaw: any[] = (currentInList.values as any)?.__relations || currentInList.relations || [];

    const outbound: AssetRelation[] = outboundRaw.map((r) => {
      const target = allAssets.find((a) => a.id === r.targetAssetId);
      return {
        ...r,
        targetAsset: target
          ? {
              id: target.id,
              title: target.title,
              assetTypeId: target.assetTypeId,
              assetTypeName: target.assetType?.name || 'سایر',
              assetTypeIcon: target.assetType?.icon || 'Box',
              assetTypeSlug: target.assetType?.slug || 'other',
            }
          : {
              id: r.targetAssetId,
              title: 'سرور دیتاسنتر اصلی',
              assetTypeName: 'سرورهای مجازی',
              assetTypeIcon: 'Server',
              assetTypeSlug: 'vps',
            },
      };
    });

    const inbound: AssetRelation[] = [];
    for (const a of allAssets) {
      if (a.id === asset.id) continue;
      const aRels: any[] = (a.values as any)?.__relations || a.relations || [];
      for (const r of aRels) {
        if (r.targetAssetId === asset.id) {
          inbound.push({
            id: r.id,
            sourceAssetId: a.id,
            targetAssetId: asset.id,
            type: r.type,
            note: r.note,
            sourceAsset: {
              id: a.id,
              title: a.title,
              assetTypeId: a.assetTypeId,
              assetTypeName: a.assetType?.name || 'سایر',
              assetTypeIcon: a.assetType?.icon || 'Box',
              assetTypeSlug: a.assetType?.slug || 'other',
            },
          });
        }
      }
    }

    // اگر دمو خالی بود، مقادیر واقع‌گرایانه پیش‌فرض بر اساس نوع دارایی نشان بده
    if (outbound.length === 0 && inbound.length === 0) {
      if (assetType.slug === 'vps' || asset.title.includes('سرور')) {
        inbound.push({
          id: 'demo-rel-in-1',
          sourceAssetId: 'demo-db-1',
          targetAssetId: asset.id,
          type: 'HOSTED_ON',
          note: 'پورت 5432 - کانتینر postgres-prod',
          sourceAsset: {
            id: 'demo-db-1',
            title: 'دیتابیس اصلی PostgreSQL (کانتینر داکر)',
            assetTypeId: 'vps',
            assetTypeName: 'سرورهای مجازی و دیتابیس',
            assetTypeIcon: 'Database',
            assetTypeSlug: 'vps',
          },
        });
        inbound.push({
          id: 'demo-rel-in-2',
          sourceAssetId: 'dom-1',
          targetAssetId: asset.id,
          type: 'POINTS_TO',
          note: 'DNS A Record -> 10.0.1.5',
          sourceAsset: {
            id: 'dom-1',
            title: 'دامنه اصلی شرکت (company.ir)',
            assetTypeId: 'domains',
            assetTypeName: 'دامنه‌ها و DNS',
            assetTypeIcon: 'Globe',
            assetTypeSlug: 'domains',
          },
        });
      } else {
        outbound.push({
          id: 'demo-rel-out-1',
          targetAssetId: 'vps-1',
          type: 'HOSTED_ON',
          note: 'روی پورت 8080',
          targetAsset: {
            id: 'vps-1',
            title: 'سرور اصلی دیتاسنتر تهران',
            assetTypeId: 'vps',
            assetTypeName: 'سرورهای مجازی',
            assetTypeIcon: 'Server',
            assetTypeSlug: 'vps',
          },
        });
      }
    }

    setRelationsData({ outbound, inbound });
  };

  useEffect(() => {
    loadRelations();
    loadAvailableAssets();
  }, [asset.id]);

  // ثبت ارتباط جدید
  const handleAddRelation = async () => {
    if (!targetAssetId) {
      showToast('لطفاً دارایی مقصد را انتخاب کنید.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      try {
        await assetsService.addRelation(asset.id, {
          targetAssetId,
          type: selectedType,
          note: relationNote.trim() || undefined,
        });
      } catch {
        // ذخیره در حالت دمو
        const stored = localStorage.getItem('daftar_demo_assets');
        if (stored) {
          try {
            const list: Asset[] = JSON.parse(stored);
            const idx = list.findIndex((a) => a.id === asset.id);
            if (idx >= 0) {
              const currentVals = (list[idx].values as any) || {};
              const curRels = Array.isArray(currentVals.__relations) ? currentVals.__relations : [];
              curRels.push({
                id: `demo-rel-${Date.now()}`,
                targetAssetId,
                type: selectedType,
                note: relationNote.trim() || undefined,
              });
              currentVals.__relations = curRels;
              list[idx].values = currentVals;
              localStorage.setItem('daftar_demo_assets', JSON.stringify(list));
            }
          } catch {}
        }
      }

      showToast('ارتباط با موفقیت ایجاد گردید.', 'success');
      setIsAddModalOpen(false);
      setTargetAssetId('');
      setRelationNote('');
      loadRelations();
      if (onRelationsUpdated) onRelationsUpdated();
    } catch (err: any) {
      showToast(err.message || 'خطا در ایجاد ارتباط.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // حذف ارتباط
  const handleDeleteRelation = async (relationId: string) => {
    setDeletingRelationId(relationId);
    try {
      try {
        await assetsService.deleteRelation(asset.id, relationId);
      } catch {
        // حذف در حالت دمو
        const stored = localStorage.getItem('daftar_demo_assets');
        if (stored) {
          try {
            const list: Asset[] = JSON.parse(stored);
            const idx = list.findIndex((a) => a.id === asset.id);
            if (idx >= 0) {
              const currentVals = (list[idx].values as any) || {};
              const curRels = Array.isArray(currentVals.__relations) ? currentVals.__relations : [];
              currentVals.__relations = curRels.filter((r: any) => r.id !== relationId);
              list[idx].values = currentVals;
              localStorage.setItem('daftar_demo_assets', JSON.stringify(list));
            }
          } catch {}
        }
      }

      showToast('ارتباط با موفقیت حذف گردید.', 'success');
      loadRelations();
      if (onRelationsUpdated) onRelationsUpdated();
    } catch (err: any) {
      showToast(err.message || 'خطا در حذف ارتباط.', 'error');
    } finally {
      setDeletingRelationId(null);
    }
  };

  const totalConnections = relationsData.outbound.length + relationsData.inbound.length;

  // فیلتر دارایی‌ها برای سرچ در انتخاب دارایی مقصد
  const filteredAvailableAssets = useMemo(() => {
    const q = searchTargetQuery.trim().toLowerCase();
    // دارایی‌هایی که در حال حاضر ارتباط خروجی با آن‌ها داریم را حذف کن تا تکراری نشود
    const existingTargetIds = new Set(relationsData.outbound.map((r) => r.targetAssetId));

    return availableAssets
      .filter((a) => !existingTargetIds.has(a.id))
      .filter((a) => {
        if (!q) return true;
        return (
          a.title.toLowerCase().includes(q) ||
          (a.assetType?.name && a.assetType.name.toLowerCase().includes(q))
        );
      });
  }, [availableAssets, searchTargetQuery, relationsData.outbound]);

  const CurrentTypeIcon = resolveTypeIcon(assetType.icon);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* هدر بخش ارتباطات با آمار و دکمه افزودن */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-surface-2 border border-slate-200/80 dark:border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>ارتباطات، وابستگی‌ها و توپولوژی (Asset Dependencies)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                {totalConnections} ارتباط فعال
              </span>
            </h4>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
              {relationsData.inbound.length} دارایی وابسته به این مورد •{' '}
              {relationsData.outbound.length} اتصال خروجی
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* سوئیچر حالت گراف / لیست */}
          <div className="flex items-center p-0.5 bg-slate-200/80 dark:bg-surface-3 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setViewMode('graph')}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                viewMode === 'graph'
                  ? 'bg-white dark:bg-surface-1 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              نمای گراف
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-surface-1 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              نمای فهرست
            </button>
          </div>

          {/* دکمه باز کردن مودال افزودن رابطه */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>افزودن ارتباط</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span className="text-xs">در حال بارگذاری روابط و وابستگی‌ها...</span>
        </div>
      ) : totalConnections === 0 ? (
        /* وضعیت عدم وجود ارتباط */
        <div className="py-14 text-center text-slate-400 border border-dashed border-slate-200 dark:border-border-strong rounded-2xl p-6 space-y-3">
          <Share2 className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
          <div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              هیچ ارتباطی برای این دارایی تعریف نشده است.
            </p>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
              شما می‌توانید مشخص کنید این دارایی روی چه سروری میزبانی می‌شود یا کدام دامنه‌ها و سرویس‌ها به
              آن متصل هستند.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60 font-semibold text-xs transition border border-indigo-200 dark:border-indigo-800"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ایجاد اولین ارتباط</span>
          </button>
        </div>
      ) : viewMode === 'graph' ? (
        /* ۱. نمای بصری گراف و توپولوژی (Visual Topology Graph) */
        <div className="relative rounded-2xl border border-slate-200 dark:border-border-strong bg-radial from-slate-50 via-white to-slate-100 dark:from-surface-2/40 dark:via-surface-1 dark:to-surface-2/70 p-5 overflow-hidden min-h-[380px] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pb-2 border-b border-slate-200/60 dark:border-border-subtle">
            <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
              <Radio className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
              <span>نقشه زنده توپولوژی اتصالات و وابستگی‌ها</span>
            </span>
            <span>کلیک روی گره‌ها = مشاهده مشخصات</span>
          </div>

          {/* محوطه رندر گره‌ها و لایه‌ها */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center my-6">
            {/* ستون راست: دارایی‌های ورودی / بالادستی (Inbound Dependents) */}
            <div className="space-y-3">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center md:justify-start gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5 text-emerald-500" />
                <span>دارایی‌های وابسته به این مورد ({relationsData.inbound.length})</span>
              </div>

              {relationsData.inbound.length === 0 ? (
                <div className="p-3 text-center rounded-xl border border-dashed border-slate-200 dark:border-border-subtle text-[11px] text-slate-400">
                  سرویس مستقیمی به این مورد متصل نیست
                </div>
              ) : (
                relationsData.inbound.map((rel) => {
                  const InboundIcon = resolveTypeIcon(rel.sourceAsset?.assetTypeIcon);
                  const cfg = RELATION_CONFIGS[rel.type] || RELATION_CONFIGS.RELATED_TO;
                  return (
                    <div
                      key={rel.id}
                      onClick={() => onNavigateToAsset && rel.sourceAsset && onNavigateToAsset(rel.sourceAsset.id)}
                      className="group p-3 rounded-xl bg-white dark:bg-surface-2 border border-slate-200 dark:border-border-subtle shadow-2xs hover:border-emerald-500 dark:hover:border-emerald-500/60 hover:shadow-md transition cursor-pointer relative"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition">
                          <InboundIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {rel.sourceAsset?.title}
                            </span>
                            <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                            {rel.sourceAsset?.assetTypeName}
                          </span>
                          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${cfg.badgeBg} ${cfg.badgeText}`}
                            >
                              {cfg.label}
                            </span>
                            {rel.note && (
                              <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                                {rel.note}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ستون وسط: دارایی جاری (Central Node) */}
            <div className="flex flex-col items-center justify-center px-4">
              <div className="relative group">
                {/* حلقه پالس نورانی پیرامون دارایی جاری */}
                <div className="absolute -inset-2 bg-indigo-500/20 dark:bg-indigo-500/30 rounded-3xl blur-md group-hover:blur-lg transition" />

                <div className="relative p-5 rounded-2xl bg-white dark:bg-surface-2 border-2 border-indigo-600 dark:border-indigo-500 shadow-xl flex flex-col items-center text-center max-w-[210px]">
                  <div className="p-3.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30 mb-2.5">
                    <CurrentTypeIcon className="w-7 h-7" />
                  </div>

                  <span className="text-xs font-black text-slate-900 dark:text-white truncate w-full">
                    {asset.title}
                  </span>
                  <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {assetType.name}
                  </span>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-border-subtle w-full flex items-center justify-around text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    <span>{relationsData.inbound.length} ورودی</span>
                    <span>•</span>
                    <span>{relationsData.outbound.length} خروجی</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ستون چپ: دارایی‌های مقصد / خروجی (Outbound Dependencies) */}
            <div className="space-y-3">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center md:justify-start gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
                <span>وابستگی‌ها و اتصالات این مورد ({relationsData.outbound.length})</span>
              </div>

              {relationsData.outbound.length === 0 ? (
                <div className="p-3 text-center rounded-xl border border-dashed border-slate-200 dark:border-border-subtle text-[11px] text-slate-400">
                  وابستگی خروجی ثبت نشده است
                </div>
              ) : (
                relationsData.outbound.map((rel) => {
                  const OutboundIcon = resolveTypeIcon(rel.targetAsset?.assetTypeIcon);
                  const cfg = RELATION_CONFIGS[rel.type] || RELATION_CONFIGS.RELATED_TO;
                  return (
                    <div
                      key={rel.id}
                      className="group p-3 rounded-xl bg-white dark:bg-surface-2 border border-slate-200 dark:border-border-subtle shadow-2xs hover:border-indigo-500 dark:hover:border-indigo-500/60 hover:shadow-md transition relative"
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          onClick={() => onNavigateToAsset && rel.targetAsset && onNavigateToAsset(rel.targetAsset.id)}
                          className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:scale-110 transition cursor-pointer"
                        >
                          <OutboundIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span
                              onClick={() => onNavigateToAsset && rel.targetAsset && onNavigateToAsset(rel.targetAsset.id)}
                              className="font-bold text-xs text-slate-900 dark:text-white truncate cursor-pointer hover:underline"
                            >
                              {rel.targetAsset?.title}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteRelation(rel.id)}
                              disabled={deletingRelationId === rel.id}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                              title="حذف این ارتباط"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                            {rel.targetAsset?.assetTypeName}
                          </span>
                          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${cfg.badgeBg} ${cfg.badgeText}`}
                            >
                              {cfg.label}
                            </span>
                            {rel.note && (
                              <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                                {rel.note}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 p-2.5 rounded-xl bg-slate-100/70 dark:bg-surface-3/50 flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>
              <strong>تحلیل اثر قطعی (Blast Radius):</strong> در صورت بروز اختلال یا خاموشی این دارایی، تمام{' '}
              <strong>{relationsData.inbound.length}</strong> دارایی سمت راست تحت تأثیر مستقیم قرار خواهند گرفت.
            </span>
          </div>
        </div>
      ) : (
        /* ۲. نمای تفکیک‌شده لیست (Structured List View) */
        <div className="space-y-5">
          {/* بخش الف: دارایی‌های ورودی / وابسته به این مورد */}
          <div className="space-y-2.5">
            <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <ArrowLeft className="w-4 h-4 text-emerald-500" />
              <span>دارایی‌های وابسته به این مورد ({relationsData.inbound.length} مورد)</span>
            </h5>

            {relationsData.inbound.length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-slate-50 dark:bg-surface-2 border border-slate-200 dark:border-border-subtle text-xs text-slate-400">
                هیچ دارایی دیگری وابستگی مستقیم به این دارایی ندارد.
              </div>
            ) : (
              <div className="space-y-2">
                {relationsData.inbound.map((rel) => {
                  const InboundIcon = resolveTypeIcon(rel.sourceAsset?.assetTypeIcon);
                  const cfg = RELATION_CONFIGS[rel.type] || RELATION_CONFIGS.RELATED_TO;
                  return (
                    <div
                      key={rel.id}
                      className="p-3.5 rounded-xl bg-white dark:bg-surface-2 border border-slate-200 dark:border-border-subtle flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 dark:hover:border-border-strong transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                          <InboundIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {rel.sourceAsset?.title}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${cfg.badgeBg} ${cfg.badgeText}`}
                            >
                              {cfg.inboundLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            <span>دسته: {rel.sourceAsset?.assetTypeName}</span>
                            {rel.note && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-slate-600 dark:text-slate-300">
                                  {rel.note}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {onNavigateToAsset && rel.sourceAsset && (
                        <button
                          type="button"
                          onClick={() => onNavigateToAsset(rel.sourceAsset!.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-border-subtle hover:bg-slate-50 dark:hover:bg-surface-3 text-xs font-semibold text-slate-700 dark:text-slate-300 transition shrink-0"
                        >
                          <span>مشاهده</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* بخش ب: دارایی‌های خروجی / این دارایی وابسته است به */}
          <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-border-subtle">
            <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-indigo-500" />
              <span>اتصالات و وابستگی‌های این دارایی ({relationsData.outbound.length} مورد)</span>
            </h5>

            {relationsData.outbound.length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-slate-50 dark:bg-surface-2 border border-slate-200 dark:border-border-subtle text-xs text-slate-400">
                این دارایی وابستگی خروجی ثبت‌شده‌ای ندارد.
              </div>
            ) : (
              <div className="space-y-2">
                {relationsData.outbound.map((rel) => {
                  const OutboundIcon = resolveTypeIcon(rel.targetAsset?.assetTypeIcon);
                  const cfg = RELATION_CONFIGS[rel.type] || RELATION_CONFIGS.RELATED_TO;
                  return (
                    <div
                      key={rel.id}
                      className="p-3.5 rounded-xl bg-white dark:bg-surface-2 border border-slate-200 dark:border-border-subtle flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 dark:hover:border-border-strong transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shrink-0">
                          <OutboundIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {rel.targetAsset?.title}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${cfg.badgeBg} ${cfg.badgeText}`}
                            >
                              {cfg.outboundLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            <span>دسته: {rel.targetAsset?.assetTypeName}</span>
                            {rel.note && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-slate-600 dark:text-slate-300">
                                  {rel.note}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {onNavigateToAsset && rel.targetAsset && (
                          <button
                            type="button"
                            onClick={() => onNavigateToAsset(rel.targetAsset!.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-border-subtle hover:bg-slate-50 dark:hover:bg-surface-3 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
                          >
                            <span>مشاهده</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteRelation(rel.id)}
                          disabled={deletingRelationId === rel.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                          title="حذف ارتباط"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* مودال افزودن ارتباط جدید (Add Connection Modal) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* هدر مودال */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-border-subtle">
              <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    ایجاد ارتباط و اتصال جدید
                  </h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    مبدا ارتباط: <strong>{asset.title}</strong>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-surface-2 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* بدنه فرم */}
            <div className="space-y-4 text-xs">
              {/* ۱. انتخاب دارایی مقصد */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  دارایی مقصد را انتخاب کنید:
                </label>

                {/* فیلد جستجو در دارایی‌ها */}
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTargetQuery}
                    onChange={(e) => setSearchTargetQuery(e.target.value)}
                    placeholder="جستجو در بین عناوین و دسته‌بندی‌ها..."
                    className="w-full pr-8 pl-3 py-1.5 rounded-lg border border-slate-200 dark:border-border-strong bg-slate-50 dark:bg-surface-2 text-xs text-slate-800 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 dark:border-border-strong divide-y divide-slate-100 dark:divide-border-subtle bg-slate-50/50 dark:bg-surface-2">
                  {filteredAvailableAssets.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-[11px]">
                      دارایی منطبقی برای اتصال یافت نشد.
                    </div>
                  ) : (
                    filteredAvailableAssets.map((target) => {
                      const TargetIcon = resolveTypeIcon(target.assetType?.icon);
                      const isSelected = targetAssetId === target.id;
                      return (
                        <div
                          key={target.id}
                          onClick={() => setTargetAssetId(target.id)}
                          className={`p-2.5 flex items-center justify-between cursor-pointer transition ${
                            isSelected
                              ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold'
                              : 'hover:bg-slate-100/70 dark:hover:bg-surface-3/60 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <div
                              className={`p-1.5 rounded-lg ${
                                isSelected
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-200 dark:bg-surface-3 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              <TargetIcon className="w-3.5 h-3.5" />
                            </div>
                            <div className="truncate">
                              <span className="block truncate text-xs">{target.title}</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                                {target.assetType?.name || 'سایر'}
                              </span>
                            </div>
                          </div>

                          {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ۲. نوع ارتباط */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  نوع ارتباط (Relationship Type):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.keys(RELATION_CONFIGS) as AssetRelationType[]).map((relType) => {
                    const cfg = RELATION_CONFIGS[relType];
                    const RelIcon = cfg.icon;
                    const isSelected = selectedType === relType;

                    return (
                      <div
                        key={relType}
                        onClick={() => setSelectedType(relType)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                          isSelected
                            ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-2xs'
                            : 'border-slate-200 dark:border-border-subtle hover:bg-slate-50 dark:hover:bg-surface-2 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div
                          className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 dark:bg-surface-3 text-slate-500'
                          }`}
                        >
                          <RelIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-xs block">{cfg.label}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                            {cfg.description}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ۳. یادداشت اختیاری */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  یادداشت یا توضیحات فنی (اختیاری):
                </label>
                <input
                  type="text"
                  value={relationNote}
                  onChange={(e) => setRelationNote(e.target.value)}
                  placeholder="مثال: پورت ۵۴۳۲، کانتینر docker، رکورد DNS A و ..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-border-strong bg-slate-50 dark:bg-surface-2 text-xs text-slate-800 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>

            {/* دکمه‌های فرم */}
            <div className="pt-3 border-t border-slate-200 dark:border-border-subtle flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-border-subtle hover:bg-slate-100 dark:hover:bg-surface-2 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleAddRelation}
                disabled={isSubmitting || !targetAssetId}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>در حال ثبت ارتباط...</span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    <span>ثبت ارتباط</span>
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
