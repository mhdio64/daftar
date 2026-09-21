import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Printer,
  X,
  FileText,
  Shield,
  Building2,
  Calendar,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Tag,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import { Asset } from '../../services/assets.service.ts';
import { AssetType, FieldDefinition } from '../../services/asset-types.service.ts';
import { useToast } from '../../context/ToastContext.tsx';

interface AssetDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
  assetType: AssetType;
}

function formatJalali(isoString?: string | null): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return String(isoString);
  }
}

function formatJalaliDateTime(isoString?: string | null): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return String(isoString);
  }
}

const RELATION_LABELS: Record<string, string> = {
  HOSTED_ON: 'میزبانی روی',
  DEPENDS_ON: 'وابسته به',
  POINTS_TO: 'اشاره به (DNS/Proxy)',
  BACKUP_OF: 'پشتیبان از',
  RELATED_TO: 'مرتبط با',
};

export function AssetDossierModal({ isOpen, onClose, asset, assetType }: AssetDossierModalProps) {
  const { showToast } = useToast();

  const [companyName, setCompanyName] = useState('سازمان / شرکت توسعه فناوری اطلاعات');
  const [docDepartment, setDocDepartment] = useState('مدیریت فناوری اطلاعات و زیرساخت');
  const [classification, setClassification] = useState<'محرمانه' | 'داخلی' | 'عمومی'>('محرمانه');
  const [maskSecrets, setMaskSecrets] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  // تولید شماره پرونده و کد اموال یکتا
  const cleanId = asset.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const propertyCode = `DFT-${cleanId.slice(0, 8)}`;
  const documentRef = `DOC-DFT-${cleanId.slice(0, 6)}`;
  const currentDateJalali = new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const assetDeepLinkUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?assetId=${asset.id}`
    : `/?assetId=${asset.id}`;

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    QRCode.toDataURL(assetDeepLinkUrl, {
      width: 280,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Error generating dossier QR:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, assetDeepLinkUrl]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(assetDeepLinkUrl);
    setCopiedLink(true);
    showToast('پیوند مستقیم شناسنامه کپی شد.', 'info');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // گردآوری فیلدهای فنی
  const schemaFields: FieldDefinition[] = assetType?.schemaDefinition || [];
  const renderedFieldKeys = new Set(schemaFields.map(f => f.name));
  
  // فیلدهای اضافی موجود در values که شاید در schema تعریف نشده باشند
  const extraFields = Object.entries(asset.values || {})
    .filter(([k]) => !renderedFieldKeys.has(k) && !k.startsWith('_'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      {/* نوار ابزار بالا و کنترل‌ها (در پرینت مخفی می‌شود) */}
      <div className="w-full max-w-4xl my-auto space-y-4 no-print">
        <div className="bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-subtle rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3 text-slate-800 dark:text-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800/40">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                شناسنامه رسمی و برگه مشخصات فنی دارایی
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                قالب رسمی قطع A4 سازمانی جهت بایگانی، ممیزی و ارائه به مدیریت و حسابداری
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* کلید ماسک کردن پسوردها */}
            <button
              type="button"
              onClick={() => setMaskSecrets(!maskSecrets)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                maskSecrets
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50'
                  : 'bg-slate-100 dark:bg-surface-2 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-border-strong'
              }`}
              title="تغییر وضعیت نمایش پسوردها و کلیدهای محرمانه در برگه چاپی"
            >
              {maskSecrets ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5 text-emerald-600" />}
              <span>{maskSecrets ? 'اطلاعات حساس: ماسک‌شده' : 'اطلاعات حساس: نمایان'}</span>
            </button>

            {/* دکمه پرینت */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-md shadow-indigo-600/30"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ شناسنامه / خروجی PDF</span>
            </button>

            {/* دکمه بستن */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-surface-2 transition"
              title="بستن"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* تنظیمات سفارشی‌سازی متن سربرگ */}
        <div className="bg-slate-50 dark:bg-surface-2 border border-slate-200 dark:border-border-strong rounded-xl p-3 text-xs flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <span className="text-slate-500 font-medium shrink-0">نام شرکت/سازمان:</span>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-100 font-medium focus:ring-1 focus:ring-indigo-500 outline-hidden"
              placeholder="نام شرکت یا سازمان..."
            />
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[180px]">
            <span className="text-slate-500 font-medium shrink-0">واحد متولی:</span>
            <input
              type="text"
              value={docDepartment}
              onChange={(e) => setDocDepartment(e.target.value)}
              className="w-full bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-100 font-medium focus:ring-1 focus:ring-indigo-500 outline-hidden"
              placeholder="واحد مربوطه..."
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium shrink-0">سطح طبقه‌بندی:</span>
            <select
              value={classification}
              onChange={(e) => setClassification(e.target.value as any)}
              className="bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-100 font-medium focus:ring-1 focus:ring-indigo-500 outline-hidden"
            >
              <option value="محرمانه">محرمانه (Confidential)</option>
              <option value="داخلی">داخلی (Internal)</option>
              <option value="عمومی">عمومی (Public)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition"
            title="کپی لینک مستقیم"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>لینک مستقیم</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* سند چاپی رسمی در ابعاد استاندار A4 (عرض مناسب و آماده پرینت) */}
      {/* ============================================================== */}
      <div className="printable-dossier-area w-full max-w-[840px] bg-white text-slate-900 rounded-2xl shadow-2xl p-6 sm:p-10 border border-slate-200 print:border-none print:shadow-none print:p-2 print:m-0 print:rounded-none my-6">
        
        {/* ۱. سربرگ رسمی سند */}
        <div className="border-b-2 border-slate-900 pb-4 mb-5">
          <div className="flex items-center justify-between gap-4">
            {/* مشخصات سند در سمت راست */}
            <div className="text-right space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block"></span>
                <span className="font-extrabold text-base sm:text-lg text-slate-950 tracking-tight">
                  {companyName}
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-600">
                {docDepartment}
              </div>
              <div className="text-[11px] text-slate-500">
                سامانه جامع مدیریت دارایی‌های دیجیتال و زیرساخت (دفتر)
              </div>
            </div>

            {/* عنوان وسط برگه */}
            <div className="text-center">
              <div className="inline-block px-4 py-1.5 rounded-lg border-2 border-slate-900 bg-slate-50 font-black text-sm sm:text-base text-slate-900 tracking-tight shadow-2xs">
                شناسنامه رسمی و کارت مشخصات دارایی
              </div>
              <div className="text-[10px] text-slate-500 mt-1 font-mono tracking-wider font-semibold">
                ASSET TECHNICAL PASSPORT & DOSSIER
              </div>
            </div>

            {/* کدهای مرجع و تاریخ در سمت چپ */}
            <div className="text-left text-xs space-y-1 font-mono shrink-0" dir="ltr">
              <div className="flex items-center justify-end gap-1.5">
                <span className="font-sans text-[11px] font-semibold text-slate-600" dir="rtl">شماره سند:</span>
                <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                  {documentRef}
                </span>
              </div>
              <div className="flex items-center justify-end gap-1.5">
                <span className="font-sans text-[11px] font-semibold text-slate-600" dir="rtl">تاریخ صدور:</span>
                <span className="font-bold text-slate-800">{currentDateJalali}</span>
              </div>
              <div className="flex items-center justify-end gap-1.5">
                <span className="font-sans text-[11px] font-semibold text-slate-600" dir="rtl">طبقه‌بندی:</span>
                <span className={`font-sans font-bold text-[10px] px-2 py-0.5 rounded ${
                  classification === 'محرمانه'
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : classification === 'داخلی'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}>
                  {classification}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ۲. کارت هویت دارایی (عنوان، نوع، کد اموال، بارکد و QR) */}
        <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/70 mb-5 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            
            {/* اطلاعات سمت راست */}
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  دسته: {assetType.name}
                </span>
                <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-300">
                  کد اموال: {propertyCode}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  ID: {asset.id}
                </span>
              </div>

              <h1 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight mt-1">
                {asset.title}
              </h1>

              {asset.tags && asset.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <Tag className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[11px] font-semibold text-slate-600">برچسب‌ها:</span>
                  {asset.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-white text-slate-700 border border-slate-200"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* بازنمایی بارکد استاندارد Code-128 خطی */}
              <div className="pt-2">
                <div className="inline-flex flex-col items-start bg-white p-1.5 px-3 rounded-lg border border-slate-300">
                  <div className="flex items-center gap-[2px] h-7 px-1">
                    {[2,1,3,1,2,3,1,2,1,3,2,1,2,1,3,1,2,3,1,2,1,3,2,1,2,1,3,1,2,3,1,2,1,3,2,1].map((w, i) => (
                      <div
                        key={i}
                        className="bg-slate-900 h-full"
                        style={{ width: `${w * 1.5}px` }}
                      />
                    ))}
                  </div>
                  <div className="font-mono text-[9px] font-bold text-slate-600 tracking-widest text-center w-full mt-0.5" dir="ltr">
                    *{propertyCode}*
                  </div>
                </div>
              </div>
            </div>

            {/* QR Code در سمت چپ */}
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-slate-300 shrink-0 self-center sm:self-auto shadow-2xs">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code" className="w-28 h-28 object-contain rounded" />
              ) : (
                <div className="w-28 h-28 flex items-center justify-center bg-slate-100 text-slate-400 text-xs">
                  در حال بارگذاری QR...
                </div>
              )}
              <span className="text-[9px] font-bold text-slate-700 mt-1 font-mono tracking-tight" dir="ltr">
                SCAN FOR LIVE RECORD
              </span>
            </div>

          </div>
        </div>

        {/* ۳. جدول مشخصات فنی کامل (Technical Specifications Table) */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              جدول مشخصات و پارامترهای فنی دارایی
            </h3>
            <span className="text-[10px] text-slate-500">
              تعداد مشخصه‌های ثبت‌شده: {schemaFields.length + extraFields.length}
            </span>
          </div>

          <table className="w-full border-collapse border border-slate-300 text-right text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                <th className="border border-slate-300 p-2 w-12 text-center">ردیف</th>
                <th className="border border-slate-300 p-2 w-1/4">عنوان پارامتر</th>
                <th className="border border-slate-300 p-2 w-28 text-center">شناسه فنی (Key)</th>
                <th className="border border-slate-300 p-2">مقدار تنظیم‌شده</th>
                <th className="border border-slate-300 p-2 w-24 text-center">نوع داده</th>
              </tr>
            </thead>
            <tbody>
              {schemaFields.map((field, index) => {
                const val = asset.values?.[field.name];
                const isSecret = field.isSecret || field.type === 'secret';
                let displayVal: React.ReactNode = '-';

                if (val !== undefined && val !== null && String(val).trim() !== '') {
                  if (isSecret && maskSecrets) {
                    displayVal = (
                      <span className="font-mono text-slate-500 font-bold tracking-widest">
                        ••••••••••••
                      </span>
                    );
                  } else if (field.type === 'jalali_date') {
                    displayVal = formatJalali(String(val));
                  } else if (typeof val === 'boolean') {
                    displayVal = val ? 'فعال (بله)' : 'غیرفعال (خیر)';
                  } else if (typeof val === 'object') {
                    displayVal = JSON.stringify(val);
                  } else {
                    displayVal = String(val);
                  }
                }

                return (
                  <tr key={field.id || field.name} className="border-b border-slate-200 hover:bg-slate-50/50 page-break-inside-avoid">
                    <td className="border border-slate-300 p-2 text-center text-slate-500 font-medium">
                      {index + 1}
                    </td>
                    <td className="border border-slate-300 p-2 font-semibold text-slate-900">
                      {field.label}
                      {field.isRequired && <span className="text-rose-500 mr-1">*</span>}
                    </td>
                    <td className="border border-slate-300 p-2 text-center font-mono text-[11px] text-slate-600" dir="ltr">
                      {field.name}
                    </td>
                    <td className="border border-slate-300 p-2 font-medium text-slate-800" dir={field.type === 'ip_port' || field.type === 'url' ? 'ltr' : 'auto'}>
                      {displayVal}
                    </td>
                    <td className="border border-slate-300 p-2 text-center text-[11px] text-slate-600">
                      {field.type}
                    </td>
                  </tr>
                );
              })}

              {/* نمایش فیلدهای فرعی و سفارشی */}
              {extraFields.map(([key, val], idx) => {
                const isKeySecret = key.toLowerCase().includes('pass') || key.toLowerCase().includes('secret');
                return (
                  <tr key={key} className="border-b border-slate-200 hover:bg-slate-50/50 page-break-inside-avoid">
                    <td className="border border-slate-300 p-2 text-center text-slate-500 font-medium">
                      {schemaFields.length + idx + 1}
                    </td>
                    <td className="border border-slate-300 p-2 font-semibold text-slate-800">
                      {key}
                    </td>
                    <td className="border border-slate-300 p-2 text-center font-mono text-[11px] text-slate-600" dir="ltr">
                      {key}
                    </td>
                    <td className="border border-slate-300 p-2 font-medium text-slate-800">
                      {isKeySecret && maskSecrets ? '••••••••' : String(val)}
                    </td>
                    <td className="border border-slate-300 p-2 text-center text-[11px] text-slate-500">
                      custom
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ۴. ماتریس وابستگی‌ها و ارتباطات ساختاری (Connected Architecture) */}
        {asset.relations && asset.relations.length > 0 && (
          <div className="mb-5 page-break-inside-avoid">
            <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              ارتباطات و اتصالات ساختاری دارایی (Architecture Topology)
            </h3>
            <table className="w-full border-collapse border border-slate-300 text-right text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <th className="border border-slate-300 p-2 w-12 text-center">ردیف</th>
                  <th className="border border-slate-300 p-2 w-1/3">دارایی وابسته / مرجع</th>
                  <th className="border border-slate-300 p-2 w-32 text-center">نوع رابطه</th>
                  <th className="border border-slate-300 p-2">توضیحات و یادداشت ارتباطی</th>
                </tr>
              </thead>
              <tbody>
                {asset.relations.map((rel, idx) => (
                  <tr key={rel.id || idx} className="border-b border-slate-200">
                    <td className="border border-slate-300 p-2 text-center text-slate-500">{idx + 1}</td>
                    <td className="border border-slate-300 p-2 font-bold text-slate-900">
                      {rel.targetAsset?.title || rel.targetAssetId}
                      <span className="text-[10px] text-slate-500 font-mono block font-normal">
                        ({rel.targetAsset?.assetTypeName || 'Asset'})
                      </span>
                    </td>
                    <td className="border border-slate-300 p-2 text-center font-semibold text-indigo-800 bg-indigo-50/40">
                      {RELATION_LABELS[rel.type] || rel.type}
                    </td>
                    <td className="border border-slate-300 p-2 text-slate-700">
                      {rel.note || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ۵. سوابق سیستمی و چرخه حیات (Audit & Lifecycle Trail) */}
        <div className="border border-slate-300 rounded-xl p-3 bg-slate-50 mb-6 page-break-inside-avoid">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">زمان ثبت در سامانه:</span>
              <span className="font-bold text-slate-900">{formatJalaliDateTime(asset.createdAt)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">آخرین تغییر و ویرایش:</span>
              <span className="font-bold text-slate-900">{formatJalaliDateTime(asset.updatedAt)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">تاریخ انقضا / تمدید:</span>
              <span className="font-bold text-slate-900">{formatJalali(asset.expiryDate)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">وضعیت پایگاه داده:</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                تأییدشده و معتبر
              </span>
            </div>
          </div>
        </div>

        {/* ۶. بخش تأییدیه‌ها، امضاها و انتساب سازمانی (Sign-off & Approvals) */}
        <div className="border border-slate-300 rounded-xl p-4 bg-white mb-4 page-break-inside-avoid">
          <div className="text-center font-bold text-xs text-slate-800 pb-3 border-b border-slate-200">
            محل تأییدیه، امضا و صحت‌سنجی اطلاعات سازمانی
          </div>

          <div className="grid grid-cols-3 gap-3 pt-3 text-center text-xs">
            {/* ستون ۱ */}
            <div className="border border-dashed border-slate-300 rounded-lg p-2.5 space-y-8">
              <div className="font-bold text-slate-800 text-[11px]">
                تهیه‌کننده و کارشناس زیرساخت
              </div>
              <div className="space-y-1 text-[10px] text-slate-500">
                <div>نام و نام خانوادگی: ........................</div>
                <div>تاریخ و امضا: ........................</div>
              </div>
            </div>

            {/* ستون ۲ */}
            <div className="border border-dashed border-slate-300 rounded-lg p-2.5 space-y-8">
              <div className="font-bold text-slate-800 text-[11px]">
                تأییدکننده فنی و مدیر امنیت اطلاعات
              </div>
              <div className="space-y-1 text-[10px] text-slate-500">
                <div>نام و نام خانوادگی: ........................</div>
                <div>تاریخ و امضا: ........................</div>
              </div>
            </div>

            {/* ستون ۳ */}
            <div className="border border-dashed border-slate-300 rounded-lg p-2.5 space-y-8">
              <div className="font-bold text-slate-800 text-[11px]">
                مسئول اموال و امور مالی / حسابداری
              </div>
              <div className="space-y-1 text-[10px] text-slate-500">
                <div>نام و نام خانوادگی: ........................</div>
                <div>تاریخ و امضا: ........................</div>
              </div>
            </div>
          </div>
        </div>

        {/* ۷. پاورقی حقوقی و هشدار انطباق سازمانی */}
        <div className="pt-3 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500">
          <div>
            ⚠️ این سند به عنوان شناسنامه رسمی دارایی دیجیتال/فیزیکی در سامانه مرکزی ثبت گردیده و هرگونه تغییرات فنی بایستی سریعاً در سامانه به‌روزرسانی شود.
          </div>
          <div className="font-mono text-slate-700 font-semibold" dir="ltr">
            Page 1 of 1
          </div>
        </div>

      </div>
    </div>
  );
}
