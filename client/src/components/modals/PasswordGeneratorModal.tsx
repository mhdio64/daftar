import React, { useState, useEffect, useCallback } from 'react';
import { X, KeyRound, RotateCw, Copy, Check, ShieldCheck, Sparkles, Sliders } from 'lucide-react';
import { useToast } from '../../context/ToastContext.tsx';

interface PasswordGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: (password: string) => void;
  initialLength?: number;
}

const PASSPHRASE_WORDS = [
  'falcon', 'galaxy', 'quantum', 'cipher', 'horizon', 'nebula', 'phoenix', 'orbital',
  'zenith', 'vector', 'matrix', 'crystal', 'summit', 'shadow', 'avalanche', 'beacon',
  'cascade', 'eclipse', 'glacier', 'infinity', 'monarch', 'odyssey', 'pulsar', 'radiant',
  'vanguard', 'vortex', 'whisper', 'aurora', 'catalyst', 'dynamo', 'element', 'gravity',
  'hyperion', 'ignite', 'jupiter', 'kinetic', 'luminous', 'mercury', 'neutron', 'omega'
];

export function PasswordGeneratorModal({
  isOpen,
  onClose,
  onApply,
  initialLength = 16,
}: PasswordGeneratorModalProps) {
  const { showToast } = useToast();

  const [mode, setMode] = useState<'characters' | 'passphrase'>('characters');
  const [length, setLength] = useState(initialLength);
  const [includeUpper, setIncludeUpper] = useState(true);
  const [includeLower, setIncludeLower] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [avoidAmbiguous, setAvoidAmbiguous] = useState(true);

  // تنظیمات عبارت عبور (Passphrase)
  const [wordCount, setWordCount] = useState(4);
  const [separator, setSeparator] = useState('-');
  const [includeNumberInPassphrase, setIncludeNumberInPassphrase] = useState(true);

  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copied, setCopied] = useState(false);

  // الگوریتم تولید کلمه عبور
  const generate = useCallback(() => {
    if (mode === 'passphrase') {
      const selectedWords: string[] = [];
      const usedIndices = new Set<number>();

      while (selectedWords.length < wordCount) {
        const idx = Math.floor(Math.random() * PASSPHRASE_WORDS.length);
        if (!usedIndices.has(idx)) {
          usedIndices.add(idx);
          let w = PASSPHRASE_WORDS[idx];
          // حرف اول بزرگ برای خوانایی بیشتر
          w = w.charAt(0).toUpperCase() + w.slice(1);
          selectedWords.push(w);
        }
      }

      let res = selectedWords.join(separator);
      if (includeNumberInPassphrase) {
        const randomNum = Math.floor(Math.random() * 90) + 10;
        res += `${separator}${randomNum}`;
      }
      setGeneratedPassword(res);
      return;
    }

    // حالت کاراکتری
    let upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let lower = 'abcdefghijklmnopqrstuvwxyz';
    let numbers = '0123456789';
    let symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (avoidAmbiguous) {
      upper = upper.replace(/[O]/g, '');
      lower = lower.replace(/[l]/g, '');
      numbers = numbers.replace(/[01]/g, '');
    }

    let charPool = '';
    const guaranteedChars: string[] = [];

    if (includeUpper) {
      charPool += upper;
      guaranteedChars.push(upper.charAt(Math.floor(Math.random() * upper.length)));
    }
    if (includeLower) {
      charPool += lower;
      guaranteedChars.push(lower.charAt(Math.floor(Math.random() * lower.length)));
    }
    if (includeNumbers) {
      charPool += numbers;
      guaranteedChars.push(numbers.charAt(Math.floor(Math.random() * numbers.length)));
    }
    if (includeSymbols) {
      charPool += symbols;
      guaranteedChars.push(symbols.charAt(Math.floor(Math.random() * symbols.length)));
    }

    if (!charPool) {
      charPool = lower;
    }

    const remainingLength = Math.max(0, length - guaranteedChars.length);
    const randomChars: string[] = [];

    for (let i = 0; i < remainingLength; i++) {
      randomChars.push(charPool.charAt(Math.floor(Math.random() * charPool.length)));
    }

    // ادغام و بُر زدن تصادفی کاراکترها
    const allChars = [...guaranteedChars, ...randomChars].sort(() => Math.random() - 0.5);
    setGeneratedPassword(allChars.join(''));
  }, [
    mode,
    length,
    includeUpper,
    includeLower,
    includeNumbers,
    includeSymbols,
    avoidAmbiguous,
    wordCount,
    separator,
    includeNumberInPassphrase,
  ]);

  useEffect(() => {
    if (isOpen) {
      generate();
      setCopied(false);
    }
  }, [isOpen, generate]);

  if (!isOpen) return null;

  // محاسبه تقریبی آنتروپی و سطح امنیت
  const calculateStrength = () => {
    if (!generatedPassword) return { score: 0, label: 'خالی', color: 'bg-slate-200' };

    let pool = 0;
    if (mode === 'passphrase') {
      pool = PASSPHRASE_WORDS.length;
      const entropy = wordCount * Math.log2(pool);
      if (entropy > 65) return { score: 100, label: 'فوق‌العاده امن', color: 'bg-emerald-500' };
      if (entropy > 45) return { score: 75, label: 'قوی', color: 'bg-blue-500' };
      return { score: 50, label: 'متوسط', color: 'bg-amber-500' };
    }

    if (/[a-z]/.test(generatedPassword)) pool += 26;
    if (/[A-Z]/.test(generatedPassword)) pool += 26;
    if (/[0-9]/.test(generatedPassword)) pool += 10;
    if (/[^a-zA-Z0-9]/.test(generatedPassword)) pool += 30;

    const entropy = generatedPassword.length * Math.log2(Math.max(2, pool));

    if (entropy >= 80) return { score: 100, label: 'فوق‌العاده امن (غیرقابل نفوذ)', color: 'bg-emerald-500' };
    if (entropy >= 60) return { score: 80, label: 'بسیار قوی', color: 'bg-blue-500' };
    if (entropy >= 45) return { score: 55, label: 'متوسط', color: 'bg-amber-500' };
    return { score: 30, label: 'ضعیف', color: 'bg-rose-500' };
  };

  const strength = calculateStrength();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    showToast('رمز عبور در کلیپ‌بورد کپی شد.', 'success');
    setTimeout(() => setCopied(false), 1800);
  };

  const handleApply = () => {
    if (onApply) {
      onApply(generatedPassword);
      showToast('رمز عبور در فیلد قرار داده شد.', 'success');
      onClose();
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
        className="w-full max-w-lg bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-2xl shadow-2xl p-6 text-right animate-in zoom-in-95 duration-200 cursor-default"
      >
        {/* هدر */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-border-subtle mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-500/30">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">تولیدکننده پیشرفته کلمه عبور</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">تولید امن‌ترین رمزها بر اساس استانداردهای رمزنگاری</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-surface-2 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* کادر نمایش رمز عبور تولید شده */}
        <div className="p-4 rounded-xl bg-slate-900 text-white font-mono text-sm space-y-3 shadow-inner" dir="ltr">
          <div className="flex items-center justify-between gap-3">
            <span className="break-all font-semibold select-all text-emerald-400 text-base">
              {generatedPassword}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={generate}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                title="تولید مجدد رمز"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1 text-xs px-2.5"
                title="کپی در کلیپ‌بورد"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'کپی شد' : 'کپی'}</span>
              </button>
            </div>
          </div>

          {/* نشانگر گرافیکی قدرت رمز */}
          <div className="space-y-1.5 pt-1" dir="rtl">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>میزان امنیت رمز:</span>
              </span>
              <span className="font-semibold text-emerald-400 font-sans">{strength.label}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${strength.color} transition-all duration-300`}
                style={{ width: `${strength.score}%` }}
              />
            </div>
          </div>
        </div>

        {/* انتخاب حالت: کاراکتری یا عبارت عبور */}
        <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-slate-100 dark:bg-surface-2 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('characters')}
            className={`py-1.5 rounded-lg transition ${
              mode === 'characters'
                ? 'bg-white dark:bg-surface-1 text-indigo-700 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            کاراکترهای تصادفی (Random)
          </button>
          <button
            type="button"
            onClick={() => setMode('passphrase')}
            className={`py-1.5 rounded-lg transition ${
              mode === 'passphrase'
                ? 'bg-white dark:bg-surface-1 text-indigo-700 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            عبارت چندکلمه‌ای (Passphrase)
          </button>
        </div>

        {/* تنظیمات حالت کاراکتری */}
        {mode === 'characters' ? (
          <div className="space-y-3.5 mt-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">طول رمز عبور:</label>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">{length} کاراکتر</span>
              </div>
              <input
                type="range"
                min="8"
                max="48"
                value={length}
                onChange={(e) => setLength(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeUpper}
                  onChange={(e) => setIncludeUpper(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span>حروف بزرگ (A-Z)</span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeLower}
                  onChange={(e) => setIncludeLower(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span>حروف کوچک (a-z)</span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeNumbers}
                  onChange={(e) => setIncludeNumbers(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span>اعداد (0-9)</span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSymbols}
                  onChange={(e) => setIncludeSymbols(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span>نمادهای خاص (!@#$)</span>
              </label>
            </div>

            <div className="pt-1 border-t border-slate-100 dark:border-border-subtle">
              <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 select-none cursor-pointer text-[11px]">
                <input
                  type="checkbox"
                  checked={avoidAmbiguous}
                  onChange={(e) => setAvoidAmbiguous(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span>حذف کاراکترهای گمراه‌کننده شبیه هم (مانند 0, O, 1, l)</span>
              </label>
            </div>
          </div>
        ) : (
          /* تنظیمات حالت عبارت عبور */
          <div className="space-y-3.5 mt-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">تعداد کلمات معنادار:</label>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">{wordCount} کلمه</span>
              </div>
              <input
                type="range"
                min="3"
                max="6"
                value={wordCount}
                onChange={(e) => setWordCount(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">جداکننده کلمات:</label>
                <select
                  value={separator}
                  onChange={(e) => setSeparator(e.target.value)}
                  className="w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200"
                >
                  <option value="-">خط فاصله (-)</option>
                  <option value="_">زیرخط (_)</option>
                  <option value=".">نقطه (.)</option>
                  <option value=" ">فاصله (Space)</option>
                </select>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeNumberInPassphrase}
                    onChange={(e) => setIncludeNumberInPassphrase(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>افزودن عدد در انتهای عبارت</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* دکمه‌های پایین مودال */}
        <div className="flex items-center justify-between pt-5 mt-5 border-t border-slate-200 dark:border-border-subtle">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-border-strong text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-elevated transition shadow-2xs"
          >
            بستن
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-2 dark:hover:bg-surface-elevated border border-slate-200 dark:border-border-strong text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>کپی کردن</span>
            </button>

            {onApply && (
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs shadow-indigo-600/30 flex items-center gap-1.5 transition"
              >
                <Check className="w-3.5 h-3.5" />
                <span>استفاده در فیلد</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
