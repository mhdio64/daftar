import React, { useState, useEffect } from 'react';
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
  ExternalLink,
  Database,
  Download,
  Upload,
  FileArchive,
  Smartphone,
  ShieldCheck,
  X,
  Copy,
  Clock,
  Calendar
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { alertingService, NotificationLogItem } from '../../services/alerting.service.ts';
import { remindersService } from '../../services/reminders.service.ts';
import { backupService, BackupInspectResult } from '../../services/backup.service.ts';
import { authService } from '../../services/auth.service.ts';
import { auditService } from '../../services/audit.service.ts';
import { AssetType } from '../../services/asset-types.service.ts';
import { Asset } from '../../services/assets.service.ts';
import { TwoFactorSetupModal } from './TwoFactorSetupModal.tsx';

interface SettingsViewProps {
  onDataRestored?: () => void;
  assetTypes?: AssetType[];
  assets?: Asset[];
}

export function SettingsView({ onDataRestored, assetTypes, assets }: SettingsViewProps) {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { showToast } = useToast();

  const [activeCategory, setActiveCategory] = useState<'alerts' | 'backup' | 'quick_connect' | 'security' | 'appearance' | 'about'>('alerts');
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [isDispatchingAll, setIsDispatchingAll] = useState(false);
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});

  // استیت‌های اتوماسیون هشدارها و کرون‌جاب
  const [isTestingDigest, setIsTestingDigest] = useState(false);
  const [isTriggeringWorker, setIsTriggeringWorker] = useState(false);
  const [alertLogs, setAlertLogs] = useState<NotificationLogItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const loadAlertLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const logs = await alertingService.getAlertLogs();
      setAlertLogs(logs);
    } catch {
      // ignore
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeCategory === 'alerts') {
      loadAlertLogs();
    }
  }, [activeCategory]);

  const handleTriggerServerCheck = async () => {
    setIsTriggeringWorker(true);
    try {
      const res = await alertingService.triggerServerCheck();
      showToast(res.message || 'بررسی سررسیدها با موفقیت اجرا شد.', 'success');
      loadAlertLogs();
    } catch (err: any) {
      showToast(err.message || 'خطا در بررسی سررسیدها', 'error');
    } finally {
      setIsTriggeringWorker(false);
    }
  };

  const handleTriggerServerDigest = async () => {
    setIsTestingDigest(true);
    try {
      const res = await alertingService.triggerServerDigest();
      showToast(res.message || 'گزارش خلاصه وضعیت با موفقیت ارسال شد.', 'success');
      loadAlertLogs();
    } catch (err: any) {
      showToast(err.message || 'خطا در ارسال خلاصه وضعیت', 'error');
    } finally {
      setIsTestingDigest(false);
    }
  };

  // استیت‌های پشتیبان‌گیری
  const [isExporting, setIsExporting] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [includeSettings, setIncludeSettings] = useState(true);
  const [includeUsers, setIncludeUsers] = useState(true);
  const [showExportPassword, setShowExportPassword] = useState(false);

  // استیت‌های بازیابی
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inspectResult, setInspectResult] = useState<BackupInspectResult | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [restorePassword, setRestorePassword] = useState('');
  const [showRestorePassword, setShowRestorePassword] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'clean' | 'merge'>('clean');
  const [isRestoring, setIsRestoring] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // استیت‌های احراز هویت دومرحله‌ای
  const { user, updateCurrentUser } = useAuth();
  const [is2FASetupModalOpen, setIs2FASetupModalOpen] = useState(false);
  const [isDisable2FAModalOpen, setIsDisable2FAModalOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);
  const [isRegeneratingCodes, setIsRegeneratingCodes] = useState(false);
  const [shownRecoveryCodes, setShownRecoveryCodes] = useState<string[] | null>(null);

  const toggleShowToken = (key: string) => {
    setShowTokens((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // غیرفعال‌سازی 2FA
  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDisabling2FA(true);

    try {
      await authService.disable2FA(disablePassword);
      if (user) {
        updateCurrentUser({ ...user, twoFactorEnabled: false });
      }
      setIsDisable2FAModalOpen(false);
      setDisablePassword('');
      await auditService.recordAudit({
        action: '2FA_DISABLE',
        targetEntity: 'User',
        targetId: user?.username || 'admin',
        diff: { note: 'غیرفعال‌سازی تایید دو مرحله‌ای توسط کاربر' },
      });
      showToast('احراز هویت دو مرحله‌ای با موفقیت غیرفعال شد.', 'info');
    } catch {
      // فال‌بک حالت دمو
      localStorage.removeItem('daftar_demo_2fa_enabled');
      localStorage.removeItem('daftar_demo_2fa_secret');
      localStorage.removeItem('daftar_demo_2fa_recovery_codes');
      if (user) {
        updateCurrentUser({ ...user, twoFactorEnabled: false });
      }
      setIsDisable2FAModalOpen(false);
      setDisablePassword('');
      await auditService.recordAudit({
        action: '2FA_DISABLE',
        targetEntity: 'User',
        targetId: user?.username || 'admin',
        diff: { note: 'غیرفعال‌سازی تایید دو مرحله‌ای (حالت آفلاین)' },
      });
      showToast('احراز هویت دو مرحله‌ای غیرفعال شد.', 'info');
    } finally {
      setIsDisabling2FA(false);
    }
  };

  // تولید مجدد کدهای بازیابی اضطراری
  const handleRegenerateRecoveryCodes = async () => {
    if (!window.confirm('آیا مایل به ابطال کدهای قبلی و صدور ۸ کد بازیابی اضطراری جدید هستید؟')) {
      return;
    }

    setIsRegeneratingCodes(true);

    try {
      const res = await authService.regenerateRecoveryCodes();
      setShownRecoveryCodes(res.recoveryCodes);
      await auditService.recordAudit({
        action: 'UPDATE',
        targetEntity: 'User',
        targetId: user?.username || 'admin',
        diff: { action: 'REGENERATE_RECOVERY_CODES', count: res.recoveryCodes.length, note: 'تولید مجدد کدهای بازیابی اضطراری' },
      });
      showToast('کدهای بازیابی اضطراری جدید صادر شدند.', 'success');
    } catch {
      // فال‌بک دمو
      const { generateRecoveryCodesClient } = await import('../../services/totp-client.service.ts');
      const codes = generateRecoveryCodesClient(8);
      localStorage.setItem('daftar_demo_2fa_recovery_codes', JSON.stringify(codes));
      setShownRecoveryCodes(codes);
      await auditService.recordAudit({
        action: 'UPDATE',
        targetEntity: 'User',
        targetId: user?.username || 'admin',
        diff: { action: 'REGENERATE_RECOVERY_CODES', count: codes.length, note: 'تولید مجدد کدهای بازیابی اضطراری (حالت آفلاین)' },
      });
      showToast('کدهای بازیابی اضطراری جدید صادر شدند.', 'success');
    } finally {
      setIsRegeneratingCodes(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('آیا مطمئن هستید که می‌خواهید تمام تنظیمات را به مقادیر اولیه کارخانه بازنشانی کنید؟')) {
      resetSettings();
      showToast('تنظیمات با موفقیت به حالت پیش‌فرض بازگشت.', 'success');
    }
  };

  // ارسال پیام تست به کانال مشخص
  const handleTestChannel = async (channel: 'telegram' | 'discord' | 'bale' | 'webhook' | 'email' | 'sms') => {
    setTestingChannel(channel);
    try {
      const res = await alertingService.testChannel(channel, settings.alerts);
      showToast(res.message, 'success');
      loadAlertLogs();
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

  // تهیه و دانلود فایل پشتیبان با یک کلیک
  const handleCreateBackup = async () => {
    setIsExporting(true);
    try {
      const res = await backupService.exportBackup({
        password: exportPassword,
        includeSettings,
        includeUsers,
        assetTypes,
        assets,
      });
      await auditService.recordAudit({
        action: 'EXPORT_BACKUP',
        targetEntity: 'System',
        targetId: res.filename,
        diff: {
          filename: res.filename,
          assetTypesCount: res.stats.assetTypesCount,
          assetsCount: res.stats.assetsCount,
          isEncrypted: Boolean(exportPassword),
          note: 'تهیه و دانلود فایل پشتیبان کامل سامانه',
        },
      });
      showToast(`فایل پشتیبان «${res.filename}» (${res.stats.assetTypesCount} دسته‌بندی و ${res.stats.assetsCount} دارایی) با موفقیت دانلود شد.`, 'success');
      setExportPassword('');
    } catch (err: any) {
      showToast(err.message || 'خطا در ایجاد نسخه پشتیبان', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // انتخاب فایل پشتیبان و اعتبارسنجی اولیه
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsInspecting(true);
    setInspectResult(null);
    setRestorePassword('');

    try {
      const res = await backupService.inspectBackupFile(file);
      setInspectResult(res);
      if (res.requiresPassword) {
        showToast('این فایل با رمز عبور محافظت شده است. لطفاً رمز عبور را وارد نمایید.', 'info');
      } else if (!res.valid) {
        showToast(res.error || 'فایل پشتیبان نامعتبر است.', 'error');
      } else {
        showToast(`فایل پشتیبان تأیید شد (${res.stats?.assetTypesCount} دسته، ${res.stats?.assetsCount} دارایی).`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'خطا در بررسی فایل پشتیبان', 'error');
    } finally {
      setIsInspecting(false);
    }
  };

  // رمزگشایی فایل پشتیبان در صورت نیاز به کلمه عبور
  const handleDecryptAndInspect = async () => {
    if (!selectedFile) return;
    if (!restorePassword) {
      showToast('لطفاً رمز عبور فایل را وارد کنید.', 'error');
      return;
    }

    setIsInspecting(true);
    try {
      const res = await backupService.inspectBackupFile(selectedFile, restorePassword);
      setInspectResult(res);
      if (!res.valid) {
        showToast(res.error || 'رمز عبور اشتباه است یا فایل مخدوش است.', 'error');
      } else {
        showToast(`رمزگشایی موفق! فایل شامل ${res.stats?.assetTypesCount} دسته و ${res.stats?.assetsCount} دارایی است.`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'خطا در رمزگشایی فایل', 'error');
    } finally {
      setIsInspecting(false);
    }
  };

  // اعمال نهایی بازیابی اطلاعات
  const handleApplyRestore = async () => {
    if (!inspectResult?.bundle) {
      showToast('هیچ اطلاعات معتبری برای بازیابی یافت نشد.', 'error');
      return;
    }

    setIsRestoring(true);
    try {
      const res = await backupService.applyRestore(inspectResult.bundle, { mode: restoreMode });
      await auditService.recordAudit({
        action: 'RESTORE_BACKUP',
        targetEntity: 'System',
        targetId: selectedFile?.name || 'فایل پشتیبان',
        diff: {
          mode: restoreMode,
          assetTypesCount: inspectResult.stats?.assetTypesCount,
          assetsCount: inspectResult.stats?.assetsCount,
          note: 'بازیابی موفق اطلاعات از فایل پشتیبان',
        },
      });
      showToast(res.message, 'success');
      setIsConfirmModalOpen(false);
      setSelectedFile(null);
      setInspectResult(null);
      onDataRestored?.();
    } catch (err: any) {
      showToast(err.message || 'خطا در اعمال بازیابی اطلاعات', 'error');
    } finally {
      setIsRestoring(false);
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
            onClick={() => setActiveCategory('backup')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeCategory === 'backup'
                ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/30'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-2'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>پشتیبان‌گیری و بازیابی</span>
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

              {/* پنل‌های تنظیمات پیشرفته اتوماسیون هوشمند و خلاصه وضعیت */}
              {settings.alerts.enableAlerts && (
                <div className="mt-5 pt-4 border-t border-indigo-100 dark:border-indigo-900/30 space-y-4">
                  {/* ردیف ۱: اتوماسیون خودکار سرور و کرون‌جاب (Automated Expiration Worker) */}
                  <div className="p-4 rounded-xl bg-white dark:bg-surface-2 border border-indigo-100 dark:border-border-strong space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-border-subtle">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              ورکر خودکار بررسی سررسیدها (Notification Worker & Cron)
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              settings.alerts.cronEnabled
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-500 dark:bg-surface-1 dark:text-slate-400'
                            }`}>
                              {settings.alerts.cronEnabled ? 'کرون فعال است' : 'کرون غیرفعال'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            بررسی خودکار موعد سررسید دارایی‌ها در پس‌زمینه سرور و ارسال اعلان حتی بدون باز بودن مرورگر
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={settings.alerts.cronEnabled}
                          onClick={() => {
                            const newVal = !settings.alerts.cronEnabled;
                            updateSettings({
                              alerts: { ...settings.alerts, cronEnabled: newVal },
                            });
                            showToast(newVal ? 'ورکر خودکار سررسیدها فعال شد.' : 'ورکر خودکار سررسیدها خاموش شد.', 'info');
                          }}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            settings.alerts.cronEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                              settings.alerts.cronEnabled ? '-translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>

                        <button
                          type="button"
                          disabled={isTriggeringWorker}
                          onClick={handleTriggerServerCheck}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 dark:text-indigo-300 text-xs font-semibold border border-indigo-200 dark:border-indigo-800/40 transition shadow-2xs disabled:opacity-50"
                          title="اجرای دستی و تست بررسی فوری انقضاها"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isTriggeringWorker ? 'animate-spin' : ''}`} />
                          <span>{isTriggeringWorker ? 'در حال اجرا...' : 'اجرای دستی بررسی'}</span>
                        </button>
                      </div>
                    </div>

                    {/* زمان‌بندی و بازه‌های هشدار */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">بازه‌های هشدار:</span>
                        {[
                          { days: 30, label: '۳۰ روز قبل' },
                          { days: 7, label: '۷ روز قبل' },
                          { days: 1, label: '۲۴ ساعت قبل' },
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

                      <div className="flex items-center gap-2 justify-start md:justify-end">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">ساعت اجرای روزانه:</span>
                        <input
                          type="time"
                          value={settings.alerts.cronTime || '09:00'}
                          onChange={(e) => {
                            updateSettings({
                              alerts: { ...settings.alerts, cronTime: e.target.value },
                            });
                          }}
                          className="bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ردیف ۲: گزارش خلاصه وضعیت دوره‌ای (Daily / Weekly Digest) */}
                  <div className="p-4 rounded-xl bg-white dark:bg-surface-2 border border-indigo-100 dark:border-border-strong space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-border-subtle">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              گزارش خلاصه دوره‌ای وضعیت (Weekly / Daily Digest)
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              settings.alerts.digestEnabled
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300'
                                : 'bg-slate-100 text-slate-500 dark:bg-surface-1 dark:text-slate-400'
                            }`}>
                              {settings.alerts.digestEnabled ? 'ارسال دایجست فعال است' : 'دایجست خاموش'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            ارسال یک گزارش جمع‌بندی زیبا شامل کل دارایی‌های فعال، هزینه‌های ماهانه و هشدارهای این هفته به کانال‌های تیم فنی
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={settings.alerts.digestEnabled}
                          onClick={() => {
                            const newVal = !settings.alerts.digestEnabled;
                            updateSettings({
                              alerts: { ...settings.alerts, digestEnabled: newVal },
                            });
                            showToast(newVal ? 'ارسال خلاصه وضعیت فعال شد.' : 'ارسال خلاصه وضعیت خاموش شد.', 'info');
                          }}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            settings.alerts.digestEnabled ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                              settings.alerts.digestEnabled ? '-translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>

                        <button
                          type="button"
                          disabled={isTestingDigest}
                          onClick={handleTriggerServerDigest}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 dark:text-purple-300 text-xs font-semibold border border-purple-200 dark:border-purple-800/40 transition shadow-2xs disabled:opacity-50"
                          title="ارسال فوری و آزمایشی گزارش خلاصه وضعیت به کانال‌ها"
                        >
                          <Send className={`w-3.5 h-3.5 ${isTestingDigest ? 'animate-spin' : ''}`} />
                          <span>{isTestingDigest ? 'در حال ارسال...' : 'ارسال فوری خلاصه وضعیت (تست Digest)'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">تناوب ارسال گزارش:</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateSettings({ alerts: { ...settings.alerts, digestFrequency: 'weekly' } })}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition ${
                              settings.alerts.digestFrequency === 'weekly'
                                ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                                : 'bg-white dark:bg-surface-1 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-border-strong hover:bg-slate-100'
                            }`}
                          >
                            هفتگی (شنبه‌ها ساعت ۰۹:۰۰ صبح)
                          </button>
                          <button
                            type="button"
                            onClick={() => updateSettings({ alerts: { ...settings.alerts, digestFrequency: 'daily' } })}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition ${
                              settings.alerts.digestFrequency === 'daily'
                                ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                                : 'bg-white dark:bg-surface-1 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-border-strong hover:bg-slate-100'
                            }`}
                          >
                            روزانه (هر روز صبح)
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isDispatchingAll}
                        onClick={handleDispatchDueReminders}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-2xs self-start md:self-auto disabled:opacity-50"
                      >
                        <Send className={`w-3.5 h-3.5 ${isDispatchingAll ? 'animate-spin' : ''}`} />
                        <span>{isDispatchingAll ? 'در حال ارسال...' : 'توزیع فوری تمام سررسیدها'}</span>
                      </button>
                    </div>
                  </div>
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

              {/* ۲. کانال دیسکورد (Discord Webhook) */}
              <div className="bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  {/* هدر کارت دیسکورد */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-border-subtle">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">دیسکورد (Discord Webhook)</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">ارسال هشدار با قالب رنگی و Rich Embed به چنل دیسکورد</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.alerts.discord?.enabled}
                      onClick={() => {
                        updateSettings({
                          alerts: {
                            ...settings.alerts,
                            discord: {
                              ...(settings.alerts.discord || { webhookUrl: '', username: 'سامانه دفتر' }),
                              enabled: !settings.alerts.discord?.enabled,
                            },
                          },
                        });
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        settings.alerts.discord?.enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          settings.alerts.discord?.enabled ? '-translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* فیلدهای ورودی دیسکورد */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          آدرس وب‌هوک دیسکورد (Webhook URL):
                        </label>
                        <button
                          type="button"
                          onClick={() => toggleShowToken('discord_url')}
                          className="text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center gap-1"
                        >
                          {showTokens['discord_url'] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>{showTokens['discord_url'] ? 'مخفی' : 'نمایش'}</span>
                        </button>
                      </div>
                      <input
                        type={showTokens['discord_url'] ? 'text' : 'password'}
                        value={settings.alerts.discord?.webhookUrl || ''}
                        onChange={(e) => {
                          updateSettings({
                            alerts: {
                              ...settings.alerts,
                              discord: { ...(settings.alerts.discord || { enabled: false, username: 'سامانه دفتر' }), webhookUrl: e.target.value },
                            },
                          });
                        }}
                        dir="ltr"
                        placeholder="https://discord.com/api/webhooks/123456789/..."
                        className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        نام کاربری بات در چنل (Username):
                      </label>
                      <input
                        type="text"
                        value={settings.alerts.discord?.username || 'سامانه دفتر'}
                        onChange={(e) => {
                          updateSettings({
                            alerts: {
                              ...settings.alerts,
                              discord: { ...(settings.alerts.discord || { enabled: false, webhookUrl: '' }), username: e.target.value },
                            },
                          });
                        }}
                        placeholder="سامانه دفتر"
                        className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* فوتر تست دیسکورد */}
                <div className="pt-3 border-t border-slate-100 dark:border-border-subtle flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">تنظیمات چنل دیسکورد: Integrations &gt; Webhooks</span>
                  <button
                    type="button"
                    disabled={testingChannel === 'discord'}
                    onClick={() => handleTestChannel('discord')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 dark:text-indigo-300 font-semibold text-xs border border-indigo-200 dark:border-indigo-500/30 transition shadow-2xs disabled:opacity-50"
                  >
                    <Send className={`w-3 h-3 ${testingChannel === 'discord' ? 'animate-spin' : ''}`} />
                    <span>{testingChannel === 'discord' ? 'در حال ارسال...' : 'ارسال پیام تست دیسکورد'}</span>
                  </button>
                </div>
              </div>

              {/* ۳. کانال پیام‌رسان بله */}
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

              {/* ۶. کانال پیامک سازمانی (SMS Webhook) */}
              <div className="bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  {/* هدر کارت پیامک */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-border-subtle">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">پیامک سازمانی (SMS Notification)</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">ارسال اخطار فوری پیامکی به مدیران شبکه و زیرساخت</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.alerts.sms?.enabled}
                      onClick={() => {
                        updateSettings({
                          alerts: {
                            ...settings.alerts,
                            sms: {
                              ...(settings.alerts.sms || { provider: 'generic', apiKey: '', lineNumber: '', recipients: '', webhookUrl: '' }),
                              enabled: !settings.alerts.sms?.enabled,
                            },
                          },
                        });
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        settings.alerts.sms?.enabled ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          settings.alerts.sms?.enabled ? '-translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* فیلدهای ورودی پیامک */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          سرویس‌دهنده پیامک:
                        </label>
                        <select
                          value={settings.alerts.sms?.provider || 'generic'}
                          onChange={(e) => {
                            updateSettings({
                              alerts: {
                                ...settings.alerts,
                                sms: { ...(settings.alerts.sms || { enabled: false, apiKey: '', lineNumber: '', recipients: '', webhookUrl: '' }), provider: e.target.value as any },
                              },
                            });
                          }}
                          className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-2.5 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-rose-500"
                        >
                          <option value="generic">وب‌هوک سفارشی POST</option>
                          <option value="kavenegar">کاوه‌نگار (Kavenegar)</option>
                          <option value="farazsms">فراز اس‌ام‌اس / IPPanel</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          شماره خط فرستنده:
                        </label>
                        <input
                          type="text"
                          value={settings.alerts.sms?.lineNumber || ''}
                          onChange={(e) => {
                            updateSettings({
                              alerts: {
                                ...settings.alerts,
                                sms: { ...(settings.alerts.sms || { enabled: false, provider: 'generic', apiKey: '', recipients: '', webhookUrl: '' }), lineNumber: e.target.value },
                              },
                            });
                          }}
                          dir="ltr"
                          placeholder="3000..."
                          className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-rose-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        آدرس وب‌هوک یا اندپوینت پیامک (URL):
                      </label>
                      <input
                        type="text"
                        value={settings.alerts.sms?.webhookUrl || ''}
                        onChange={(e) => {
                          updateSettings({
                            alerts: {
                              ...settings.alerts,
                              sms: { ...(settings.alerts.sms || { enabled: false, provider: 'generic', apiKey: '', lineNumber: '', recipients: '' }), webhookUrl: e.target.value },
                            },
                          });
                        }}
                        dir="ltr"
                        placeholder="https://api.sms-provider.com/v1/send..."
                        className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        شماره‌های همراه گیرندگان (با کاما جدا کنید):
                      </label>
                      <input
                        type="text"
                        value={settings.alerts.sms?.recipients || ''}
                        onChange={(e) => {
                          updateSettings({
                            alerts: {
                              ...settings.alerts,
                              sms: { ...(settings.alerts.sms || { enabled: false, provider: 'generic', apiKey: '', lineNumber: '', webhookUrl: '' }), recipients: e.target.value },
                            },
                          });
                        }}
                        dir="ltr"
                        placeholder="09121111111, 09352222222"
                        className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>
                </div>

                {/* فوتر تست پیامک */}
                <div className="pt-3 border-t border-slate-100 dark:border-border-subtle flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">توزیع پیامک در بازه‌های بحرانی و ۲۴ ساعت قبل</span>
                  <button
                    type="button"
                    disabled={testingChannel === 'sms'}
                    onClick={() => handleTestChannel('sms')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-300 font-semibold text-xs border border-rose-200 dark:border-rose-500/30 transition shadow-2xs disabled:opacity-50"
                  >
                    <Send className={`w-3 h-3 ${testingChannel === 'sms' ? 'animate-spin' : ''}`} />
                    <span>{testingChannel === 'sms' ? 'در حال ارسال...' : 'ارسال پیامک تست'}</span>
                  </button>
                </div>
              </div>

            </div>

            {/* جدول تاریخچه تحویل هشدارها و لاگ رویدادها */}
            <div className="bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-border-subtle">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      تاریخچه و لاگ‌های ارسال اعلان‌ها (Notification Delivery Logs)
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      ثبت خودکار تمامی پیام‌های هشدار، خلاصه‌های دوره‌ای و تست‌های انجام‌شده توسط سامانه
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={loadAlertLogs}
                  disabled={isLoadingLogs}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-surface-2 dark:hover:bg-surface-3 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-border-strong transition shadow-2xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                  <span>به‌روزرسانی تاریخچه</span>
                </button>
              </div>

              {alertLogs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-border-strong text-slate-500 dark:text-slate-400 font-semibold">
                        <th className="pb-2 w-12 text-center">ردیف</th>
                        <th className="pb-2 w-36">زمان ثبت</th>
                        <th className="pb-2 w-32">نوع رویداد</th>
                        <th className="pb-2 w-44">کانال‌های دریافت‌کننده</th>
                        <th className="pb-2">شرح و جزئیات پیام</th>
                        <th className="pb-2 w-24 text-center">وضعیت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-border-subtle">
                      {alertLogs.map((log, index) => (
                        <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-surface-2/40 transition">
                          <td className="py-2.5 text-center text-slate-400">{index + 1}</td>
                          <td className="py-2.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                            {new Date(log.timestamp).toLocaleDateString('fa-IR')} - {new Date(log.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.type === 'EXPIRATION_ALERT'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                : log.type === 'DIGEST'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-surface-2 dark:text-slate-300'
                            }`}>
                              {log.type === 'EXPIRATION_ALERT' ? 'هشدار سررسید' : log.type === 'DIGEST' ? 'خلاصه وضعیت' : 'پیام آزمایشی'}
                            </span>
                          </td>
                          <td className="py-2.5">
                            <div className="flex items-center gap-1 flex-wrap">
                              {log.channels && log.channels.length > 0 ? (
                                log.channels.map((ch, i) => (
                                  <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-surface-2 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-border-strong">
                                    {ch}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-400 text-[10px]">هیچ کانالی</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 text-slate-700 dark:text-slate-300 font-medium">
                            {log.summary}
                          </td>
                          <td className="py-2.5 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              log.success
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                            }`}>
                              {log.success ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <AlertTriangle className="w-3 h-3 text-rose-600" />}
                              <span>{log.success ? 'ارسال شد' : 'خطا'}</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  {isLoadingLogs ? 'در حال دریافت تاریخچه...' : 'تاکنون هیچ اعلانی ثبت یا ارسال نشده است.'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* بخش: پشتیبان‌گیری و بازیابی یک‌کلیکی (Backup & Restore) */}
        {/* ======================================================== */}
        {activeCategory === 'backup' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* بنر معرفی پشتیبان‌گیری */}
            <div className="p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/30 shadow-xs flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-indigo-600 text-white shrink-0 mt-0.5">
                <Database className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  مدیریت پشتیبان‌گیری و بازیابی اطلاعات سامانه
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  امکان استخراج کامل کلیه دسته‌بندی‌ها، دارایی‌ها، کلمات عبور، مستندات، و تنظیمات سامانه در قالب فایل استاندارد یا بازیابی نسخه قبلی با یک کلیک.
                </p>
              </div>
            </div>

            {/* گرید ۲ ستونه: کارت ایجاد پشتیبان و کارت بازیابی */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* کارت ۱: تهیه و دانلود نسخه پشتیبان */}
              <div className="bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-border-subtle">
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">تهیه فایل پشتیبان (Export Backup)</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">دانلود تمام داده‌ها در یک بسته ساخت‌یافته</p>
                    </div>
                  </div>

                  {/* گزینه‌های پشتیبان‌گیری */}
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-2 border border-slate-200 dark:border-border-strong space-y-2 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
                        <input
                          type="checkbox"
                          checked={includeSettings}
                          onChange={(e) => setIncludeSettings(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <span>شامل تنظیمات و اولویت‌های سامانه (وب‌هوک‌ها، تم و تراکم)</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
                        <input
                          type="checkbox"
                          checked={includeUsers}
                          onChange={(e) => setIncludeUsers(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <span>شامل حساب‌های کاربری و سطوح دسترسی</span>
                      </label>
                    </div>

                    {/* رمزگذاری اختیاری */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>رمزگذاری فایل پشتیبان (اختیاری):</span>
                        </label>
                        {exportPassword && (
                          <button
                            type="button"
                            onClick={() => setShowExportPassword(!showExportPassword)}
                            className="text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center gap-1"
                          >
                            {showExportPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            <span>{showExportPassword ? 'مخفی' : 'نمایش'}</span>
                          </button>
                        )}
                      </div>
                      <input
                        type={showExportPassword ? 'text' : 'password'}
                        value={exportPassword}
                        onChange={(e) => setExportPassword(e.target.value)}
                        placeholder="کلمه عبور جهت رمزگذاری با AES-256-GCM..."
                        dir="ltr"
                        className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                      />
                      <span className="text-[10px] text-slate-400 block leading-tight">
                        در صورت تعیین رمز، فایل با پسوند <code className="text-indigo-600 font-mono">.daftar</code> رمزنگاری شده و باز کردن آن بدون رمز غیرممکن خواهد بود.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-border-subtle">
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={handleCreateBackup}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs shadow-emerald-600/30 transition disabled:opacity-50"
                  >
                    <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
                    <span>{isExporting ? 'در حال آماده‌سازی و دانلود...' : 'تهیه و دانلود فایل پشتیبان (یک کلیک)'}</span>
                  </button>
                </div>
              </div>

              {/* کارت ۲: بازیابی اطلاعات از فایل */}
              <div className="bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-border-subtle">
                    <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">بازیابی اطلاعات (Restore Backup)</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">آپلود و اعمال نسخه پشتیبان به سیستم</p>
                    </div>
                  </div>

                  {/* کادر بارگذاری فایل */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      انتخاب یا کشیدن فایل پشتیبان (.json یا .daftar):
                    </label>
                    <div className="relative border-2 border-dashed border-slate-300 dark:border-border-strong rounded-xl p-4 text-center hover:border-indigo-500 transition cursor-pointer bg-slate-50/50 dark:bg-surface-2/40">
                      <input
                        type="file"
                        accept=".json,.daftar"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                        <FileArchive className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {selectedFile ? selectedFile.name : 'کلیک یا کشیدن فایل به این قسمت'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} کیلوبایت` : 'فرمت‌های قابل قبول: json و daftar.'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* در صورت نیاز به رمزگشایی */}
                  {inspectResult?.requiresPassword && (
                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 space-y-2 animate-in fade-in">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300">
                        <Lock className="w-3.5 h-3.5" />
                        <span>این فایل رمزگذاری شده است. لطفاً رمز را وارد کنید:</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type={showRestorePassword ? 'text' : 'password'}
                          value={restorePassword}
                          onChange={(e) => setRestorePassword(e.target.value)}
                          placeholder="رمز عبور فایل پشتیبان..."
                          dir="ltr"
                          className="flex-1 bg-white dark:bg-surface-1 border border-amber-300 dark:border-amber-500/50 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-100"
                        />
                        <button
                          type="button"
                          disabled={isInspecting}
                          onClick={handleDecryptAndInspect}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition shrink-0"
                        >
                          {isInspecting ? 'در حال بررسی...' : 'رمزگشایی'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* پیش‌نمایش اطلاعات بسته تأییدشده */}
                  {inspectResult?.valid && inspectResult.bundle && (
                    <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 space-y-2.5 animate-in fade-in text-xs">
                      <div className="flex items-center justify-between font-bold text-emerald-800 dark:text-emerald-300">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>فایل پشتیبان معتبر و آماده بازیابی است</span>
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200">
                          نسخه {inspectResult.version}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1 font-semibold">
                        <div className="p-2 rounded-lg bg-white dark:bg-surface-1 border border-emerald-200/60 dark:border-emerald-500/20">
                          <span className="text-slate-500 dark:text-slate-400 block text-[10px]">دسته‌بندی‌ها</span>
                          <span className="text-slate-900 dark:text-white font-mono text-xs">{inspectResult.stats?.assetTypesCount}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-white dark:bg-surface-1 border border-emerald-200/60 dark:border-emerald-500/20">
                          <span className="text-slate-500 dark:text-slate-400 block text-[10px]">تعداد دارایی‌ها</span>
                          <span className="text-slate-900 dark:text-white font-mono text-xs">{inspectResult.stats?.assetsCount}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-white dark:bg-surface-1 border border-emerald-200/60 dark:border-emerald-500/20">
                          <span className="text-slate-500 dark:text-slate-400 block text-[10px]">کاربران</span>
                          <span className="text-slate-900 dark:text-white font-mono text-xs">{inspectResult.stats?.usersCount || 0}</span>
                        </div>
                      </div>

                      {/* نحوه بازیابی */}
                      <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-500/20 space-y-1.5">
                        <span className="font-bold text-slate-700 dark:text-slate-300 block text-[11px]">حالت بازیابی:</span>
                        <div className="grid grid-cols-2 gap-2">
                          <label className={`p-2 rounded-lg border cursor-pointer flex items-center gap-1.5 text-[11px] transition ${
                            restoreMode === 'clean'
                              ? 'bg-indigo-50 border-indigo-600 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 font-bold'
                              : 'bg-white dark:bg-surface-1 border-slate-200 dark:border-border-strong text-slate-600'
                          }`}>
                            <input
                              type="radio"
                              name="restore_mode"
                              value="clean"
                              checked={restoreMode === 'clean'}
                              onChange={() => setRestoreMode('clean')}
                              className="hidden"
                            />
                            <span>جایگزینی کامل (Clean)</span>
                          </label>

                          <label className={`p-2 rounded-lg border cursor-pointer flex items-center gap-1.5 text-[11px] transition ${
                            restoreMode === 'merge'
                              ? 'bg-indigo-50 border-indigo-600 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 font-bold'
                              : 'bg-white dark:bg-surface-1 border-slate-200 dark:border-border-strong text-slate-600'
                          }`}>
                            <input
                              type="radio"
                              name="restore_mode"
                              value="merge"
                              checked={restoreMode === 'merge'}
                              onChange={() => setRestoreMode('merge')}
                              className="hidden"
                            />
                            <span>ادغام هوشمند (Merge)</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-border-subtle">
                  <button
                    type="button"
                    disabled={!inspectResult?.valid || isRestoring}
                    onClick={() => setIsConfirmModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs shadow-indigo-600/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-4 h-4" />
                    <span>شروع عملیات بازیابی و اعمال داده‌ها</span>
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
            {/* کارت ویژه احراز هویت دو مرحله‌ای (2FA / TOTP) */}
            <div className="md:col-span-2 bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-border-subtle">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        احراز هویت دو مرحله‌ای (2FA / TOTP)
                      </h3>
                      {user?.twoFactorEnabled ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          فعال و محافظت‌شده
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          غیرفعال (آسیب‌پذیر)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      ورود امن با کد ۶ رقمی مبتنی بر زمان سازگار با Google Authenticator و Microsoft Authenticator
                    </p>
                  </div>
                </div>

                <div>
                  {user?.twoFactorEnabled ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRegenerateRecoveryCodes}
                        disabled={isRegeneratingCodes}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-border-strong text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-surface-2 text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingCodes ? 'animate-spin' : ''}`} />
                        <span>کدهای بازیابی</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsDisable2FAModalOpen(true)}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-semibold transition"
                      >
                        <span>غیرفعال‌سازی 2FA</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIs2FASetupModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs shadow-indigo-600/20 flex items-center gap-2 transition"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>فعال‌سازی رمز دومرحله‌ای (TOTP)</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-surface-2 border border-slate-200/80 dark:border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-indigo-500" />
                    <span>نحوه عملکرد سیستم امنیتی:</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    پس از فعال‌سازی، حتی در صورت افشای کلمه عبور، هیچ کاربری بدون در دست داشتن تلفن همراه و کد متغیر ۶ رقمی قادر به ورود به سامانه نخواهد بود. همچنین ۸ کد اضطراری یکبارمصرف برای مواقع مفقودی گوشی در اختیارتان قرار می‌گیرد.
                  </p>
                </div>
              </div>
            </div>

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

      {/* مودال تأیید نهایی بازیابی اطلاعات */}
      {isConfirmModalOpen && inspectResult?.bundle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 text-right">
          <div className="w-full max-w-md bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">تأیید نهایی بازیابی اطلاعات</h3>
                <span className="text-xs text-rose-600 dark:text-rose-400">این عملیات داده‌های انتخابی را تغییر می‌دهد</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {restoreMode === 'clean' ? (
                <>
                  شما حالت <b>«جایگزینی کامل (Clean Overwrite)»</b> را انتخاب کرده‌اید. تمام داده‌های جاری سامانه پاک شده و با اطلاعات این نسخه پشتیبان جایگزین خواهند شد.
                </>
              ) : (
                <>
                  شما حالت <b>«ادغام هوشمند (Smart Merge)»</b> را انتخاب کرده‌اید. رکوردهای این فایل به سیستم اضافه یا به‌روزرسانی می‌شوند بدون اینکه داده‌های دیگر حذف شوند.
                </>
              )}
            </p>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-2 border border-slate-200 dark:border-border-strong text-xs space-y-1 font-mono">
              <div>• دسته‌بندی‌ها: {inspectResult.stats?.assetTypesCount}</div>
              <div>• دارایی‌ها: {inspectResult.stats?.assetsCount}</div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isRestoring}
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-border-strong text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-2 transition"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={isRestoring}
                onClick={handleApplyRestore}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5"
              >
                {isRestoring ? 'در حال اعمال بازیابی...' : 'بله، بازیابی انجام شود'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال راه‌اندازی احراز هویت دومرحله‌ای (2FA / TOTP) */}
      {is2FASetupModalOpen && (
        <TwoFactorSetupModal
          isOpen={is2FASetupModalOpen}
          onClose={() => setIs2FASetupModalOpen(false)}
          onSuccess={(codes) => {
            setShownRecoveryCodes(codes);
          }}
        />
      )}

      {/* مودال تایید غیرفعال‌سازی 2FA */}
      {isDisable2FAModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsDisable2FAModalOpen(false);
              setDisablePassword('');
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-sm bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl shadow-2xl p-5 text-right space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">غیرفعال‌سازی 2FA</h3>
                <p className="text-[11px] text-slate-500">جهت تایید هویت، رمز عبور جاری را وارد کنید</p>
              </div>
            </div>

            <form onSubmit={handleDisable2FA} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">رمز عبور جاری</label>
                <input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  dir="ltr"
                  required
                  autoFocus
                  className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:border-rose-600"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsDisable2FAModalOpen(false);
                    setDisablePassword('');
                  }}
                  className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-border-strong text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-100"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isDisabling2FA || !disablePassword}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50 transition"
                >
                  {isDisabling2FA ? 'در حال ثبت...' : 'غیرفعال‌سازی قطعی'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال نمایش کدهای بازیابی اضطراری جدید */}
      {shownRecoveryCodes && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShownRecoveryCodes(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl shadow-2xl p-5 text-right space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-border-subtle">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">کدهای بازیابی اضطراری جدید</h3>
                  <p className="text-[11px] text-slate-500">کدهای جدید فعال شدند. کدهای قبلی باطل گردیدند.</p>
                </div>
              </div>
              <button onClick={() => setShownRecoveryCodes(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-surface-2 rounded-xl">
              {shownRecoveryCodes.map((code, idx) => (
                <div key={idx} className="p-2 bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-subtle rounded-lg text-center font-mono font-bold text-xs select-all">
                  {code}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(shownRecoveryCodes.join('\n'));
                  showToast('کدها در حافظه کپی شدند.', 'info');
                }}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-border-strong text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Copy className="w-4 h-4" />
                <span>کپی همه کدها</span>
              </button>
              <button
                type="button"
                onClick={() => setShownRecoveryCodes(null)}
                className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
              >
                تایید و بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
