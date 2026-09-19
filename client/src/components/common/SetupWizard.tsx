import React, { useState } from 'react';
import { Shield, ArrowLeft, Check, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';

export function SetupWizard() {
  const { setupAdmin } = useAuth();
  const { showToast } = useToast();

  const [username, setUsername] = useState('admin');
  const [fullName, setFullName] = useState('مدیر ارشد سامانه');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setError('رمز عبور باید حداقل ۶ کاراکتر باشد.');
      return;
    }
    if (password !== confirmPassword) {
      setError('رمز عبور و تکرار آن یکسان نیستند.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await setupAdmin({ username, fullName, password });
      showToast('سامانه با موفقیت راه‌اندازی شد. خوش آمدید!', 'success');
    } catch (err: any) {
      setError(err.message || 'خطا در راه‌اندازی سامانه.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-surface-1 border border-slate-200 dark:border-indigo-500/30 rounded-2xl shadow-2xl p-6 text-right animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200/70 dark:border-indigo-500/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">راه‌اندازی اولیه سامانه «دفتر»</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">تنظیم اولین حساب مدیر ارشد و بارگذاری دسته‌های پایه</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">نام و نام خانوادگی مدیر</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 transition"
            />
          </div>

          <div>
            <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">نام کاربری (انگلیسی)</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              dir="ltr"
              required
              className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 transition"
            />
          </div>

          <div>
            <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">رمز عبور مدیر ارشد</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              dir="ltr"
              required
              placeholder="حداقل ۶ کاراکتر"
              className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 transition"
            />
          </div>

          <div>
            <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">تکرار رمز عبور</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              dir="ltr"
              required
              className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 transition"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold shadow-xs shadow-indigo-600/30 flex items-center justify-center gap-2 transition"
            >
              {isSubmitting ? (
                <span>در حال راه‌اندازی و ایجاد ساختار...</span>
              ) : (
                <>
                  <span>ایجاد حساب و فعال‌سازی دفتر</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
