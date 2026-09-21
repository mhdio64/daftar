import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  ShieldCheck, 
  X, 
  Copy, 
  Check, 
  Download, 
  Smartphone, 
  Key, 
  AlertTriangle, 
  ArrowLeft,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { authService } from '../../services/auth.service.ts';
import { auditService } from '../../services/audit.service.ts';
import { useToast } from '../../context/ToastContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (recoveryCodes: string[]) => void;
}

export const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const { user, updateCurrentUser } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [isCopiedSecret, setIsCopiedSecret] = useState(false);
  const [isCopiedCodes, setIsCopiedCodes] = useState(false);

  // بارگذاری کلید و ساخت QR Code
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);
    setError('');
    setStep(1);
    setVerificationCode('');

    const initSetup = async () => {
      try {
        const res = await authService.setup2FA();
        if (!isMounted) return;
        setSecret(res.secret);
        setOtpauthUrl(res.otpauthUrl);

        const qr = await QRCode.toDataURL(res.otpauthUrl, {
          width: 200,
          margin: 1.5,
          color: {
            dark: '#1e1b4b', // deep indigo
            light: '#ffffff',
          },
        });
        if (isMounted) setQrCodeDataUrl(qr);
      } catch {
        // فال‌بک دمو/آفلاین: تولید لوکال جهت عملکرد بدون سرور
        const { generateTotpSecretClient } = await import('../../services/totp-client.service.ts');
        const demoData = generateTotpSecretClient(user?.username || 'admin', 'سامانه دفتر');
        if (!isMounted) return;
        setSecret(demoData.secret);
        setOtpauthUrl(demoData.otpauthUrl);

        const qr = await QRCode.toDataURL(demoData.otpauthUrl, {
          width: 200,
          margin: 1.5,
          color: {
            dark: '#1e1b4b',
            light: '#ffffff',
          },
        });
        if (isMounted) setQrCodeDataUrl(qr);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initSetup();

    return () => {
      isMounted = false;
    };
  }, [isOpen, user]);

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setIsCopiedSecret(true);
    showToast('کلید محرمانه در حافظه کپی شد.', 'info');
    setTimeout(() => setIsCopiedSecret(false), 2000);
  };

  const handleVerifyAndEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const clean = verificationCode.trim().replace(/\s+/g, '');
    if (clean.length !== 6 || !/^\d+$/.test(clean)) {
      setError('لطفاً کد ۶ رقمی معتبر وارد نمایید.');
      return;
    }

    setIsVerifying(true);

    try {
      // تلاش از طریق API سرور
      const res = await authService.enable2FA(secret, clean);
      setRecoveryCodes(res.recoveryCodes);
      setStep(2);
      if (user) {
        updateCurrentUser({ ...user, twoFactorEnabled: true });
      }
      await auditService.recordAudit({
        action: '2FA_ENABLE',
        targetEntity: 'User',
        targetId: user?.username || 'admin',
        diff: { method: 'TOTP_RFC6238', recoveryCodesCount: res.recoveryCodes.length, note: 'فعال‌سازی موفق احراز هویت دو مرحله‌ای' },
      });
      showToast('احراز هویت دو مرحله‌ای با موفقیت تایید و فعال شد.', 'success');
    } catch {
      // فال‌بک حالت دمو/آفلاین
      const { verifyTotpTokenClient, generateRecoveryCodesClient } = await import('../../services/totp-client.service.ts');
      const isValid = await verifyTotpTokenClient(clean, secret);
      if (!isValid) {
        setError('کد ۶ رقمی وارد شده نامعتبر است یا زمان آن منقضی شده است.');
        setIsVerifying(false);
        return;
      }

      const codes = generateRecoveryCodesClient(8);
      localStorage.setItem('daftar_demo_2fa_enabled', 'true');
      localStorage.setItem('daftar_demo_2fa_secret', secret);
      localStorage.setItem('daftar_demo_2fa_recovery_codes', JSON.stringify(codes));
      
      setRecoveryCodes(codes);
      setStep(2);
      if (user) {
        updateCurrentUser({ ...user, twoFactorEnabled: true });
      }
      await auditService.recordAudit({
        action: '2FA_ENABLE',
        targetEntity: 'User',
        targetId: user?.username || 'admin',
        diff: { method: 'TOTP_RFC6238', recoveryCodesCount: codes.length, note: 'فعال‌سازی موفق احراز هویت دو مرحله‌ای (حالت آفلاین)' },
      });
      showToast('احراز هویت دو مرحله‌ای با موفقیت فعال شد.', 'success');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    setIsCopiedCodes(true);
    showToast('تمام کدهای بازیابی کپی شدند.', 'info');
    setTimeout(() => setIsCopiedCodes(false), 2000);
  };

  const handleDownloadRecoveryCodes = () => {
    const text = `کدهای بازیابی اضطراری سامانه دفتر\nکاربر: ${user?.username || 'admin'}\nتاریخ تولید: ${new Date().toLocaleDateString('fa-IR')}\n\nنکته: هر کد فقط یک بار قابل استفاده است.\n\n${recoveryCodes.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `daftar-recovery-codes-${user?.username || 'admin'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('فایل کدهای بازیابی دانلود شد.', 'success');
  };

  const handleFinish = () => {
    onSuccess(recoveryCodes);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div className="w-full max-w-lg bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-right">
        {/* هدر مودال */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-border-subtle flex items-center justify-between bg-slate-50/50 dark:bg-surface-2/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                راه‌اندازی احراز هویت دو مرحله‌ای (2FA / TOTP)
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {step === 1 ? 'گام ۱ از ۲: اتصال اپلیکیشن احراز هویت' : 'گام ۲ از ۲: ذخیره‌سازی کدهای بازیابی اضطراری'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-surface-3 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* محتوای گام‌ها */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
              <span className="text-xs font-medium">در حال تولید کلید امن و ساخت بارکد QR...</span>
            </div>
          ) : step === 1 ? (
            /* گام ۱: اسکن و اعتبارسنجی */
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* بخش آموزش و QR Code */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-surface-2 border border-slate-200/80 dark:border-border-subtle flex flex-col items-center text-center space-y-3.5">
                {/* ظرف بارکد QR */}
                <div className="p-2.5 sm:p-3 bg-white rounded-2xl shadow-xs border border-slate-200 inline-flex items-center justify-center">
                  {qrCodeDataUrl ? (
                    <img src={qrCodeDataUrl} alt="QR Code 2FA" className="w-36 h-36 sm:w-40 sm:h-40 object-contain rounded-lg" />
                  ) : (
                    <div className="w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center bg-slate-100 text-slate-400 text-xs">
                      در حال بارگذاری بارکد...
                    </div>
                  )}
                </div>

                <div className="space-y-1 max-w-sm">
                  <div className="inline-flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                    <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>اسکن با اپلیکیشن احراز هویت (Authenticator)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    اپلیکیشن <strong className="text-slate-900 dark:text-white">Google Authenticator</strong> یا <strong className="text-slate-900 dark:text-white">Microsoft Authenticator</strong> را روی گوشی باز کرده و بارکد را اسکن کنید.
                  </p>
                </div>

                {/* کلید دستی با قابلیت کپی */}
                <div className="w-full pt-3 border-t border-slate-200/70 dark:border-border-subtle/60 text-right space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>یا وارد کردن دستی کلید در اپلیکیشن:</span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">۳۲ کاراکتر Base32</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 bg-white dark:bg-surface-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-border-strong shadow-2xs">
                    <div
                      className="font-mono text-xs sm:text-sm font-bold text-indigo-700 dark:text-indigo-400 tracking-wider select-all overflow-x-auto py-0.5 text-left shrink min-w-0"
                      dir="ltr"
                    >
                      {secret.match(/.{1,4}/g)?.join(' ') || secret}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopySecret}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-600/20 dark:hover:bg-indigo-600/30 text-indigo-600 dark:text-indigo-400 text-xs font-sans font-medium flex items-center gap-1.5 transition shrink-0"
                      title="کپی کلید محرمانه"
                    >
                      {isCopiedSecret ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">کپی شد</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>کپی کلید</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* فرم تایید کد ۶ رقمی */}
              <form onSubmit={handleVerifyAndEnable} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    کد ۶ رقمی نمایش داده شده در اپلیکیشن گوشی را وارد کنید:
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="123456"
                    dir="ltr"
                    autoFocus
                    required
                    className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-xl px-4 py-2.5 text-center font-mono text-xl tracking-[0.4em] font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-600 transition shadow-xs"
                  />
                </div>

                {error && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-1/3 py-2.5 rounded-xl border border-slate-200 dark:border-border-strong text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-2 font-medium text-xs transition"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifying || verificationCode.trim().length !== 6}
                    className="w-2/3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs shadow-xs shadow-indigo-600/20 flex items-center justify-center gap-2 transition"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>در حال بررسی کد...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>تایید و فعال‌سازی 2FA</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* گام ۲: کدهای بازیابی اضطراری */
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2.5 font-medium">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>احراز هویت دو مرحله‌ای با موفقیت فعال شد. کدهای اضطراری زیر را ذخیره نمایید.</span>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs leading-relaxed space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>هشدار مهم امنیتی:</span>
                </div>
                <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90">
                  اگر گوشی یا دسترسی به اپلیکیشن خود را از دست بدهید، تنها راه ورود شما به حساب، کدهای زیر خواهند بود. هر کد یکبار مصرف است.
                </p>
              </div>

              {/* شبکه کدهای اضطراری */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-surface-2 border border-slate-200 dark:border-border-strong">
                <div className="grid grid-cols-2 gap-2.5">
                  {recoveryCodes.map((code, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-subtle text-center font-mono font-bold text-xs tracking-wider text-slate-800 dark:text-slate-200 select-all shadow-2xs"
                    >
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              {/* دکمه‌های کپی و دانلود */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyRecoveryCodes}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-border-strong bg-white dark:bg-surface-1 hover:bg-slate-50 dark:hover:bg-surface-2 text-slate-800 dark:text-slate-200 font-medium text-xs flex items-center justify-center gap-2 transition shadow-2xs"
                >
                  {isCopiedCodes ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>کپی تمام کدها</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadRecoveryCodes}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-border-strong bg-white dark:bg-surface-1 hover:bg-slate-50 dark:hover:bg-surface-2 text-slate-800 dark:text-slate-200 font-medium text-xs flex items-center justify-center gap-2 transition shadow-2xs"
                >
                  <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>دانلود فایل متنی (.txt)</span>
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleFinish}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs shadow-indigo-600/20 flex items-center justify-center gap-2 transition"
                >
                  <Check className="w-4 h-4" />
                  <span>کدها را ذخیره کردم، پایان راه‌اندازی</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
