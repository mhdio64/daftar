import React, { useState } from 'react';
import { LogIn, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';

export function LoginModal() {
  const { login, loginAsDemo } = useAuth();
  const { showToast } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await login(username, password);
      showToast('ورود با موفقیت انجام شد.', 'success');
    } catch (err: any) {
      setError(err.message || 'نام کاربری یا رمز عبور اشتباه است.');
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

        <form onSubmit={handleLogin} className="space-y-3.5 text-xs">
          <div>
            <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">نام کاربری</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              dir="ltr"
              required
              autoFocus
              className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 transition"
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
              className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 transition"
            />
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold shadow-xs shadow-indigo-600/20 flex items-center justify-center gap-2 transition"
            >
              {isSubmitting ? (
                <span>در حال ورود...</span>
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
    </div>
  );
}
