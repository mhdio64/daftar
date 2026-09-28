import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Check,
  Key,
  Volume2,
  VolumeX,
  Palette,
  Mail,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { profileService } from '../../services/profile.service.ts';
import { AssetType } from '../../services/asset-types.service.ts';
import { UserPreferences } from '../../services/auth.service.ts';
import { TwoFactorSetupModal } from '../settings/TwoFactorSetupModal.tsx';
import { playCopyChime, playSuccessChime } from '../../utils/sound.ts';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetTypes?: AssetType[];
}

const AVATAR_COLORS: { id: string; name: string; bg: string; text: string; border: string }[] = [
  { id: 'indigo', name: 'نیلی', bg: 'bg-indigo-600', text: 'text-indigo-100', border: 'border-indigo-400' },
  { id: 'emerald', name: 'زمردی', bg: 'bg-emerald-600', text: 'text-emerald-100', border: 'border-emerald-400' },
  { id: 'violet', name: 'بنفش', bg: 'bg-violet-600', text: 'text-violet-100', border: 'border-violet-400' },
  { id: 'amber', name: 'کهربایی', bg: 'bg-amber-600', text: 'text-amber-100', border: 'border-amber-400' },
  { id: 'cyan', name: 'فیروزه‌ای', bg: 'bg-cyan-600', text: 'text-cyan-100', border: 'border-cyan-400' },
  { id: 'rose', name: 'سرخابی', bg: 'bg-rose-600', text: 'text-rose-100', border: 'border-rose-400' },
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  assetTypes = [],
}) => {
  const { user, updateCurrentUser } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'personal' | 'security'>('personal');
  const [isSaving, setIsSaving] = useState(false);

  // مشخصات فردی کاربر
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.preferences?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.preferences?.phoneNumber || '');
  const [avatarColor, setAvatarColor] = useState(user?.preferences?.avatarColor || 'indigo');
  const [copyFeedbackSound, setCopyFeedbackSound] = useState<boolean>(
    user?.preferences?.copyFeedbackSound !== undefined ? user?.preferences?.copyFeedbackSound : true
  );

  // تغییر رمز عبور شخصی
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // مدال ۲FA
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);

  // بارگذاری داده‌های اولیه کاربر
  useEffect(() => {
    if (isOpen && user) {
      setFullName(user.fullName || '');
      const prefs = user.preferences || {};
      setEmail(prefs.email || '');
      setPhoneNumber(prefs.phoneNumber || '');
      setAvatarColor(prefs.avatarColor || 'indigo');
      setCopyFeedbackSound(prefs.copyFeedbackSound !== undefined ? prefs.copyFeedbackSound : true);

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  // ذخیره اطلاعات اختصاصی پروفایل کاربر
  const handleSaveProfile = async () => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      showToast('نام و نام خانوادگی باید حداقل ۲ کاراکتر باشد.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const updatedPrefs: UserPreferences = {
        ...(user?.preferences || {}),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        avatarColor,
        copyFeedbackSound,
      };

      const res = await profileService.updateProfile({
        fullName: fullName.trim(),
        preferences: updatedPrefs,
      });

      // بروزرسانی استیت کاربری در کانتکست
      updateCurrentUser(res.user);

      if (copyFeedbackSound) {
        playSuccessChime();
      }
      showToast('اطلاعات حساب کاربری شما با موفقیت ذخیره شد.', 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'خطا در ذخیره اطلاعات پروفایل', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // تغییر رمز عبور شخصی
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast('رمز عبور فعلی الزامی است.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('رمز عبور جدید باید حداقل ۶ کاراکتر باشد.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('رمز عبور جدید و تکرار آن با یکدیگر مطابقت ندارند.', 'error');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await profileService.changePassword(currentPassword, newPassword);
      showToast(res.message || 'رمز عبور شما با موفقیت تغییر کرد.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (copyFeedbackSound) {
        playSuccessChime();
      }
    } catch (err: any) {
      showToast(err.message || 'خطا در تغییر رمز عبور', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const activeColorObj = AVATAR_COLORS.find((c) => c.id === avatarColor) || AVATAR_COLORS[0];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
        <div 
          className="bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
          dir="rtl"
        >
          {/* هدر مدال: مشخصات خلاصه کاربر */}
          <div className="relative px-6 py-5 border-b border-slate-200 dark:border-border-subtle bg-slate-50/70 dark:bg-surface-2/40 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`w-13 h-13 rounded-2xl ${activeColorObj.bg} ${activeColorObj.text} flex items-center justify-center text-base font-bold shadow-md transition-colors`}
              >
                {fullName.trim().slice(0, 2) || user?.fullName?.slice(0, 2) || 'کار'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {fullName || user?.fullName}
                  </h2>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                    @{user?.username}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-indigo-500" />
                    نقش: {user?.role === 'ADMIN' ? 'مدیر ارشد سامانه' : user?.role === 'EDITOR' ? 'اپراتور فنی' : 'مشاهده‌گر'}
                  </span>
                  <span>•</span>
                  <span>
                    {user?.role === 'ADMIN'
                      ? 'دسترسی کامل به تمام دارایی‌ها'
                      : `${user?.categoryPermissions?.length || 0} دسته مجاز`}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-surface-elevated transition"
              title="بستن"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* تب‌های پیمایش مدال (فقط مشخصات کاربری و امنیت حساب) */}
          <div className="px-6 border-b border-slate-200 dark:border-border-subtle bg-white dark:bg-surface-1 flex items-center gap-2">
            <button
              onClick={() => setActiveTab('personal')}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition ${
                activeTab === 'personal'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span>مشخصات فردی و هویتی</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition ${
                activeTab === 'security'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>امنیت و رمز عبور من</span>
              {user?.twoFactorEnabled && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-950" />
              )}
            </button>
          </div>

          {/* بدنه تب‌ها */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* ۱. تب مشخصات فردی */}
            {activeTab === 'personal' && (
              <div className="space-y-6 animate-in fade-in-50 duration-150">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      نام و نام خانوادگی <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="مثال: علی رضایی"
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-surface-2 border border-slate-200 dark:border-border-strong focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      نام کاربری (سیستمی)
                    </label>
                    <input
                      type="text"
                      value={user?.username || ''}
                      disabled
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-100 dark:bg-surface-elevated/40 border border-slate-200 dark:border-border-subtle text-slate-500 dark:text-slate-400 cursor-not-allowed font-mono"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">نام کاربری شناسه یکتای سیستمی شماست.</p>
                  </div>
                </div>

                {/* انتخاب رنگ آواتار شخصی */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-indigo-500" />
                    <span>رنگ آیکون و نشان کاربری شما</span>
                  </label>
                  <div className="flex items-center gap-3">
                    {AVATAR_COLORS.map((col) => (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => setAvatarColor(col.id)}
                        className={`w-9 h-9 rounded-xl ${col.bg} flex items-center justify-center transition-all ${
                          avatarColor === col.id
                            ? 'ring-3 ring-indigo-500 ring-offset-2 dark:ring-offset-surface-1 scale-110 shadow-md'
                            : 'opacity-70 hover:opacity-100 hover:scale-105'
                        }`}
                        title={col.name}
                      >
                        {avatarColor === col.id && <Check className="w-4 h-4 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* اطلاعات تماس اختصاصی کاربر */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-surface-2/40 border border-slate-200 dark:border-border-subtle space-y-4">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-indigo-500" />
                    <span>اطلاعات تماس پرسنلی</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        آدرس ایمیل کاربر
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        dir="ltr"
                        className="w-full px-3.5 py-2 rounded-lg text-xs bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong text-slate-900 dark:text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        شماره تلفن همراه
                      </label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="09123456789"
                        dir="ltr"
                        className="w-full px-3.5 py-2 rounded-lg text-xs bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* افکت صوتی هنگام کپی مقادیر (ارگونومی شخصی کاربر) */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-surface-2/40 border border-slate-200 dark:border-border-subtle flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      {copyFeedbackSound ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                      <span>افکت صوتی هنگام کپی مقادیر</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      پخش یک زنگ ملایم هنگام کلیک روی دکمه‌های کپی برای اطمینان از انجام عملیات
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => playCopyChime()}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-200 dark:bg-surface-elevated text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                    >
                      تست صدا 🔔
                    </button>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={copyFeedbackSound}
                        onChange={(e) => setCopyFeedbackSound(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                </div>

                {/* دسته‌بندی‌های مجاز برای حساب شما */}
                <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                  <div className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5 mb-2">
                    <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>دسته‌بندی‌های مجاز برای حساب شما</span>
                  </div>
                  {user?.role === 'ADMIN' ? (
                    <p className="text-xs text-indigo-700 dark:text-indigo-300">
                      به عنوان مدیر ارشد، شما مجوز مشاهده و مدیریت تمامی دارایی‌ها و بخش‌های سیستم را دارید.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {assetTypes
                        .filter((t) => user?.categoryPermissions?.includes(t.id))
                        .map((t) => (
                          <span
                            key={t.id}
                            className="px-2.5 py-1 rounded-lg text-xs bg-white dark:bg-surface-1 border border-indigo-200 dark:border-indigo-500/30 text-indigo-800 dark:text-indigo-200 font-medium"
                          >
                            {t.name}
                          </span>
                        ))}
                      {(!user?.categoryPermissions || user.categoryPermissions.length === 0) && (
                        <span className="text-xs text-slate-500">هیچ دسته‌ای اختصاص داده نشده است.</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ۲. تب امنیت و رمز عبور */}
            {activeTab === 'security' && (
              <div className="space-y-6 animate-in fade-in-50 duration-150">
                {/* کارت احراز هویت دو مرحله‌ای (2FA) */}
                <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        احراز هویت دو مرحله‌ای (2FA با TOTP)
                      </h4>
                      {user?.twoFactorEnabled ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          فعال و ایمن
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          غیرفعال
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 max-w-lg leading-relaxed">
                      با فعال‌سازی ۲FA، هنگام ورود به سامانه علاوه بر کلمه عبور، یک کد موقت ۶ رقمی از نرم‌افزار احراز هویت (مانند Google Authenticator) الزامی خواهد بود.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIs2FAModalOpen(true)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition shrink-0"
                  >
                    {user?.twoFactorEnabled ? 'مدیریت و کدهای بازیابی' : 'راه‌اندازی دو مرحله‌ای'}
                  </button>
                </div>

                {/* فرم تغییر رمز عبور شخصی */}
                <form onSubmit={handleChangePassword} className="p-5 rounded-2xl bg-slate-50 dark:bg-surface-2/40 border border-slate-200 dark:border-border-subtle space-y-4">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Key className="w-4 h-4 text-indigo-500" />
                    <span>تغییر رمز عبور شخصی</span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      رمز عبور فعلی <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPass ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="رمز عبور فعلی خود را وارد کنید"
                        dir="ltr"
                        className="w-full px-3.5 py-2 pl-10 rounded-xl text-xs bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                      >
                        {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        رمز عبور جدید (حداقل ۶ کاراکتر) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPass ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="رمز عبور جدید"
                          dir="ltr"
                          className="w-full px-3.5 py-2 pl-10 rounded-xl text-xs bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                        >
                          {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        تکرار رمز عبور جدید <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="تکرار رمز عبور جدید"
                        dir="ltr"
                        className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isChangingPassword || !currentPassword || !newPassword}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition disabled:opacity-50 flex items-center gap-2"
                    >
                      {isChangingPassword ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>در حال تغییر رمز...</span>
                        </>
                      ) : (
                        <span>ثبت رمز عبور جدید</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* فوتر مدال */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-border-subtle bg-slate-50 dark:bg-surface-2/40 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-surface-elevated transition"
            >
              بستن
            </button>

            {activeTab === 'personal' && (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveProfile}
                className="px-6 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>در حال ذخیره...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>ذخیره تغییرات مشخصات</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* مدال ۲FA */}
      {is2FAModalOpen && (
        <TwoFactorSetupModal
          isOpen={is2FAModalOpen}
          onClose={() => setIs2FAModalOpen(false)}
          onSuccess={() => {
            setIs2FAModalOpen(false);
            showToast('تنظیمات ۲FA با موفقیت بروزرسانی شد.', 'success');
          }}
        />
      )}
    </>
  );
};
