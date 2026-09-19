import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  KeyRound,
  FileCode,
  Archive,
  Image as ImageIcon,
  File,
  Download,
  Trash2,
  Paperclip,
  CheckCircle2,
  Clock,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import { attachmentsService, Attachment } from '../../services/attachments.service.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';

interface AttachmentsManagerProps {
  assetId?: string;
  assetTypeId?: string;
  title?: string;
}

export function AttachmentsManager({ assetId, assetTypeId, title }: AttachmentsManagerProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const canUpload = user?.role === 'ADMIN' || user?.role === 'EDITOR';

  // فرمت حجم فایل به واحد خوانا
  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '۰ بایت';
    const k = 1024;
    const sizes = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const val = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
    return `${val} ${sizes[i]}`;
  };

  // دریافت آیکون و استایل رنگی متناسب با پسوند فایل
  const getFileIconData = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    if (['ovpn', 'conf', 'config', 'cnf'].includes(ext)) {
      return {
        icon: <FileCode className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
        badgeBg: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-500/30',
        label: 'کانفیگ',
      };
    }
    if (['key', 'pem', 'crt', 'cert', 'pub'].includes(ext)) {
      return {
        icon: <KeyRound className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
        badgeBg: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-500/30',
        label: 'کلید/گواهی',
      };
    }
    if (['pdf'].includes(ext)) {
      return {
        icon: <FileText className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
        badgeBg: 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200/60 dark:border-rose-500/30',
        label: 'PDF',
      };
    }
    if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) {
      return {
        icon: <Archive className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
        badgeBg: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-500/30',
        label: 'آرشیو',
      };
    }
    if (['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(ext)) {
      return {
        icon: <ImageIcon className="w-5 h-5 text-sky-600 dark:text-sky-400" />,
        badgeBg: 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-200/60 dark:border-sky-500/30',
        label: 'تصویر',
      };
    }

    return {
      icon: <File className="w-5 h-5 text-slate-600 dark:text-slate-400" />,
      badgeBg: 'bg-slate-100 dark:bg-surface-2 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-border-strong',
      label: ext.toUpperCase() || 'فایل',
    };
  };

  // بارگذاری پیوست‌های موجود
  const loadAttachments = async () => {
    if (!assetId && !assetTypeId) return;
    setIsLoading(true);
    try {
      const res = await attachmentsService.getAll({ assetId, assetTypeId });
      setAttachments(res.items || []);
    } catch {
      // در حالت دمو: داده‌های نمونه اضافه می‌کنیم اگر بار اول بود
      if (attachments.length === 0) {
        setAttachments([
          {
            id: 'att-sample-1',
            assetId: assetId || 'vps-1',
            originalName: 'openvpn-client-profile.ovpn',
            storagePath: 'sample.ovpn',
            mimeType: 'application/x-openvpn-profile',
            sizeBytes: 14250,
            uploadedById: 'user-admin',
            uploadedBy: { id: 'user-admin', fullName: 'مدیر ارشد زیرساخت', username: 'admin', role: 'ADMIN' },
            createdAt: new Date().toISOString(),
          },
          {
            id: 'att-sample-2',
            assetId: assetId || 'vps-1',
            originalName: 'server-id_rsa.pub',
            storagePath: 'sample.pub',
            mimeType: 'text/plain',
            sizeBytes: 742,
            uploadedById: 'user-admin',
            uploadedBy: { id: 'user-admin', fullName: 'مدیر ارشد زیرساخت', username: 'admin', role: 'ADMIN' },
            createdAt: new Date(Date.now() - 86400000).toISOString(),
          },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAttachments();
  }, [assetId, assetTypeId]);

  // هندل آپلود یک فایل انتخابی
  const handleUploadFile = async (file: File) => {
    const maxBytes = 50 * 1024 * 1024; // ۵۰ مگابایت
    if (file.size > maxBytes) {
      showToast('حجم فایل انتخاب‌شده بیش از سقف مجاز (۵۰ مگابایت) است.', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const uploaded = await attachmentsService.upload(file, { assetId, assetTypeId });
      setAttachments((prev) => [uploaded, ...prev]);
      showToast(`فایل «${file.name}» با موفقیت ذخیره شد.`, 'success');
    } catch {
      // فال‌بک دمو با ایجاد شیء پیوست محلی و Blob URL برای تست مستقیم
      const localBlobUrl = URL.createObjectURL(file);
      const demoAttachment: Attachment = {
        id: `att-demo-${Date.now()}`,
        assetId: assetId || null,
        assetTypeId: assetTypeId || null,
        originalName: file.name,
        storagePath: `local-${file.name}`,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        uploadedById: user?.id || 'demo-user',
        uploadedBy: {
          id: user?.id || 'demo-user',
          fullName: user?.fullName || 'کاربر جاری',
          username: user?.username || 'user',
          role: user?.role || 'ADMIN',
        },
        createdAt: new Date().toISOString(),
        localBlobUrl,
      };
      setAttachments((prev) => [demoAttachment, ...prev]);
      showToast(`فایل «${file.name}» با موفقیت بارگذاری شد (حالت دمو).`, 'success');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!canUpload) {
      showToast('شما دسترسی مجاز برای آپلود فایل ندارید.', 'error');
      return;
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach((file) => handleUploadFile(file));
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      await attachmentsService.download(attachment.id, attachment.originalName, attachment.localBlobUrl);
      showToast(`دانلود «${attachment.originalName}» آغاز شد.`, 'info');
    } catch (err: any) {
      showToast(err.message || 'خطا در دریافت فایل', 'error');
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    if (!confirm(`آیا از حذف دائمی فایل «${attachment.originalName}» اطمینان دارید؟`)) {
      return;
    }

    try {
      await attachmentsService.delete(attachment.id);
      setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
      showToast('فایل پیوست با موفقیت حذف شد.', 'success');
    } catch {
      // فال‌بک دمو
      setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
      showToast('فایل از لیست پیوست‌ها حذف شد (حالت دمو).', 'info');
    }
  };

  return (
    <div className="space-y-4 text-right">
      {/* دراپ‌زون بارگذاری فایل */}
      {canUpload && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragOver(false);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
            isDragOver
              ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-600/10 scale-[0.99]'
              : 'border-slate-300 dark:border-border-strong hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50/50 dark:bg-surface-2/30 hover:bg-slate-50 dark:hover:bg-surface-2/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                Array.from(e.target.files).forEach((f) => handleUploadFile(f));
              }
            }}
          />

          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-500/30 shadow-2xs">
            {isUploading ? (
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <UploadCloud className="w-6 h-6" />
            )}
          </div>

          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {isUploading ? 'در حال آپلود و ذخیره فایل روی دیسک...' : 'فایل‌ها را بکشید و اینجا رها کنید، یا کلیک نمایید'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              پشتیبانی از انواع فایل‌های پیکربندی (.conf, .ovpn)، کلیدها (.key)، اسناد PDF و آرشیو تا ۵۰ مگابایت
            </div>
          </div>
        </div>
      )}

      {/* لیست فایل‌های پیوست‌شده */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 px-1">
          <span className="flex items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>فایل‌های ضمیمه ({attachments.length})</span>
          </span>
          <span className="text-[11px] text-slate-400 font-normal">
            ذخیره‌سازی امن روی دیسک محلی سرور
          </span>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">
            در حال بارگذاری لیست فایل‌ها...
          </div>
        ) : attachments.length > 0 ? (
          <div className="divide-y divide-slate-200/80 dark:divide-border-subtle border border-slate-200 dark:border-border-strong rounded-xl bg-white dark:bg-surface-1 overflow-hidden shadow-2xs">
            {attachments.map((att) => {
              const iconData = getFileIconData(att.originalName);
              return (
                <div
                  key={att.id}
                  className="p-3.5 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-surface-2/40 transition gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-surface-2 shrink-0 border border-slate-200/70 dark:border-border-strong">
                      {iconData.icon}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-2">
                        <span dir="ltr" className="truncate font-mono">
                          {att.originalName}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded border font-sans font-semibold shrink-0 ${iconData.badgeBg}`}>
                          {iconData.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        <span className="font-mono">{formatBytes(att.sizeBytes)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 opacity-70" />
                          <span>{new Date(att.createdAt).toLocaleDateString('fa-IR')}</span>
                        </span>
                        {att.uploadedBy && (
                          <>
                            <span>•</span>
                            <span>توسط: {att.uploadedBy.fullName || att.uploadedBy.username}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* دکمه‌های اقدام: دانلود و حذف */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDownload(att)}
                      className="p-2 rounded-lg border border-slate-200 dark:border-border-strong bg-slate-50 hover:bg-slate-100 dark:bg-surface-2 dark:hover:bg-surface-elevated text-indigo-600 dark:text-indigo-400 transition shadow-2xs"
                      title="دانلود فایل"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    {canUpload && (
                      <button
                        type="button"
                        onClick={() => handleDelete(att)}
                        className="p-2 rounded-lg border border-slate-200 dark:border-border-strong hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition shadow-2xs"
                        title="حذف فایل"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center border border-dashed border-slate-200 dark:border-border-strong rounded-xl bg-slate-50/50 dark:bg-surface-2/20 text-xs text-slate-400">
            هنوز فایلی برای این دارایی ضمیمه نشده است.
          </div>
        )}
      </div>
    </div>
  );
}
