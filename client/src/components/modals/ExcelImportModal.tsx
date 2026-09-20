import React, { useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  ArrowRight,
  Filter,
  Check,
  FileCheck
} from 'lucide-react';
import { AssetType } from '../../services/asset-types.service.ts';
import { 
  downloadExcelTemplate, 
  parseAndValidateExcel, 
  ExcelParseResult, 
  ParsedRow 
} from '../../services/excel.service.ts';
import { useToast } from '../../context/ToastContext.tsx';

interface ExcelImportModalProps {
  isOpen: boolean;
  assetType: AssetType;
  onClose: () => void;
  onImport: (validRows: ParsedRow[]) => Promise<void>;
}

export function ExcelImportModal({
  isOpen,
  assetType,
  onClose,
  onImport,
}: ExcelImportModalProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'valid' | 'invalid'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  if (!isOpen) return null;

  const handleProcessFile = async (file: File) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      showToast('لطفاً یک فایل با پسوند .xlsx ، .xls یا .csv انتخاب کنید.', 'error');
      return;
    }

    setSelectedFile(file);
    setIsParsing(true);
    setParseResult(null);

    try {
      const result = await parseAndValidateExcel(file, assetType);
      setParseResult(result);
      if (result.validRows.length > 0) {
        showToast(`${result.validRows.length} ردیف معتبر از فایل استخراج شد.`, 'success');
      } else {
        showToast('هیچ ردیف معتبری در فایل یافت نشد. به خطاها دقت نمایید.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'خطا در پردازش فایل اکسل', 'error');
      setSelectedFile(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleResetFile = () => {
    setSelectedFile(null);
    setParseResult(null);
    setActiveFilter('all');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    try {
      downloadExcelTemplate(assetType);
      showToast(`قالب اکسل ${assetType.name} با موفقیت دانلود شد.`, 'info');
    } catch {
      showToast('خطا در ایجاد قالب اکسل', 'error');
    }
  };

  const handleConfirmImport = async () => {
    if (!parseResult || parseResult.validRows.length === 0) return;
    setIsSubmitting(true);
    try {
      await onImport(parseResult.validRows);
      showToast(`${parseResult.validRows.length} دارایی با موفقیت در سامانه ثبت شد.`, 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'خطا در ذخیره‌سازی داده‌ها در سرور', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRows = () => {
    if (!parseResult) return [];
    if (activeFilter === 'valid') return parseResult.validRows;
    if (activeFilter === 'invalid') return parseResult.invalidRows;
    return parseResult.allRows;
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
        className="w-full max-w-4xl bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl shadow-2xl p-6 text-right flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 cursor-default"
      >
        {/* سربرگ مودال */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-border-subtle shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-500/30 flex items-center justify-center shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>بارگذاری دسته‌ای دارایی‌ها از اکسل</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 font-semibold">
                  {assetType.name}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                فایل اکسل تکمیل‌شده را وارد نمایید یا ابتدا قالب استاندارد را دریافت کنید
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-border-strong bg-slate-50 hover:bg-slate-100 dark:bg-surface-2 dark:hover:bg-surface-elevated text-xs font-semibold text-slate-700 dark:text-slate-200 transition shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>دریافت قالب اکسل استاندارد</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-surface-2 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* محتوای مودال */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* منطقه درگ اند دراپ فایل */}
          {!selectedFile ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                isDragOver
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-600/10 scale-[0.99]'
                  : 'border-slate-300 dark:border-border-strong hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-slate-50/60 dark:hover:bg-surface-2/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleProcessFile(e.target.files[0]);
                  }
                }}
              />
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-500/30 shadow-2xs">
                <UploadCloud className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  فایل اکسل خود را اینجا رها کنید، یا کلیک نمایید
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  پشتیبانی از فرمت‌های XLSX ، XLS و CSV با نگاشت خودکار ستون‌ها
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* خلاصه فایل بارگذاری شده */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-surface-2 border border-slate-200 dark:border-border-subtle">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white" dir="ltr">
                      {selectedFile.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {(selectedFile.size / 1024).toFixed(1)} کیلوبایت • دسته‌بندی «{assetType.name}»
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetFile}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>انتخاب فایل دیگر</span>
                  </button>
                </div>
              </div>

              {/* نوار وضعیت اعتبارسنجی و فیلترها */}
              {isParsing ? (
                <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
                  <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto" />
                  <div>در حال خواندن و اعتبارسنجی ردیف‌های فایل...</div>
                </div>
              ) : parseResult ? (
                <>
                  <div className="flex items-center justify-between bg-white dark:bg-surface-1 p-2 rounded-lg border border-slate-200 dark:border-border-strong">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveFilter('all')}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                          activeFilter === 'all'
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-2'
                        }`}
                      >
                        کل ردیف‌ها ({parseResult.totalRows})
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveFilter('valid')}
                        className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                          activeFilter === 'valid'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>معتبر ({parseResult.validRows.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveFilter('invalid')}
                        className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                          activeFilter === 'invalid'
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                        }`}
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>دارای خطا ({parseResult.invalidRows.length})</span>
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {parseResult.validRows.length} از {parseResult.totalRows} آماده ورود
                    </div>
                  </div>

                  {/* جدول پیش‌نمایش ردیف‌ها */}
                  <div className="border border-slate-200 dark:border-border-strong rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-right border-collapse text-xs">
                      <thead className="sticky top-0 bg-slate-100 dark:bg-surface-2 border-b border-slate-200 dark:border-border-strong text-slate-700 dark:text-slate-300 font-semibold z-10">
                        <tr>
                          <th className="p-2.5 w-16 text-center">ردیف</th>
                          <th className="p-2.5 w-24 text-center">وضعیت</th>
                          <th className="p-2.5">عنوان دارایی</th>
                          <th className="p-2.5">مقادیر استخراج‌شده</th>
                          <th className="p-2.5">توضیحات خطا</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/80 dark:divide-border-subtle">
                        {filteredRows().map((row) => (
                          <tr
                            key={row.rowNumber}
                            className={`transition ${
                              row.isValid
                                ? 'hover:bg-slate-50 dark:hover:bg-surface-2/50'
                                : 'bg-rose-50/40 dark:bg-rose-950/10 hover:bg-rose-50/70'
                            }`}
                          >
                            <td className="p-2.5 text-center font-mono text-slate-500 dark:text-slate-400">
                              {row.rowNumber}
                            </td>
                            <td className="p-2.5 text-center">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                                  <Check className="w-3 h-3" />
                                  معتبر
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300">
                                  <AlertCircle className="w-3 h-3" />
                                  خطا
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 font-semibold text-slate-900 dark:text-slate-100">
                              <div>{row.title}</div>
                              {row.tags && row.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {row.tags.map((t) => (
                                    <span key={t} className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-[10px] font-medium">
                                      #{t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-300">
                              <div className="flex flex-wrap gap-1 max-w-sm">
                                {Object.entries(row.inputValues).length > 0 ? (
                                  Object.entries(row.inputValues).map(([key, val]) => (
                                    <span
                                      key={key}
                                      className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-surface-2 border border-slate-200/70 dark:border-border-strong text-[11px] font-mono"
                                    >
                                      {key}: {String(val)}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-500 text-[11px]">—</span>
                                )}
                              </div>
                            </td>
                            <td className="p-2.5 text-rose-600 dark:text-rose-400 text-[11px]">
                              {row.errors.length > 0 ? (
                                <ul className="list-disc list-inside space-y-0.5">
                                  {row.errors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))}

                        {filteredRows().length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-400">
                              ردیفی مطابق این فیلتر وجود ندارد.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>

        {/* فوتر دکمه‌های اقدام */}
        <div className="pt-4 border-t border-slate-200 dark:border-border-subtle flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {parseResult && parseResult.validRows.length > 0 && (
              <span>
                با تایید، تعداد <strong className="text-emerald-600 dark:text-emerald-400">{parseResult.validRows.length}</strong> دارایی با رمزنگاری پیشرفته ذخیره خواهند شد.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-border-strong text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-2 transition shadow-2xs"
            >
              انصراف
            </button>

            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={isSubmitting || !parseResult || parseResult.validRows.length === 0}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-semibold shadow-xs shadow-emerald-600/30 transition"
            >
              {isSubmitting ? (
                <span>در حال ثبت اطلاعات در سرور...</span>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>
                    ثبت و ورود {parseResult ? parseResult.validRows.length : 0} دارایی معتبر
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
