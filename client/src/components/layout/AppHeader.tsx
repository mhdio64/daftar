import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  ScanLine,
  KeyRound,
  Moon,
  Sun,
  Bell,
  ChevronDown,
  User as UserIcon,
  LogOut,
} from 'lucide-react';

interface AppHeaderUser {
  id?: string;
  username?: string;
  fullName?: string;
  role?: string;
}

interface AppHeaderProps {
  onOpenCommandPalette: () => void;
  onOpenQrScanner: () => void;
  onOpenPasswordGenerator: () => void;
  theme: string;
  toggleTheme: () => void;
  onNavigateToReminders: () => void;
  user: AppHeaderUser | null;
  avatarBgClass: string;
  onOpenProfileModal: () => void;
  onLogout: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onOpenCommandPalette,
  onOpenQrScanner,
  onOpenPasswordGenerator,
  theme,
  toggleTheme,
  onNavigateToReminders,
  user,
  avatarBgClass,
  onOpenProfileModal,
  onLogout,
}) => {
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="relative z-30 h-14 border-b border-slate-200 dark:border-border-subtle bg-white/95 dark:bg-surface-1/90 backdrop-blur px-6 flex items-center justify-between shrink-0 shadow-xs">
      {/* باکس جستجوی سراسری (Ctrl + K) */}
      <div className="flex items-center gap-3 w-96">
        <button
          onClick={onOpenCommandPalette}
          className="w-full bg-slate-100 dark:bg-surface-2 border border-slate-200 hover:border-slate-300 dark:border-border-strong dark:hover:border-indigo-500 rounded-lg pr-9 pl-12 py-1.5 text-xs text-slate-600 dark:text-slate-300 text-right transition relative flex items-center shadow-xs"
        >
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <span>جستجوی سریع سراسری...</span>
          <kbd className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono font-medium shadow-2xs">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* نشانگرهای سررسید، تم، ابزارها و کاربر */}
      <div className="flex items-center gap-3">
        {/* دکمه اسکن بارکد و QR اموال */}
        <button
          onClick={onOpenQrScanner}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-border-strong text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-surface-2 text-xs font-semibold transition shadow-2xs"
          title="اسکن بارکد و شناسنامه اموال فیزیکی"
        >
          <ScanLine className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden sm:inline">اسکن بارکد اموال</span>
        </button>

        {/* دکمه ابزار سریع تولید رمز عبور */}
        <button
          onClick={onOpenPasswordGenerator}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-border-strong text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-surface-2 text-xs font-semibold transition shadow-2xs"
          title="تولیدکننده کلمه عبور و عبارت عبور تصادفی"
        >
          <KeyRound className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span className="hidden sm:inline">تولید رمز عبور</span>
        </button>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg border border-slate-200 dark:border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-2 transition shadow-2xs"
          title={theme === 'light' ? 'فعال‌سازی تم تیره' : 'فعال‌سازی تم روشن'}
        >
          {theme === 'light' ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>

        <button
          onClick={onNavigateToReminders}
          className="relative p-2 rounded-lg border border-slate-200 dark:border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-2 transition shadow-2xs"
          title="مشاهده سررسیدها"
        >
          <Bell className="w-4 h-4" />
        </button>

        <div className="h-5 w-px bg-slate-200 dark:bg-border-subtle" />

        {/* منوی شناور کاربر در هدر با کلیک روی آواتار */}
        <div className="relative z-50" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-surface-2 transition text-right group border border-transparent hover:border-slate-200 dark:hover:border-border-strong cursor-pointer"
          >
            <div
              className={`w-7 h-7 rounded-xl ${avatarBgClass} text-white flex items-center justify-center text-xs font-bold shadow-xs transition-transform group-hover:scale-105`}
            >
              {user?.fullName?.slice(0, 2) || 'کار'}
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-900 dark:text-white leading-tight flex items-center gap-1">
                <span>{user?.fullName}</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                {user?.role === 'ADMIN' ? 'مدیر ارشد' : user?.role === 'EDITOR' ? 'اپراتور' : 'مشاهده‌گر'}
              </div>
            </div>
          </button>

          {/* پنجره پاپ‌اور منوی پروفایل کاربر */}
          {isUserDropdownOpen && (
            <div
              className="absolute left-0 top-full mt-2 w-72 rounded-2xl bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong shadow-2xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150"
              dir="rtl"
            >
              {/* سربرگ مشخصات کاربر */}
              <div className="p-4 bg-slate-50/70 dark:bg-surface-2/40 border-b border-slate-200 dark:border-border-subtle flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl ${avatarBgClass} text-white flex items-center justify-center text-sm font-bold shadow-sm`}>
                  {user?.fullName?.slice(0, 2) || 'کار'}
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {user?.fullName}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                    @{user?.username}
                  </div>
                  <div className="mt-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                      {user?.role === 'ADMIN' ? 'مدیر ارشد' : user?.role === 'EDITOR' ? 'اپراتور فنی' : 'مشاهده‌گر'}
                    </span>
                  </div>
                </div>
              </div>

              {/* گزینه‌های منو */}
              <div className="p-2 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsUserDropdownOpen(false);
                    onOpenProfileModal();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-600/20 dark:hover:text-indigo-300 transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <UserIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>مشخصات و حساب کاربری من</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-surface-2 text-slate-600 dark:text-slate-400 font-bold group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40">
                    پروفایل
                  </span>
                </button>

                <div className="my-1 border-t border-slate-200 dark:border-border-subtle" />

                <button
                  type="button"
                  onClick={() => {
                    setIsUserDropdownOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>خروج از حساب کاربری</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
