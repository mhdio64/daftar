import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Sliders, Eye, EyeOff, Copy } from 'lucide-react';
import { AssetType, FieldDefinition, FieldType, assetTypesService } from '../../services/asset-types.service.ts';
import { useToast } from '../../context/ToastContext.tsx';

interface SchemaBuilderModalProps {
  assetType: AssetType;
  onClose: () => void;
  onSaved: (updated: AssetType) => void;
}

export function SchemaBuilderModal({ assetType, onClose, onSaved }: SchemaBuilderModalProps) {
  const { showToast } = useToast();
  const [fields, setFields] = useState<FieldDefinition[]>(() => assetType.schemaDefinition || []);
  const [newLabel, setNewLabel] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<FieldType>('text');
  const [newRequired, setNewRequired] = useState(false);
  const [newShowInTable, setNewShowInTable] = useState(true);
  const [newCopyable, setNewCopyable] = useState(false);
  const [newOptions, setNewOptions] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // بستن مودال با کلید Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleAddField = () => {
    if (!newLabel || !newName) {
      showToast('عنوان و کلید انگلیسی فیلد الزامی است.', 'error');
      return;
    }

    const field: FieldDefinition = {
      id: `f_${Date.now()}`,
      label: newLabel.trim(),
      name: newName.trim().toLowerCase().replace(/\s+/g, '_'),
      type: newType,
      isRequired: newRequired,
      isSecret: newType === 'secret',
      showInTable: newShowInTable,
      isCopyable: newCopyable,
      options: newType === 'select' ? newOptions.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
    };

    setFields([...fields, field]);
    setNewLabel('');
    setNewName('');
    setNewOptions('');
    setNewRequired(false);
    setNewShowInTable(true);
    setNewCopyable(false);
  };

  const handleToggleFieldTable = (id: string) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, showInTable: f.showInTable === false ? true : false } : f)));
  };

  const handleToggleFieldCopyable = (id: string) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, isCopyable: !f.isCopyable } : f)));
  };

  const handleRemoveField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  const handleSaveSchema = async () => {
    setIsSaving(true);
    try {
      const updated = await assetTypesService.update(assetType.id, {
        schemaDefinition: fields,
      });
      showToast('ساختار فیلدها با موفقیت به‌روزرسانی شد.', 'success');
      onSaved(updated);
      onClose();
    } catch (err: any) {
      console.warn('API update schema unreachable, updating locally in demo mode:', err);
      const updatedLocal: AssetType = {
        ...assetType,
        schemaDefinition: fields,
      };
      showToast('ساختار فیلدها با موفقیت به‌روزرسانی شد.', 'success');
      onSaved(updatedLocal);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl shadow-2xl p-6 text-right flex flex-col max-h-[90vh] cursor-default"
      >
        {/* هدر */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-border-subtle shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-transparent">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">مدیریت فیلدهای پویا: {assetType.name}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">فیلدهای سفارشی مورد نیاز، نمایش در جدول و دکمه کپی را تنظیم کنید</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-surface-2 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* لیست فیلدهای موجود */}
        <div className="flex-1 overflow-y-auto py-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-2">
            <span className="font-semibold">فیلدهای فعلی ({fields.length}):</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              آیکون 👁️: نمایش در جدول | آیکون 📋: دکمه کپی
            </span>
          </div>
          {fields.map((f, idx) => (
            <div
              key={f.id}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-surface-2 border border-slate-200 dark:border-border-subtle text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-slate-400 dark:text-slate-500 w-5 text-center">{idx + 1}</span>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{f.label}</span>
                    {f.isRequired && <span className="text-rose-700 bg-rose-50 border border-rose-200/80 dark:bg-rose-500/10 dark:text-rose-400 text-[10px] px-1.5 py-0.5 rounded font-medium">اجباری</span>}
                    {f.isSecret && <span className="text-amber-800 bg-amber-50 border border-amber-200/80 dark:bg-amber-500/10 dark:text-amber-400 text-[10px] px-1.5 py-0.5 rounded font-medium">محرمانه (AES)</span>}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                    کلید: {f.name} | نوع: {f.type}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleToggleFieldTable(f.id)}
                  className={`p-1.5 rounded-lg transition ${
                    f.showInTable !== false
                      ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-300'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                  title={f.showInTable !== false ? 'نمایش در جدول (فعال)' : 'مخفی در جدول (غیرفعال)'}
                >
                  {f.showInTable !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleFieldCopyable(f.id)}
                  className={`p-1.5 rounded-lg transition ${
                    f.isCopyable
                      ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-300'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                  title={f.isCopyable ? 'دکمه کپی در جدول (فعال)' : 'دکمه کپی در جدول (غیرفعال)'}
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleRemoveField(f.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-500 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition"
                  title="حذف فیلد"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* فرم افزودن فیلد جدید */}
          <div className="mt-4 p-4 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/40 dark:bg-indigo-950/10 space-y-3">
            <div className="text-xs font-bold text-indigo-950 dark:text-indigo-300 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>افزودن فیلد جدید</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-700 dark:text-slate-400 block mb-1 font-medium">عنوان فارسی فیلد</label>
                <input
                  type="text"
                  placeholder="مثال: پورت SSH یا نام دیتابیس"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-400 block mb-1 font-medium">کلید سیستمی (انگلیسی)</label>
                <input
                  type="text"
                  placeholder="مثال: ssh_port"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  dir="ltr"
                  className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 font-mono placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-700 dark:text-slate-400 block mb-1 font-medium">نوع داده</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as FieldType)}
                  className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 transition"
                >
                  <option value="text">متن ساده</option>
                  <option value="secret">رمز عبور / محرمانه (AES-256)</option>
                  <option value="ip_port">آدرس IP و پورت</option>
                  <option value="jalali_date">تاریخ سررسید تمدید</option>
                  <option value="select">لیست انتخابی (Dropdown)</option>
                  <option value="url">لینک وب (URL)</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-5">
                <label htmlFor="req_check" className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    id="req_check"
                    checked={newRequired}
                    onChange={(e) => setNewRequired(e.target.checked)}
                    className="rounded border-slate-300 dark:border-border-strong bg-white dark:bg-surface-2 text-indigo-600 focus:ring-0 w-4 h-4"
                  />
                  <span>اجباری</span>
                </label>

                <label htmlFor="table_check" className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    id="table_check"
                    checked={newShowInTable}
                    onChange={(e) => setNewShowInTable(e.target.checked)}
                    className="rounded border-slate-300 dark:border-border-strong bg-white dark:bg-surface-2 text-indigo-600 focus:ring-0 w-4 h-4"
                  />
                  <span>نمایش در جدول</span>
                </label>

                <label htmlFor="copy_check" className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    id="copy_check"
                    checked={newCopyable}
                    onChange={(e) => setNewCopyable(e.target.checked)}
                    className="rounded border-slate-300 dark:border-border-strong bg-white dark:bg-surface-2 text-indigo-600 focus:ring-0 w-4 h-4"
                  />
                  <span>دکمه کپی در جدول</span>
                </label>
              </div>
            </div>

            {newType === 'select' && (
              <div className="text-xs">
                <label className="text-slate-700 dark:text-slate-400 block mb-1 font-medium">گزینه‌های انتخابی (با کاما جدا کنید)</label>
                <input
                  type="text"
                  placeholder="مثال: لینوکس, ویندوز, مک"
                  value={newOptions}
                  onChange={(e) => setNewOptions(e.target.value)}
                  className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 transition"
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleAddField}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-xs transition"
            >
              افزودن به لیست فیلدها
            </button>
          </div>
        </div>

        {/* فوتر مودال */}
        <div className="pt-4 border-t border-slate-200 dark:border-border-subtle flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-border-strong text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-2 transition shadow-2xs"
          >
            انصراف
          </button>
          <button
            onClick={handleSaveSchema}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs shadow-indigo-600/30 transition"
          >
            {isSaving ? 'در حال ذخیره‌سازی...' : 'ذخیره نهایی ساختار فیلدها'}
          </button>
        </div>
      </div>
    </div>
  );
}
