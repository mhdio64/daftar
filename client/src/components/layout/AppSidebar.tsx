import React from 'react';
import {
  LayoutDashboard,
  Plus,
  Clock,
  Users,
  ShieldCheck,
  Settings,
  LogOut,
} from 'lucide-react';
import { AssetType } from '../../services/asset-types.service';
import { AssetIcon } from '../common/AssetIcon';

export type ActiveTab = 'dashboard' | 'assets' | 'reminders' | 'audit' | 'users' | 'settings';

interface AppSidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  assetTypes: AssetType[];
  activeTypeId: string | null;
  onSelectAssetType: (id: string) => void;
  userRole?: string;
  onLogout: () => void;
  isAddingNewType: boolean;
  setIsAddingNewType: (open: boolean) => void;
  newTypeName: string;
  setNewTypeName: (val: string) => void;
  newTypeSlug: string;
  setNewTypeSlug: (val: string) => void;
  newTypeIcon: string;
  setNewTypeIcon: (val: string) => void;
  onOpenIconGallery: () => void;
  onCreateNewType: (e: React.FormEvent) => void;
}

const QUICK_ICONS = [
  { id: 'Server', label: 'سرور' },
  { id: 'Cpu', label: 'سخت‌افزار' },
  { id: 'Database', label: 'دیتابیس' },
  { id: 'Network', label: 'شبکه' },
  { id: 'Shield', label: 'امنیت' },
  { id: 'Key', label: 'لایسنس' },
  { id: 'Globe', label: 'دامنه' },
  { id: 'Mail', label: 'ایمیل' },
  { id: 'Terminal', label: 'ترمینال' },
  { id: 'Cloud', label: 'ابری' },
  { id: 'HardDrive', label: 'دیسک' },
  { id: 'Wifi', label: 'وایرلس' },
];

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  setActiveTab,
  assetTypes,
  activeTypeId,
  onSelectAssetType,
  userRole,
  onLogout,
  isAddingNewType,
  setIsAddingNewType,
  newTypeName,
  setNewTypeName,
  newTypeSlug,
  setNewTypeSlug,
  newTypeIcon,
  setNewTypeIcon,
  onOpenIconGallery,
  onCreateNewType,
}) => {
  return (
    <aside className="w-64 border-l border-slate-200 dark:border-border-subtle bg-white dark:bg-surface-1 flex flex-col justify-between shrink-0 shadow-xs">
      <div>
        {/* هدر برند */}
        <div className="h-14 border-b border-slate-200 dark:border-border-subtle flex items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm">
              دف
            </div>
            <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">سامانه دفتر</span>
          </div>
          <span className="text-[11px] font-mono bg-slate-100 dark:bg-surface-2 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/20 font-medium">
            v1.0
          </span>
        </div>

        {/* دکمه داشبورد مدیریتی و آماری */}
        <div className="p-3 pb-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 dark:bg-indigo-600 dark:text-white'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-surface-2 dark:hover:text-slate-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard className="w-4 h-4" />
              <span>داشبورد مدیریتی</span>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'dashboard'
                  ? 'bg-white/20 text-white'
                  : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
              }`}
            >
              آمار و بودجه
            </span>
          </button>
        </div>

        {/* لیست دسته‌ها */}
        <div className="p-3 pt-2">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              دسته‌بندی دارایی‌ها
            </span>
            {userRole === 'ADMIN' && (
              <button
                onClick={() => setIsAddingNewType(!isAddingNewType)}
                className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1 rounded hover:bg-slate-100 dark:hover:bg-surface-2 transition"
                title="افزودن دسته‌بندی جدید"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* فرم بازشونده ایجاد دسته جدید */}
          {isAddingNewType && (
            <form
              onSubmit={onCreateNewType}
              className="p-3 mb-2 bg-slate-50 dark:bg-surface-2 rounded-2xl space-y-2.5 border border-slate-200 dark:border-border-strong text-xs shadow-xs animate-in fade-in duration-150"
            >
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  نام نوع دارایی <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثلاً روترها، لایسنس‌ها، دوربین‌ها"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  className="w-full bg-white dark:bg-surface-1 border border-slate-300 dark:border-border-subtle rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 transition"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  نامک انگلیسی (Slug) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="routers"
                  value={newTypeSlug}
                  onChange={(e) => setNewTypeSlug(e.target.value)}
                  dir="ltr"
                  className="w-full bg-white dark:bg-surface-1 border border-slate-300 dark:border-border-subtle rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-mono placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 transition"
                />
              </div>

              {/* انتخاب آیکون نوع دارایی */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    آیکون شاخص دسته:
                  </label>
                  <button
                    type="button"
                    onClick={onOpenIconGallery}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                  >
                    گالری کامل آیکون‌ها...
                  </button>
                </div>

                {/* نوار انتخاب سریع آیکون‌های پرکاربرد */}
                <div className="grid grid-cols-6 gap-1 p-1.5 bg-white dark:bg-surface-1 rounded-xl border border-slate-200 dark:border-border-subtle">
                  {QUICK_ICONS.map((item) => {
                    const isSelected = (newTypeIcon || 'Server').toLowerCase() === item.id.toLowerCase();
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setNewTypeIcon(item.id)}
                        className={`p-1.5 rounded-lg flex flex-col items-center justify-center transition ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs scale-105 ring-2 ring-indigo-400/40'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-2'
                        }`}
                        title={`${item.label} (${item.id})`}
                      >
                        <AssetIcon name={item.id} className="w-3.5 h-3.5" />
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1 px-1">
                  <span>
                    آیکون انتخابی:{' '}
                    <strong className="text-indigo-600 dark:text-indigo-400 font-mono">
                      {newTypeIcon || 'Server'}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-1.5 border-t border-slate-200 dark:border-border-subtle">
                <button
                  type="button"
                  onClick={() => setIsAddingNewType(false)}
                  className="px-2.5 py-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ثبت نوع دارایی</span>
                </button>
              </div>
            </form>
          )}

          <nav className="space-y-1">
            {assetTypes.map((type) => {
              const isActive = activeTab === 'assets' && activeTypeId === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => {
                    setActiveTab('assets');
                    onSelectAssetType(type.id);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs dark:bg-indigo-600/15 dark:text-indigo-400 dark:border-indigo-500/30'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-surface-2 dark:hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <AssetIcon name={type.icon || 'Server'} className="w-4 h-4" />
                    <span>{type.name}</span>
                  </div>
                  {type.assetCount !== undefined && (
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-medium ${
                        isActive
                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300'
                          : 'bg-slate-100 text-slate-600 border border-slate-200/70 dark:bg-surface-3/80 dark:text-slate-300 dark:border dark:border-white/5'
                      }`}
                    >
                      {type.assetCount}
                    </span>
                  )}
                </button>
              );
            })}

            {assetTypes.length === 0 && (
              <div className="text-center py-4 text-xs text-slate-400">
                دسته‌بندی وجود ندارد.
              </div>
            )}
          </nav>
        </div>
      </div>

      {/* بخش پایین سایدبار: ابزارهای سیستم */}
      <div className="p-3 border-t border-slate-200 dark:border-border-subtle space-y-1">
        <button
          onClick={() => setActiveTab('reminders')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
            activeTab === 'reminders'
              ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-xs dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-surface-2 dark:hover:text-slate-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>یادآورهای سررسید</span>
          </div>
          <span className="text-[11px] bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 px-2 py-0.5 rounded-full font-mono font-bold">
            پایش
          </span>
        </button>

        {userRole === 'ADMIN' && (
          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === 'users'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs dark:bg-indigo-600/15 dark:text-indigo-400 dark:border-indigo-500/30'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-surface-2 dark:hover:text-slate-100'
            }`}
          >
            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>کاربران و دسترسی‌ها</span>
          </button>
        )}

        {userRole === 'ADMIN' && (
          <button
            onClick={() => setActiveTab('audit')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === 'audit'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-surface-2 dark:hover:text-slate-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>لاگ‌های ممیزی و امنیت</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
              Audit
            </span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('settings')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
            activeTab === 'settings'
              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs dark:bg-indigo-600/15 dark:text-indigo-400 dark:border-indigo-500/30'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-surface-2 dark:hover:text-slate-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>تنظیمات سامانه</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-surface-2 text-slate-600 dark:text-slate-400 font-mono font-bold">
            Config
          </span>
        </button>

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 hover:bg-rose-50 hover:text-rose-700 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 text-xs font-medium transition mt-2"
        >
          <LogOut className="w-4 h-4" />
          <span>خروج از حساب</span>
        </button>
      </div>
    </aside>
  );
};
