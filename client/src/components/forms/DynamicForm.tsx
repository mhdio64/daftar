import React, { useState } from 'react';
import { Sparkles, Calendar, ExternalLink, Mail } from 'lucide-react';
import { FieldDefinition } from '../../services/asset-types.service.ts';
import { PasswordGeneratorModal } from '../modals/PasswordGeneratorModal.tsx';

interface DynamicFormProps {
  schema: FieldDefinition[];
  values: Record<string, any>;
  onChange: (newValues: Record<string, any>) => void;
}

export function DynamicForm({ schema, values, onChange }: DynamicFormProps) {
  const [passModalOpen, setPassModalOpen] = useState(false);
  const [activeSecretField, setActiveSecretField] = useState<string | null>(null);

  const handleFieldChange = (key: string, value: any) => {
    onChange({
      ...values,
      [key]: value,
    });
  };

  const openPasswordGenerator = (fieldKey: string) => {
    setActiveSecretField(fieldKey);
    setPassModalOpen(true);
  };

  // اضافه کردن ماه‌ها به تاریخ سررسید
  const setExpiryPreset = (key: string, months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    handleFieldChange(key, d.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-4 text-right">
      {schema.map((field) => {
        const value = values[field.name] ?? '';

        return (
          <div key={field.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <span>{field.label}</span>
                {field.isRequired && <span className="text-rose-500">*</span>}
              </label>

              {/* دکمه‌های کمکی برای پسورد */}
              {field.type === 'secret' && (
                <button
                  type="button"
                  onClick={() => openPasswordGenerator(field.name)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium flex items-center gap-1 transition"
                  title="باز کردن تولیدکننده پیشرفته کلمه عبور"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>تولید رمز قوی</span>
                </button>
              )}

              {/* دکمه‌های کمکی برای تاریخ سررسید */}
              {field.type === 'jalali_date' && (
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setExpiryPreset(field.name, 1)}
                    className="px-2 py-0.5 rounded bg-slate-100 dark:bg-surface-2 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-border-strong hover:bg-slate-200 dark:hover:text-white transition font-medium"
                  >
                    ۱ ماهه
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpiryPreset(field.name, 3)}
                    className="px-2 py-0.5 rounded bg-slate-100 dark:bg-surface-2 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-border-strong hover:bg-slate-200 dark:hover:text-white transition font-medium"
                  >
                    ۳ ماهه
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpiryPreset(field.name, 12)}
                    className="px-2 py-0.5 rounded bg-slate-100 dark:bg-surface-2 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-border-strong hover:bg-slate-200 dark:hover:text-white transition font-medium"
                  >
                    ۱ ساله
                  </button>
                </div>
              )}
            </div>

            {/* رندر بر اساس نوع فیلد */}
            {field.type === 'secret' ? (
              <input
                type="text"
                value={value}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                dir="ltr"
                placeholder="رمز عبور یا کلید محرمانه..."
                className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 transition"
              />
            ) : field.type === 'ip_port' ? (
              <input
                type="text"
                value={value}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                dir="ltr"
                placeholder="192.168.1.1:22"
                className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-indigo-300 font-mono placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 transition"
              />
            ) : field.type === 'email' ? (
              <div className="relative">
                <input
                  type="email"
                  value={value}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  dir="ltr"
                  placeholder="user@example.com"
                  className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-cyan-300 font-mono placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 transition pl-8"
                />
                <Mail className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            ) : field.type === 'url' ? (
              <div className="relative">
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  dir="ltr"
                  placeholder="https://example.com"
                  className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-sky-300 font-mono placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 transition pl-8"
                />
                {value && (
                  <a
                    href={value}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ) : field.type === 'select' ? (
              <select
                value={value}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 transition"
              >
                <option value="">انتخاب کنید...</option>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : field.type === 'jalali_date' ? (
              <div className="relative">
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  placeholder="۱۴۰۵/۰۲/۱۵ یا YYYY-MM-DD"
                  className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 transition pl-8"
                />
                <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            ) : (
              <input
                type="text"
                value={value}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 transition"
              />
            )}
          </div>
        );
      })}

      {/* مودال تولید پیشرفته کلمه عبور */}
      <PasswordGeneratorModal
        isOpen={passModalOpen}
        onClose={() => {
          setPassModalOpen(false);
          setActiveSecretField(null);
        }}
        onApply={(generatedPassword) => {
          if (activeSecretField) {
            handleFieldChange(activeSecretField, generatedPassword);
          }
        }}
      />
    </div>
  );
}
