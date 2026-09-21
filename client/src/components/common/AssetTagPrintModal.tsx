import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Printer,
  Download,
  X,
  Copy,
  Check,
  Tag,
  QrCode,
  Shield,
  Layers,
  Settings2,
  ExternalLink,
  Sparkles,
  Barcode
} from 'lucide-react';
import { Asset } from '../../services/assets.service.ts';
import { AssetType } from '../../services/asset-types.service.ts';
import { useToast } from '../../context/ToastContext.tsx';

interface AssetTagPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
  assetType: AssetType;
}

export function AssetTagPrintModal({ isOpen, onClose, asset, assetType }: AssetTagPrintModalProps) {
  const { showToast } = useToast();

  const [companyName, setCompanyName] = useState('سازمان / شرکت فناوری اطلاعات');
  const [propertyCode, setPropertyCode] = useState(() => {
    // تولید کد اموال استاندارد بر پایه شناسه دارایی
    const cleanId = asset.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return `DFT-${cleanId.slice(0, 8)}`;
  });
  const [tagLayout, setTagLayout] = useState<'single' | 'a4_grid'>('single');
  const [showTechnicalInfo, setShowTechnicalInfo] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const tagRef = useRef<HTMLDivElement>(null);

  // آدرس پیوند عمیق (Deep Link) برای باز شدن خودکار دارایی با اسکن
  const assetDeepLinkUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?assetId=${asset.id}`
    : `/?assetId=${asset.id}`;

  // تولید QR Code باکیفیت بالا
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsGenerating(true);

    QRCode.toDataURL(assetDeepLinkUrl, {
      width: 250,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#0f172a', // Deep slate
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
          setIsGenerating(false);
        }
      })
      .catch((err) => {
        console.error('Error generating asset tag QR code:', err);
        if (isMounted) setIsGenerating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, asset.id, assetDeepLinkUrl]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(assetDeepLinkUrl);
    setCopiedLink(true);
    showToast('لینک مستقیم شناسنامه دارایی کپی شد.', 'info');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // دانلود لیبل به صورت فایل تصویری با رزولوشن بالا
  const handleDownloadImage = async () => {
    if (!qrDataUrl) return;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 900;
      canvas.height = 500;

      // پس‌زمینه سفید با حاشیه استیل متالایز
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 12;
      ctx.strokeStyle = '#0f172a';
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

      // نوار هدر بالا
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(10, 10, canvas.width - 20, 75);

      ctx.direction = 'rtl';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(`پلاک اموال و تجهیزات • ${companyName}`, canvas.width - 35, 55);

      // رسم QR Code در سمت چپ
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = qrDataUrl;

      await new Promise((resolve) => {
        img.onload = resolve;
      });

      ctx.drawImage(img, 35, 110, 260, 260);

      ctx.direction = 'ltr';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('SCAN FOR DETAILS', 95, 395);

      // رسم مشخصات دارایی در سمت راست
      ctx.direction = 'rtl';

      // کد اموال
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(canvas.width - 550, 110, 500, 60);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.strokeRect(canvas.width - 550, 110, 500, 60);

      ctx.fillStyle = '#1e1b4b';
      ctx.font = 'bold 28px monospace';
      ctx.fillText(`کد اموال: ${propertyCode}`, canvas.width - 530, 150);

      // عنوان دارایی
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(asset.title, canvas.width - 530, 220);

      // دسته‌بندی
      ctx.fillStyle = '#475569';
      ctx.font = '20px sans-serif';
      ctx.fillText(`دسته‌بندی: ${assetType.name}`, canvas.width - 530, 265);

      // مشخصه فنی (مثلاً IP یا سیستم‌عامل)
      const ip = asset.values?.ip_address || asset.values?.serial_number || asset.values?.domain || '—';
      ctx.fillText(`شناسه/مشخصه فنی: ${ip}`, canvas.width - 530, 305);

      // تاریخ ثبت
      const dateStr = new Date(asset.createdAt || Date.now()).toLocaleDateString('fa-IR');
      ctx.fillText(`تاریخ ثبت: ${dateStr}`, canvas.width - 530, 345);

      // نوار هشدار زیرین
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(10, canvas.height - 55, canvas.width - 20, 45);
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('⚠️ هرگونه جداسازی، مخدوش کردن یا کندن این برچسب پیگرد سازمانی دارد.', canvas.width - 35, canvas.height - 25);

      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `برچسب_اموال_${propertyCode}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showToast('تصویر برچسب اموال با کیفیت بالا دانلود شد.', 'success');
    } catch (err: any) {
      showToast(err.message || 'خطا در دانلود تصویر برچسب', 'error');
    }
  };

  if (!isOpen) return null;

  // اطلاعات فنی کلیدی برای نمایش روی برچسب
  const keyTechSpec =
    asset.values?.ip_address ||
    asset.values?.serial_number ||
    asset.values?.domain ||
    asset.values?.mac_address ||
    null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 text-right"
    >
      <div className="w-full max-w-3xl bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* هدر مودال (در پرینت مخفی می‌شود) */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-border-subtle flex items-center justify-between bg-slate-50/70 dark:bg-surface-2/60 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>چاپ شناسنامه و برچسب فیزیکی اموال (Asset Tag)</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-mono font-bold">
                  QR Tagging
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                تولید لیبل با بارکد QR یکتا جهت چسباندن روی کیس سرور، لپ‌تاپ، رک یا تجهیزات اداری
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-surface-3 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* محتوای دو ستونه: تنظیمات چاپ و پیش‌نمایش برچسب */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* پنل تنظیمات شخصی‌سازی برچسب */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-surface-2 border border-slate-200/80 dark:border-border-subtle grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs no-print">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                نام سازمان / شرکت روی برچسب:
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-white dark:bg-surface-1 border border-slate-300 dark:border-border-strong rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                کد پلاک اموال (Property Code):
              </label>
              <input
                type="text"
                value={propertyCode}
                onChange={(e) => setPropertyCode(e.target.value)}
                dir="ltr"
                className="w-full bg-white dark:bg-surface-1 border border-slate-300 dark:border-border-strong rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-600 text-left"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                نوع و قالب خروجی چاپ:
              </label>
              <select
                value={tagLayout}
                onChange={(e) => setTagLayout(e.target.value as any)}
                className="w-full bg-white dark:bg-surface-1 border border-slate-300 dark:border-border-strong rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-600"
              >
                <option value="single">برچسب تکی (مناسب لیبل‌پرینتر و شبرنگ)</option>
                <option value="a4_grid">برگه A4 شبکه‌ای (چندتایی برای پرینتر معمولی)</option>
              </select>
            </div>
          </div>

          {/* پیش‌نمایش برچسب استاندارد اموال (بخش اصلی برای پرینت) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold no-print">
              <span>پیش‌نمایش ظاهر برچسب اموال (ابعاد استاندارد):</span>
              <span className="text-[11px] text-indigo-600 font-mono">
                {tagLayout === 'single' ? 'ابعاد: ۶۰×۴۰ میلی‌متر' : 'شبکه چاپی برگه A4'}
              </span>
            </div>

            {/* ظرف چاپی اصلی با کلاس printable-tag-area */}
            <div className="printable-tag-area flex flex-col items-center justify-center p-2">
              {tagLayout === 'single' ? (
                /* برچسب تکی با ظاهر متالایز شکیل اداری */
                <div
                  ref={tagRef}
                  className="w-full max-w-lg bg-white border-2 border-slate-900 rounded-xl p-3 shadow-md text-right text-slate-900 overflow-hidden relative"
                  style={{ minHeight: '210px' }}
                >
                  {/* نوار سربرگ پلاک اموال */}
                  <div className="bg-slate-900 text-white px-3 py-1.5 -mx-3 -mt-3 flex items-center justify-between mb-3 border-b-2 border-slate-900">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="font-bold text-xs">پلاک اموال و تجهیزات اداری</span>
                    </div>
                    <span className="text-[11px] text-slate-300 font-medium truncate max-w-[200px]">
                      {companyName}
                    </span>
                  </div>

                  {/* بدنه دو ستونه برچسب */}
                  <div className="flex items-center justify-between gap-4">
                    {/* ستون مشخصات دارایی در سمت راست */}
                    <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                      {/* کد اموال در کادر شاخص */}
                      <div className="inline-flex items-center gap-2 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-300">
                        <Barcode className="w-4 h-4 text-slate-700" />
                        <span className="font-mono font-black text-sm tracking-wider text-slate-900" dir="ltr">
                          {propertyCode}
                        </span>
                      </div>

                      <div className="pt-0.5">
                        <div className="font-extrabold text-sm text-slate-900 line-clamp-1">
                          {asset.title}
                        </div>
                        <div className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5">
                          <span className="font-semibold">دسته:</span>
                          <span>{assetType.name}</span>
                        </div>
                      </div>

                      {showTechnicalInfo && keyTechSpec && (
                        <div className="text-[11px] text-slate-600 flex items-center gap-1 font-mono" dir="ltr">
                          <span className="font-sans font-semibold text-slate-700">مشخصه/IP:</span>
                          <span className="truncate max-w-[180px] font-bold text-slate-800">{keyTechSpec}</span>
                        </div>
                      )}

                      <div className="text-[10px] text-slate-500 font-medium">
                        تاریخ ثبت: {new Date(asset.createdAt || Date.now()).toLocaleDateString('fa-IR')}
                      </div>
                    </div>

                    {/* ستون بارکد QR در سمت چپ */}
                    <div className="flex flex-col items-center justify-center shrink-0 border border-slate-200 rounded-xl p-1.5 bg-white shadow-2xs">
                      {qrDataUrl ? (
                        <img src={qrDataUrl} alt="QR Code" className="w-24 h-24 object-contain rounded" />
                      ) : (
                        <div className="w-24 h-24 flex items-center justify-center bg-slate-100 text-slate-400 text-[10px]">
                          در حال تولید...
                        </div>
                      )}
                      <span className="text-[9px] font-bold text-slate-600 mt-1 tracking-tight" dir="ltr">
                        SCAN FOR SPECS
                      </span>
                    </div>
                  </div>

                  {/* نوار اخطار قانونی پایین */}
                  <div className="mt-3 pt-1.5 border-t border-dashed border-slate-300 flex items-center justify-between text-[9px] text-slate-500">
                    <span className="text-rose-700 font-bold">
                      ⚠️ هرگونه مخدوش‌سازی، تعویض یا کندن این برچسب پیگرد سازمانی دارد.
                    </span>
                    <span className="font-bold text-slate-700 font-mono">Daftar Asset</span>
                  </div>
                </div>
              ) : (
                /* برگه A4 شبکه‌ای: شبکه ۶ یا ۸ برچسب در صفحه جهت پرینت کاغذ لیبل دار */
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="border border-dashed border-slate-400 rounded-xl p-3 bg-white text-right space-y-2 relative"
                    >
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 text-[11px] font-bold">
                        <span>{companyName}</span>
                        <span className="font-mono text-xs text-indigo-700">{propertyCode}-{i}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs space-y-1">
                          <div className="font-bold text-slate-900 text-xs truncate max-w-[150px]">{asset.title}</div>
                          <div className="text-[10px] text-slate-500">{assetType.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: {asset.id.slice(0, 8)}</div>
                        </div>
                        {qrDataUrl && <img src={qrDataUrl} alt="QR" className="w-16 h-16 object-contain" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* راهنمای اسکن و لینک مستقیم */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs no-print">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 dark:text-white">
                  با اسکن بارکد بالا با دوربین موبایل چه اتفاقی می‌افتد؟
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300">
                  دوربین گوشی کاربر مستقیماً به شناسنامه این دارایی متصل شده و تاریخچه، مشخصات فنی و تغییرات آن را فوراً باز می‌کند.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-xl border border-indigo-300 dark:border-indigo-500/40 bg-white dark:bg-surface-1 hover:bg-indigo-50 text-indigo-700 dark:text-indigo-300 text-xs font-medium flex items-center gap-1.5 transition shrink-0 shadow-2xs"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'کپی شد' : 'کپی لینک مستقیم'}</span>
            </button>
          </div>
        </div>

        {/* فوتر دکمه‌های عملیاتی (در پرینت مخفی است) */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-border-subtle bg-slate-50/70 dark:bg-surface-2/60 flex items-center justify-between shrink-0 no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-border-strong text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-2 text-xs font-medium transition"
          >
            انصراف و بستن
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isGenerating || !qrDataUrl}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-border-strong bg-white dark:bg-surface-1 hover:bg-slate-50 dark:hover:bg-surface-2 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>دانلود تصویر لیبل (PNG)</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isGenerating || !qrDataUrl}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 transition shadow-xs shadow-indigo-600/20 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ مستقیم برچسب اموال</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
