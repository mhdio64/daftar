import React, { useState } from 'react';
import { 
  Sliders, 
  Bell, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Terminal, 
  Shield, 
  Lock, 
  Eye, 
  EyeOff, 
  Sun, 
  Moon, 
  RotateCcw, 
  Server, 
  Globe, 
  Mail, 
  MessageSquare, 
  Info, 
  Rows, 
  Sparkles, 
  RefreshCw, 
  Radio, 
  Check, 
  Key, 
  ExternalLink
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { alertingService } from '../../services/alerting.service.ts';
import { remindersService } from '../../services/reminders.service.ts';

export function SettingsView() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { showToast } = useToast();

  const [activeCategory, setActiveCategory] = useState<'alerts' | 'quick_connect' | 'security' | 'appearance' | 'about'>('alerts');
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [isDispatchingAll, setIsDispatchingAll] = useState(false);
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});

  const toggleShowToken = (key: string) => {
    setShowTokens((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleReset = () => {
    if (window.confirm('آیا مطمئن هستید که می‌خواهید تمام تنظیمات را به مقادیر اولیه کارخانه بازنشانی کنید؟')) {
      resetSettings();
      showToast('تنظیمات با موفقیت به حالت پیش‌فرض بازگشت.', 'success');
    }
  };

  // ارسال پیام تست به کانال مشخص
  const handleTestChannel = async (channel: 'telegram' | 'bale' | 'webhook' | 'email') => {
    setTestingChannel(channel);
    try {
      const res = await alertingService.testChannel(channel, settings.alerts);
      showToast(res.message, 'success');
    } catch (err: any) {
      showToast(err.message || 'خطا در ارسال پیام تست', 'error');
    } finally {
      setTestingChannel(null);
    }
  };

  // ارسال سراسری سررسیدها به کانال‌های فعال
  const handleDispatchDueReminders = async () => {
    setIsDispatchingAll(true);
    try {
      // دریافت لیست سررسیدها از سرویس یا استفاده از داده‌های پیش‌فرض
      let dueList: any[] = [];
      try {
        const res = await remindersService.getAll();
        dueList = res.items || [];
      } catch {
        dueList = [
          { title: 'سرور دیتابیس Hetzner', typeName: 'سرور لینوکس', expiryDate: '۱۴۰۵/۰۲/۱۵' },
          { title: 'گواهی امنیتی دامنه اصلی', typeName: 'دامنه‌ها و SSL', expiryDate: '۱۴۰۵/۰۱/۲۰' },
        ];
      }

      const res = await alertingService.dispatchReminders(dueList, settings.alerts);
      showToast(`هشدار ${res.dispatchedCount} دارایی به کانال‌های [${res.channels.join('، ')}] ارسال شد.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'خطا در توزیع هشدارها', 'error');
    } finally {
      setIsDispatchingAll(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto text-right bg-slate-50/50 dark:bg-canvas">
      {/* بدنه مرکزی متقارن و متوازن در وسط صفحه */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* هدر صفحه تنظیمات */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-border-subtle">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs shadow-indigo-600/30">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">تنظیمات سامانه دفتر</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  پیکربندی یکپارچه هشدارها و وب‌هوک‌ها، دستورهای اتصال سریع، امنیت و ظاهر نرم‌افزار
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/30 font-medium">
              ذخیره‌سازی خودکار
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-border-strong bg-white dark:bg-surface-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-elevated hover:text-rose-600 transition shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>بازنشانی پیش‌فرض</span>
            </button>
          </div>
        </div>

        {/* نوار تب‌های ناوبری دسته‌بندی‌ها */}
        <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveCategory('alerts')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeCategory === 'alerts'
                ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/30'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-2'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>کانال‌های هشدار و وب‌هوک</span>
            {settings.alerts.enableAlerts && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('quick_connect')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeCategory === 'quick_connect'
                ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/30'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-2'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>دستورهای اتصال سریع</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('security')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeCategory === 'security'
                ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/30'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-2'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>امنیت و کلمات عبور</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('appearance')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeCategory === 'appearance'
                ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/30'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-2'
            }`}
          >
            <Sun className="w-4 h-4" />
            <span>پوسته و چیدمان</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('about')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeCategory === 'about'
                ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/30'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-2'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>مشخصات سامانه</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* بخش ۱: سیستم جامع هشدار و وب‌هوک (Alerts & Webhooks) */}
        {/* ======================================================== */}
        {activeCategory === 'alerts' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* بنر اصلی: کلید سراسری فعال‌سازی سیستم هشدار */}
            <div className={`p-5 rounded-2xl border transition-all ${
              settings.alerts.enableAlerts
                ? 'bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-500/30 shadow-xs'
                : 'bg-white dark:bg-surface-1 border-slate-200 dark:border-border-strong shadow-xs'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className={`p-2.5 rounded-xl mt-0.5 ${
                    settings.alerts.enableAlerts 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-slate-100 text-slate-500 dark:bg-surface-2 dark:text-slate-400'
                  }`}>
                    <Bell className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                        سیستم ارسال هشدار و نوتیفیکیشن سررسیدها (Master Alert Switch)
                      </h2>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        settings.alerts.enableAlerts
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-surface-2 dark:text-slate-400'
                      }`}>
                        {settings.alerts.enableAlerts ? 'سیستم فعال است' : 'سیستم خاموش است'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                      با فعال بودن این قابلیت، هشدارهای سررسید نزدیک به کانال‌های پیکربندی‌شده ارسال می‌شوند. در صورت خاموش بودن این کلید، هیچ اعلانی از برنامه ارسال نخواهد شد.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.alerts.enableAlerts}
                    onClick={() => {
                      const newVal = !settings.alerts.enableAlerts;
                      updateSettings({
                        alerts: {
                          ...settings.alerts,
                          enableAlerts: newVal,
                        },
                      });
                      showToast(newVal ? 'سیستم هشدار سامانه فعال شد.' : 'سیستم هشدار به طور کامل خاموش شد.', 'info');
                    }}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings.alerts.enableAlerts ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        settings.alerts.enableAlerts ? '-translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* نوار تنظیم روزهای سررسید و تست سراسری */}
              {settings.alerts.enableAlerts && (
                <div className="mt-5 pt-4 border-t border-indigo-100 dark:border-indigo-900/30 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">ارسال اخطار در بازه‌های:</span>
                    {[
                      { days: 7, label: '۷ روز قبل' },
                      { days: 3, label: '۳ روز قبل' },
                      { days: 1, label: '۱ روز قبل' },
                      { days: 0, label: 'روز سررسید' },
                    ].map((item) => {
                      const isSelected = settings.alerts.alertDaysBefore.includes(item.days);
                      return (
                        <button
                          key={item.days}
                          type="button"
                          onClick={() => {
                            const current = settings.alerts.alertDaysBefore;
                            const next = isSelected 
                              ? current.filter((d) => d !== item.days) 
                              : [...current, item.days].sort((a, b) => b - a);
                            updateSettings({
                              alerts: {
                                ...settings.alerts,
                                alertDaysBefore: next,
                              },
                            });
                          }}
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white dark:bg-surface-1 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-border-strong hover:bg-slate-100'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={isDispatchingAll}
                    onClick={handleDispatchDueReminders}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-2xs self-start md:self-auto disabled:opacity-50"
                  >
                    <Send className={`w-3.5 h-3.5 ${isDispatchingAll ? 'animate-spin' : ''}`} />
                    <span>{isDispatchingAll ? 'در حال ارسال...' : 'توزیع فوری هشدارهای سررسید'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* گرید ۴ کانال ارتباطی اصلی (۲ ستونه ریسپانسیو و متقارن) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* ۱. کانال ربات تلگرام */}
              <div className="bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  {/* هدر کارت تلگرام */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-border-subtle">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400">
                        <Send className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">ربات تلگرام (Telegram)</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">ارسال هشدار به پی‌وی یا کانال تلگرامی</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.alerts.telegram.enabled}
                      onClick={() => {
                        updateSettings({
                          alerts: {
                            ...settings.alerts,
                            telegram: {
                              ...settings.alerts.telegram,
                              enabled: !settings.alerts.telegram.enabled,
                            },
                          },
                        });
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        settings.alerts.telegram.enabled ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          settings.alerts.telegram.enabled ? '-translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* فیلدهای ورودی تلگرام */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          توکن ربات تلگرام (Bot Token):
                        </label>
                        <button
                          type="button"
                          onClick={() => toggleShowToken('tg_token')}
                          className="text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center gap-1"
                        >
                          {showTokens['tg_token'] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>{showTokens['tg_token'] ? 'مخفی' : 'نمایش'}</span>
                        </button>
                      </div>
                      <input
                        type={showTokens['tg_token'] ? 'text' : 'password'}
                        value={settings.alerts.telegram.botToken}
                        onChange={(e) => {
                          updateSettings({
                            alerts: {
                              ...settings.alerts,
                              telegram: { ...settings.alerts.telegram, botToken: e.target.value },
                            },
                          });
                        }}
                        dir="ltr"
                        placeholder="123456789:ABCdefGhIJKlmNoPQRstUVw..."
                        className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        شناسه چت یا کانال (Chat ID):
                      </label>
                      <input
                        type="text"
                        value={settings.alerts.telegram.chatId}
                        onChange={(e) => {
                          updateSettings({
                            alerts: {
                              ...settings.alerts,
                              telegram: { ...settings.alerts.telegram, chatId: e.target.value },
                            },
                          });
                        }}
                        dir="ltr"
                        placeholder="-100123456789 یا 123456789"
                        className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        آدرس ریشه API یا پروکسی (اختیاری):
                      </label>
                      <input
                        type="text"
                        value={settings.alerts.telegram.apiRoot}
                        onChange={(e) => {
                          updateSettings({
                            alerts: {
                              ...settings.alerts,
                              telegram: { ...settings.alerts.telegram, apiRoot: e.target.value },
                            },
                          });
                        }}
                        dir="ltr"
                        placeholder="https://api.telegram.org"
                        className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>

                {/* فوتر تست تلگرام */}
                <div className="pt-3 border-t border-slate-100 dark:border-border-subtle flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">راهنما: دریافت توکن از @BotFather</span>
                  <button
                    type="button"
                    disabled={testingChannel === 'telegram'}
                    onClick={() => handleTestChannel('telegram')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:hover:bg-sky-500/20 dark:text-sky-300 font-semibold text-xs border border-sky-200 dark:border-sky-500/30 transition shadow-2xs disabled:opacity-50"
                  >
                    <Send className={`w-3 h-3 ${testingChannel === 'telegram' ? 'animate-spin' : ''}`} />
                    <span>{testingChannel === 'telegram' ? 'در حال ارسال...' : 'ارسال پیام تست'}</span>
                  </button>
                </div>
              </div>

              {/* ۲. کانال پیام‌رسان بله */}
              <div className="bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  {/* هدر کارت بله */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-border-subtle">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">پیام‌رسان بله (Bale Bot)</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">ارسال هشدار به بازوی بله بدون نیاز به فیلترشکن</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.alerts.bale.enabled}
                      onClick={() => {
                        updateSettings({
                          alerts: {
                            ...settings.alerts,
                            bale: {
                              ...settings.alerts.bale,
                              enabled: !settings.alerts.bale.enabled,
                            },
                          },
                        });
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        settings.alerts.bale.enabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          settings.alerts.bale.enabled ? '-translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* فیلدهای ورودی بله */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          توکن بازوی بله (Bot Token):
                        </label>
                        <button
                          type="button"
                          onClick={() => toggleShowToken('bale_token')}
                          className="text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center gap-1"
                        >
                          {showTokens['bale_token'] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>{showTokens['bale_token'] ? 'مخفی' : 'نمایش'}</span>
                        </button>
                      </div>
                      <input
                        type={showTokens['bale_token'] ? 'text' : 'password'}
                        value={settings.alerts.bale.botToken}
                        onChange={(e) => {
                          updateSettings({
                            alerts: {
                              ...settings.alerts,
                              bale: { ...settings.alerts.bale, botToken: e.target.value },
                            },
                          });
                        }}
                        dir="ltr"
                        placeholder="123456789:abcdefgh..."
                        className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        شناسه کاربری یا کانال بله (Chat ID):
                      </label>
                      <input
                        type="text"
                        value={settings.alerts.bale.chatId}
                        onChange={(e) => {
                          updateSettings({
                            alerts: {
                              ...settings.alerts,
                              bale: { ...settings.alerts.bale, chatId: e.target.value },
                            },
                          });
                        }}
                        dir="ltr"
                        placeholder="123456789 یا @my_channel"
                        className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* فوتر تست بله */}
                <div className="pt-3 border-t border-slate-100 dark:border-border-subtle flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">راهنما: ساخت بازو در BotFather بله</span>
                  <button
                    type="button"
                    disabled={testingChannel === 'bale'}
                    onClick={() => handleTestChannel('bale')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-300 font-semibold text-xs border border-emerald-200 dark:border-emerald-500/30 transition shadow-2xs disabled:opacity-50"
                  >
                    <Send className={`w-3 h-3 ${testingChannel === 'bale' ? 'animate-spin' : ''}`} />
                    <span>{testingChannel === 'bale' ? 'در حال ارسال...' : 'ارسال پیام تست'}</span>
                  </button>
                </div>
              </div>

              {/* ۳. کانال وب‌هوک سفارشی */}
              <div className="bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  {/* هدر کارت وب‌هوک */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-border-subtle">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">وب‌هوک سفارشی (Generic Webhook)</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">ارسال پی‌لود JSON به Discord، Slack یا سامانه اختصاصی</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.alerts.webhook.enabled}
                      onClick={() => {
                        updateSettings({
                          alerts: {
                            ...settings.alerts,
                            webhook: {
                              ...settings.alerts.webhook,
                              enabled: !settings.alerts.webhook.enabled,
                            },
                          },
                        });
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        settings.alerts.webhook.enabled ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          settings.alerts.webhook.enabled ? '-translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* فیلدهای ورودی وب‌هوک */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        آدرس URL وب‌هوک مقصد (POST):
                      </label>
                      <input
                        type="text"
                        value={settings.alerts.webhook.url}
                        onChange={(e) => {
                          updateSettings({
                            alerts: {
                              ...settings.alerts,
                              webhook: { ...settings.alerts.webhook, url: e.target.value },
                            },
                          });
                        }}
                        dir="ltr"
                        placeholder="https://discord.com/api/webhooks/... یا URL اختصاصی"
                        className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          عنوان هدر احراز هویت:
                        </label>
                        <input
                          type="text"
                          value={settings.alerts.webhook.secretHeader}
                          onChange={(e) => {
                            updateSettings({
                              alerts: {
                                ...settings.alerts,
                                webhook: { ...settings.alerts.webhook, secretHeader: e.target.value },
                              },
                            });
                          }}
                          dir="ltr"
                          placeholder="Authorization"
                          className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          مقدار توکن یا سکرت:
                        </label>
                        <input
                          type="password"
                          value={settings.alerts.webhook.secretValue}
                          onChange={(e) => {
                            updateSettings({
                              alerts: {
                                ...settings.alerts,
                                webhook: { ...settings.alerts.webhook, secretValue: e.target.value },
                              },
                            });
                          }}
                          dir="ltr"
                          placeholder="Bearer secret_token..."
                          className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* فوتر تست وب‌هوک */}
                <div className="pt-3 border-t border-slate-100 dark:border-border-subtle flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">فرمت: JSON استاندارد با Event Type</span>
                  <button
                    type="button"
                    disabled={testingChannel === 'webhook'}
                    onClick={() => handleTestChannel('webhook')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 dark:text-purple-300 font-semibold text-xs border border-purple-200 dark:border-purple-500/30 transition shadow-2xs disabled:opacity-50"
                  >
                    <Send className={`w-3 h-3 ${testingChannel === 'webhook' ? 'animate-spin' : ''}`} />
                    <span>{testingChannel === 'webhook' ? 'در حال ارسال...' : 'ارسال وب‌هوک تست'}</span>
                  </button>
                </div>
              </div>

              {/* ۴. کانال ایمیل / SMTP */}
              <div className="bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  {/* هدر کارت ایمیل */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-border-subtle">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">اعلان‌های ایمیل (SMTP)</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">ارسال گزارش انقضا و تمدید به صندوق پستی</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.alerts.email.enabled}
                      onClick={() => {
                        updateSettings({
                          alerts: {
                            ...settings.alerts,
                            email: {
                              ...settings.alerts.email,
                              enabled: !settings.alerts.email.enabled,
                            },
                          },
                        });
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        settings.alerts.email.enabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          settings.alerts.email.enabled ? '-translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* فیلدهای ورودی ایمیل */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          سرور SMTP:
                        </label>
                        <input
                          type="text"
                          value={settings.alerts.email.smtpHost}
                          onChange={(e) => {
                            updateSettings({
                              alerts: {
                                ...settings.alerts,
                                email: { ...settings.alerts.email, smtpHost: e.target.value },
                              },
                            });
                          }}
                          dir="ltr"
                          placeholder="smtp.gmail.com"
                          className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          پورت:
                        </label>
                        <input
                          type="text"
                          value={settings.alerts.email.smtpPort}
                          onChange={(e) => {
                            updateSettings({
                              alerts: {
                                ...settings.alerts,
                                email: { ...settings.alerts.email, smtpPort: e.target.value.replace(/\D/g, '') },
                              },
                            });
                          }}
                          dir="ltr"
                          placeholder="587"
                          className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          نام کاربری SMTP:
                        </label>
                        <input
                          type="text"
                          value={settings.alerts.email.username}
                          onChange={(e) => {
                            updateSettings({
                              alerts: {
                                ...settings.alerts,
                                email: { ...settings.alerts.email, username: e.target.value },
                              },
                            });
                          }}
                          dir="ltr"
                          placeholder="user@example.com"
                          className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          رمز عبور (یا App Password):
                        </label>
                        <input
                          type="password"
                          value={settings.alerts.email.password}
                          onChange={(e) => {
                            updateSettings({
                              alerts: {
                                ...settings.alerts,
                                email: { ...settings.alerts.email, password: e.target.value },
                              },
                            });
                          }}
                          dir="ltr"
                          placeholder="••••••••••••"
                          className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        ایمیل‌های گیرنده هشدار (جدا شده با کاما):
                      </label>
                      <input
                        type="text"
                        value={settings.alerts.email.toEmails}
                        onChange={(e) => {
                          updateSettings({
                            alerts: {
                              ...settings.alerts,
                              email: { ...settings.alerts.email, toEmails: e.target.value },
                            },
                          });
                        }}
                        dir="ltr"
                        placeholder="ops@company.com, ceo@company.com"
                        className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* فوتر تست ایمیل */}
                <div className="pt-3 border-t border-slate-100 dark:border-border-subtle flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">نکته: در Gmail از App Password استفاده کنید</span>
                  <button
                    type="button"
                    disabled={testingChannel === 'email'}
                    onClick={() => handleTestChannel('email')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:text-amber-300 font-semibold text-xs border border-amber-200 dark:border-amber-500/30 transition shadow-2xs disabled:opacity-50"
                  >
                    <Send className={`w-3 h-3 ${testingChannel === 'email' ? 'animate-spin' : ''}`} />
                    <span>{testingChannel === 'email' ? 'در حال ارسال...' : 'ارسال ایمیل تست'}</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* بخش ۲: دستورهای اتصال سریع و شبکه (Quick Connect) */}
        {/* ======================================================== */}
        {activeCategory === 'quick_connect' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-200">
            {/* کارت فعال/غیرفعال‌سازی ماژول */}
            <div className="bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-border-subtle">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400">
                      <Terminal className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">دستورهای اتصال سریع (Quick Connect)</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">کلید سراسری فعال‌سازی ماژول در کشوی دارایی‌ها</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.enableQuickConnect}
                    onClick={() => {
                      const newVal = !settings.enableQuickConnect;
                      updateSettings({ enableQuickConnect: newVal });
                      showToast(newVal ? 'دستورهای اتصال سریع فعال شدند.' : 'دستورهای اتصال سریع پنهان شدند.', 'info');
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings.enableQuickConnect ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        settings.enableQuickConnect ? '-translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  با فعال بودن این قابلیت، با باز کردن هر سرور یا تجهیز شبکه در سایدبار، دکمه‌های آماده کپی کامند ترمینال SSH، باز کردن کنسول وب HTTPS، ساخت فایل اتصال ویندوز RDP و کانکشن استرینگ دیتابیس نمایش داده می‌شوند.
                </p>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-2 border border-slate-200 dark:border-border-strong text-[11px] space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>پشتیبانی خودکار از IP، نام دامنه، پورت اختصاصی و نام‌کاربری</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>قابلیت دانلود مستقیم کانفیگ Remote Desktop (.rdp)</span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400">
                وضعیت کنونی: {settings.enableQuickConnect ? '✅ فعال در تمامی کشوها' : '⛔ کامپوننت اتصال سریع پنهان است'}
              </div>
            </div>

            {/* کارت اولویت‌ها و پورت پیش‌فرض */}
            <div className="bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-border-subtle">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">پیکربندی پیش‌فرض اتصال</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">تنظیم مقادیر پیش‌فرض شبکه در صورت عدم ثبت پورت در فیلدها</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    پورت پیش‌فرض اتصال SSH:
                  </label>
                  <input
                    type="text"
                    value={settings.defaultSshPort}
                    onChange={(e) => updateSettings({ defaultSshPort: e.target.value.replace(/\D/g, '') || '22' })}
                    dir="ltr"
                    className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100"
                    placeholder="22"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">پورت استاندارد لینوکس ۲۲ است مگر اینکه سفارشی کرده باشید.</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    پروتکل ترجیحی کنسول‌های وب:
                  </label>
                  <select
                    value={settings.defaultWebProtocol}
                    onChange={(e) => updateSettings({ defaultWebProtocol: e.target.value as 'https' | 'http' })}
                    className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="https">HTTPS (اتصال رمزگذاری‌شده امن - پیش‌فرض)</option>
                    <option value="http">HTTP (اتصال معمولی بدون رمزنگاری)</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">پیشوند آدرس وب‌سرورها در دکمه باز کردن پنل.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* بخش ۳: امنیت و کلمات عبور (Security & Credentials) */}
        {/* ======================================================== */}
        {activeCategory === 'security' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-200">
            {/* کارت نشانگر قدرت کلمه عبور */}
            <div className="bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-border-subtle">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-600/20 text-amber-600 dark:text-amber-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">نشانگر قدرت کلمه عبور</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">محاسبه آنتروپی و سطح ایمنی در فرم‌ها</p>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.enableStrengthMeter}
                  onClick={() => updateSettings({ enableStrengthMeter: !settings.enableStrengthMeter })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.enableStrengthMeter ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      settings.enableStrengthMeter ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                هنگام باز کردن پنجره تولید رمز یا ثبت پسورد در دارایی‌ها، نوار رنگی قدرت کلمه عبور به همراه محاسبه بیت‌های آنتروپی فعال خواهد بود.
              </p>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-2 border border-slate-200 dark:border-border-strong space-y-2">
                <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">نمونه سطوح قدرت:</div>
                <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-bold">
                  <div className="py-1 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">ضعیف</div>
                  <div className="py-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">متوسط</div>
                  <div className="py-1 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">خوب</div>
                  <div className="py-1 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">بسیار قوی</div>
                </div>
              </div>
            </div>

            {/* کارت زمان پنهان‌سازی خودکار و رمزنگاری */}
            <div className="bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-border-subtle">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">پنهان‌سازی خودکار رمزهای آشکارشده</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">تایمر امنیتی جهت جلوگیری از خوانده شدن رمز روی مانیتور</p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  زمان پنهان‌سازی مجدد پسورد:
                </label>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {[15, 30, 60, 120].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => updateSettings({ autoHideSecretSeconds: sec })}
                      className={`py-2 rounded-xl border text-center font-bold transition ${
                        settings.autoHideSecretSeconds === sec
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 shadow-2xs'
                          : 'border-slate-200 dark:border-border-strong text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {sec} ثانیه
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-400 block">
                  پس از کلیک روی آیکون چشم در جدول یا کشو، مقدار رمز پس از این مدت مجدداً ماسک می‌شود.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* بخش ۴: پوسته و چیدمان (Appearance & Layout) */}
        {/* ======================================================== */}
        {activeCategory === 'appearance' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-200">
            {/* انتخاب تم */}
            <div className="bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-border-subtle">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-600/20 text-amber-600 dark:text-amber-400">
                  <Sun className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">پوسته سامانه (Theme)</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">تغییر بین تم روشن پرکنتراست و تم تاریک مهندسی</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => updateSettings({ theme: 'light' })}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 font-bold transition ${
                    settings.theme === 'light'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 dark:bg-indigo-950/40 shadow-xs'
                      : 'border-slate-200 dark:border-border-strong hover:bg-slate-50 dark:hover:bg-surface-2 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Sun className="w-5 h-5 text-amber-500" />
                  <span>تم روشن (SaaS High-Contrast)</span>
                </button>

                <button
                  type="button"
                  onClick={() => updateSettings({ theme: 'dark' })}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 font-bold transition ${
                    settings.theme === 'dark'
                      ? 'border-indigo-500 bg-indigo-900/30 text-indigo-300 shadow-xs'
                      : 'border-slate-200 dark:border-border-strong hover:bg-slate-50 dark:hover:bg-surface-2 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Moon className="w-5 h-5 text-indigo-400" />
                  <span>تم تاریک (Dark Modern)</span>
                </button>
              </div>
            </div>

            {/* تراکم پیش‌فرض جدول */}
            <div className="bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-border-subtle">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400">
                  <Rows className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">تراکم پیش‌فرض جدول‌ها</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">ارتفاع ردیف‌ها و تراکم اطلاعات در جداول دارایی‌ها</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => updateSettings({ defaultDensity: 'compact' })}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 font-bold transition ${
                    settings.defaultDensity === 'compact'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 dark:bg-indigo-950/40 shadow-xs'
                      : 'border-slate-200 dark:border-border-strong hover:bg-slate-50 dark:hover:bg-surface-2 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Rows className="w-5 h-5" />
                  <span>فشرده (اکسل‌گونه)</span>
                  <span className="text-[10px] font-normal text-slate-500">حداکثر ردیف در صفحه</span>
                </button>

                <button
                  type="button"
                  onClick={() => updateSettings({ defaultDensity: 'comfortable' })}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 font-bold transition ${
                    settings.defaultDensity === 'comfortable'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 dark:bg-indigo-950/40 shadow-xs'
                      : 'border-slate-200 dark:border-border-strong hover:bg-slate-50 dark:hover:bg-surface-2 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Rows className="w-5 h-5 scale-y-125" />
                  <span>معمولی (فضادار)</span>
                  <span className="text-[10px] font-normal text-slate-500">خوانایی بالا و پدینگ باز</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* بخش ۵: مشخصات و شناسنامه سامانه (System Info) */}
        {/* ======================================================== */}
        {activeCategory === 'about' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-border-subtle">
                <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  دف
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">سامانه مدیریت دارایی‌ها، دسترسی‌ها و مستندات سازمانی «دفتر»</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">نسخه ۱.۰.۰ (Enterprise On-Premises Ready)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-surface-2 border border-slate-200 dark:border-border-strong">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1 font-semibold">پروتکل رمزنگاری داده‌ها:</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">AES-256-GCM + PBKDF2</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-surface-2 border border-slate-200 dark:border-border-strong">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1 font-semibold">ذخیره‌سازی و پایداری:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">PostgreSQL + LocalStorage</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-surface-2 border border-slate-200 dark:border-border-strong">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1 font-semibold">موتور اکسل:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">SheetJS XLSX v0.18</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
