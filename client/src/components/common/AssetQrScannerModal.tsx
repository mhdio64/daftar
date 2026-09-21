import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  X,
  Upload,
  Search,
  AlertTriangle,
  QrCode,
  ScanLine,
  CheckCircle2,
  RefreshCw,
  VideoOff
} from 'lucide-react';
import { useToast } from '../../context/ToastContext.tsx';

interface AssetQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (assetId: string) => void;
}

export function AssetQrScannerModal({ isOpen, onClose, onScanSuccess }: AssetQrScannerModalProps) {
  const { showToast } = useToast();

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scanMode, setScanMode] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [detectedSuccess, setDetectedSuccess] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // استخراج شناسه دارایی از متن اسکن‌شده (چه لینک کامل باشد چه شناسه خام)
  const extractAssetId = (rawText: string): string => {
    const clean = rawText.trim();
    try {
      if (clean.includes('assetId=') || clean.includes('asset=')) {
        const url = new URL(clean, window.location.origin);
        const id = url.searchParams.get('assetId') || url.searchParams.get('asset');
        if (id) return id;
      }
    } catch {
      // اگر URL نبود
    }

    // اگر کد پلاک مثل DFT-VPS1 باشد
    return clean;
  };

  const handleSuccessDetection = (rawResult: string) => {
    const id = extractAssetId(rawResult);
    if (!id) return;

    setDetectedSuccess(true);
    showToast(`بارکد اموال شناسایی شد: ${id}`, 'success');

    // توقف دوربین
    stopCamera();

    setTimeout(() => {
      onScanSuccess(id);
      onClose();
    }, 600);
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const startCamera = async () => {
    stopCamera();
    setDetectedSuccess(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // ترجیح دوربین پشت در موبایل
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setHasCameraPermission(true);
        setIsScanning(true);
        requestAnimationFrame(tick);
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setHasCameraPermission(false);
      setScanMode('manual');
    }
  };

  const tick = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            handleSuccessDetection(code.data);
            return;
          }
        }
      }
    }

    if (isOpen) {
      animationFrameRef.current = requestAnimationFrame(tick);
    }
  };

  useEffect(() => {
    if (isOpen && scanMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, scanMode]);

  // اسکن از روی عکس آپلودشده
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height);

        if (code && code.data) {
          handleSuccessDetection(code.data);
        } else {
          showToast('بارکدی در تصویر ارسالی یافت نشد. لطفاً عکس واضح‌تری انتخاب کنید.', 'error');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) {
      showToast('لطفاً کد اموال یا شناسه دارایی را وارد کنید.', 'error');
      return;
    }
    handleSuccessDetection(manualCode.trim());
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopCamera();
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 text-right"
    >
      <div className="w-full max-w-md bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* هدر مودال اسکنر */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-border-subtle flex items-center justify-between bg-slate-50/70 dark:bg-surface-2/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                اسکن بارکد و QR اموال
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                جهت بازگشایی فوری شناسنامه و تاریخچه دارایی
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-surface-3 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* تب‌های انتخاب شیوه اسکن */}
        <div className="flex border-b border-slate-200 dark:border-border-subtle bg-slate-100/50 dark:bg-surface-2/30 p-1 text-xs">
          <button
            type="button"
            onClick={() => setScanMode('camera')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
              scanMode === 'camera'
                ? 'bg-white dark:bg-surface-1 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>دوربین زنده</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              setScanMode('upload');
            }}
            className={`flex-1 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
              scanMode === 'upload'
                ? 'bg-white dark:bg-surface-1 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>بارگذاری عکس</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              setScanMode('manual');
            }}
            className={`flex-1 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
              scanMode === 'manual'
                ? 'bg-white dark:bg-surface-1 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>ورود دستی کد</span>
          </button>
        </div>

        {/* محتوای بدنه اسکنر */}
        <div className="p-5 space-y-4">
          {scanMode === 'camera' ? (
            <div className="space-y-3">
              {/* کادر تصویر دوربین زنده */}
              <div className="relative w-full aspect-square bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-slate-800">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* افکت لیزر اسکنر متحرک */}
                {isScanning && !detectedSuccess && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    {/* کادر راهنمای اسکن */}
                    <div className="w-56 h-56 border-2 border-indigo-400/80 rounded-2xl relative">
                      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-indigo-500" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-indigo-500" />
                      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-indigo-500" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-indigo-500" />
                      {/* خط لیزر قرمز/بنفش در حال حرکت */}
                      <div className="w-full h-0.5 bg-rose-500 shadow-xs shadow-rose-500 animate-pulse absolute top-1/2" />
                    </div>
                  </div>
                )}

                {/* نشان موفقیت شناسایی */}
                {detectedSuccess && (
                  <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2 animate-in fade-in">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
                    <span className="text-xs font-bold">بارکد اموال با موفقیت شناسایی شد!</span>
                  </div>
                )}

                {hasCameraPermission === false && (
                  <div className="p-6 text-center text-slate-400 space-y-2">
                    <VideoOff className="w-10 h-10 mx-auto text-rose-500" />
                    <div className="text-xs font-bold text-slate-200">دسترسی به دوربین مسدود است یا دوربینی یافت نشد.</div>
                    <p className="text-[11px] text-slate-400">
                      لطفاً از تب بارگذاری عکس یا ورود دستی کد اموال استفاده نمایید.
                    </p>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                بارکد یا QR Code چسبانده‌شده روی دستگاه فیزیکی را در کادر دوربین قرار دهید.
              </p>
            </div>
          ) : scanMode === 'upload' ? (
            /* حالت بارگذاری عکس */
            <div className="space-y-3">
              <label className="border-2 border-dashed border-slate-300 dark:border-border-strong hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition bg-slate-50/50 dark:bg-surface-2/30">
                <Upload className="w-8 h-8 text-indigo-600 mb-2" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  انتخاب یا درگ تصویر بارکد اموال
                </span>
                <span className="text-[10px] text-slate-400 mt-1">فرمت‌های PNG، JPG و WEBP</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            /* حالت ورود دستی کد */
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  کد پلاک یا شناسه دارایی را وارد کنید:
                </label>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="مثلاً: vps-1 یا DFT-VPS1"
                  dir="ltr"
                  autoFocus
                  required
                  className="w-full bg-slate-50 dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-600 text-center"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5"
              >
                <Search className="w-4 h-4" />
                <span>جستجو و بازگشایی شناسنامه</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
