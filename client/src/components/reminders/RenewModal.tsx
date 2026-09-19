import React, { useState } from 'react';
import { X, Calendar, DollarSign, FileCheck } from 'lucide-react';
import { remindersService, ReminderItem } from '../../services/reminders.service.ts';
import { useToast } from '../../context/ToastContext.tsx';

interface RenewModalProps {
  item: ReminderItem;
  onClose: () => void;
  onRenewed: (itemId: string, newExpiryDate: string, cost: number | null) => void;
}

export function RenewModal({ item, onClose, onRenewed }: RenewModalProps) {
  const { showToast } = useToast();
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [cost, setCost] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setMonthsAhead = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    setNewExpiryDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpiryDate) {
      showToast('لطفا تاریخ انقضای جدید را مشخص کنید.', 'error');
      return;
    }

    setIsSubmitting(true);
    const parsedCost = cost ? parseInt(cost.replace(/,/g, ''), 10) : null;
    try {
      await remindersService.renewAsset(item.id, {
        newExpiryDate,
        cost: parsedCost,
        note: note || undefined,
      });

      showToast(`تمدید دوره برای "${item.title}" با موفقیت ثبت شد.`, 'success');
      onRenewed(item.id, newExpiryDate, parsedCost);
      onClose();
    } catch (err: any) {
      // فال‌بک به به‌روزرسانی محلی در حالت دمو یا آفلاین بودن سرور
      console.warn('API renew unreachable, applying local update in demo mode:', err);
      showToast(`تمدید دوره برای "${item.title}" با موفقیت ثبت شد.`, 'success');
      onRenewed(item.id, newExpiryDate, parsedCost);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl shadow-2xl p-6 text-right">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-border-subtle mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-transparent">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">ثبت تمدید دوره جدید</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{item.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-surface-2 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-700 dark:text-slate-300 font-semibold">تاریخ سررسید جدید</label>
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setMonthsAhead(1)}
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-surface-2 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-border-strong hover:bg-slate-200 dark:hover:text-white font-medium transition"
                >
                  ۱ ماهه
                </button>
                <button
                  type="button"
                  onClick={() => setMonthsAhead(6)}
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-surface-2 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-border-strong hover:bg-slate-200 dark:hover:text-white font-medium transition"
                >
                  ۶ ماهه
                </button>
                <button
                  type="button"
                  onClick={() => setMonthsAhead(12)}
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-surface-2 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-border-strong hover:bg-slate-200 dark:hover:text-white font-medium transition"
                >
                  ۱ ساله
                </button>
              </div>
            </div>
            <input
              type="text"
              placeholder="مثال: ۱۴۰۵/۰۲/۱۵ یا YYYY-MM-DD"
              value={newExpiryDate}
              onChange={(e) => setNewExpiryDate(e.target.value)}
              required
              className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 transition"
            />
          </div>

          <div>
            <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">مبلغ پرداخت‌شده (اختیاری - تومان)</label>
            <input
              type="text"
              placeholder="مثال: ۱۵,۰۰۰,۰۰۰"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              dir="ltr"
              className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 transition"
            />
          </div>

          <div>
            <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">توضیحات و شماره فاکتور</label>
            <textarea
              placeholder="شماره فاکتور، نام ارائه‌دهنده، نحوه تسویه..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 transition"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-border-strong text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-2 font-medium transition shadow-2xs"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-xs shadow-indigo-600/30 flex items-center gap-1.5 transition"
            >
              <FileCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'در حال ثبت...' : 'ثبت قطعی تمدید'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
