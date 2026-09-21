import React, { useState } from 'react';
import { LogIn, KeyRound, ShieldCheck, ArrowRight, LifeBuoy, Smartphone, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';

export function LoginModal() {
  const { login, verify2FA, loginAsDemo } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // مرحله اول: ورود با نام کاربری و رمز عبور
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const res = await login(username, password);
      if (res.requires2FA && res.tempToken) {
        setTempToken(res.tempToken);
        setStep(2);
        setTwoFactorCode('');
        setIsRecoveryMode(false);
      } else {
        showToast('ورود با موفقیت انجام شد.', 'success');
      }
    } catch (err: any) {
      setError(err.message || 'نام کاربری یا رمز عبور اشتباه است.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // مرحله دوم: ورود کد ۶ رقمی TOTP یا کد بازیابی اضطراری
  const handleTwoFactorVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await verify2FA(tempToken, twoFactorCode);
      showToast('ورود دو مرحله‌ای با موفقیت تایید شد.', 'success');
    } catch (err: any) {
      setError(err.message || 'کد وارد شده نامعتبر است یا منقضی شده است.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    loginAsDemo();
    showToast('ورود به حالت دموی سریع انجام شد.', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl shadow-2xl p-6 text-right animate-in zoom-in-95 duration-200">
        {step === 1 ? (
          /* ======================================================== */
          /* مرحله ۱: شناسه و رمز عبور */
          /* ======================================================== */
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200/70 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">ورود به سامانه دفتر</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">شناسه و رمز عبور خود را وارد نمایید</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handlePasswordLogin} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">نام کاربری</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  dir="ltr"
                  required
                  autoFocus
                  className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">رمز عبور</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  dir="ltr"
                  required
                  className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-600 transition"
                />
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold shadow-xs shadow-indigo-600/20 flex items-center justify-center gap-2 transition"
                >
                  {isSubmitting ? (
                    <span>در حال بررسی...</span>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>ورود به سامانه</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDemoLogin}
                  className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-2 dark:hover:bg-surface-elevated border border-slate-200 dark:border-border-strong text-slate-800 dark:text-slate-200 font-semibold flex items-center justify-center gap-1.5 transition text-[11px] shadow-2xs"
                >
                  <span>🚀 مشاهده دموی سریع و بررسی رابط کاربری</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ======================================================== */
          /* مرحله ۲: احراز هویت دو مرحله‌ای (TOTP / Recovery Code) */
          /* ======================================================== */
          <div className="animate-in fade-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-600/20 border border-emerald-200/70 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">کد تایید دو مرحله‌ای</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isRecoveryMode ? 'ورود با کد بازیابی اضطراری' : 'کد موقت اپلیکیشن احراز هویت'}
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleTwoFactorVerify} className="space-y-4 text-xs">
              {!isRecoveryMode ? (
                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1.5 font-semibold">
                    کد ۶ رقمی Google / Microsoft Authenticator:
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    dir="ltr"
                    required
                    autoFocus
                    placeholder="123456"
                    className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-xl px-3 py-3 text-slate-900 dark:text-slate-100 font-mono text-xl tracking-[0.4em] text-center font-bold placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-hidden focus:border-indigo-600 transition shadow-xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-1.5 block leading-normal">
                    کد پویای ۶ رقمی تولیدشده در اپلیکیشن را وارد نمایید.
                  </span>
                </div>
              ) : (
                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1.5 font-semibold">
                    کد ۸ رقمی بازیابی اضطراری:
                  </label>
                  <input
                    type="text"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.toUpperCase())}
                    dir="ltr"
                    required
                    autoFocus
                    placeholder="A3B8-F9C2"
                    className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-xl px-3 py-2.5 text-slate-900 dark:text-slate-100 font-mono text-base tracking-widest text-center font-bold focus:outline-hidden focus:border-indigo-600 transition shadow-xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-1.5 block leading-normal">
                    یکی از کدهای پشتیبان ذخیره‌شده هنگام فعال‌سازی 2FA را وارد نمایید.
                  </span>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting || twoFactorCode.trim().length === 0}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs shadow-xs shadow-indigo-600/20 flex items-center justify-center gap-2 transition"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>در حال تایید کد...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>تایید و ورود به سیستم</span>
                    </>
                  )}
                </button>

                {/* سوئیچ بین کد اپلیکیشن و کد بازیابی */}
                <button
                  type="button"
                  onClick={() => {
                    setIsRecoveryMode(!isRecoveryMode);
                    setTwoFactorCode('');
                    setError('');
                  }}
                  className="w-full py-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center justify-center gap-1.5 font-medium"
                >
                  {isRecoveryMode ? (
                    <>
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>ورود با کد ۶ رقمی اپلیکیشن گوشی</span>
                    </>
                  ) : (
                    <>
                      <LifeBuoy className="w-3.5 h-3.5" />
                      <span>گوشی همراهم نیست؛ ورود با کد اضطراری</span>
                    </>
                  )}
                </button>

                {/* بازگشت به مرحله رمز عبور */}
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setTempToken('');
                    setError('');
                  }}
                  className="w-full py-1 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center justify-center gap-1"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>بازگشت به ورود با رمز عبور</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
