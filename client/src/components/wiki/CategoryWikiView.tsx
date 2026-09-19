import React, { useState, useMemo, useRef } from 'react';
import {
  BookOpen,
  FileText,
  Edit3,
  Eye,
  Columns,
  Save,
  RotateCcw,
  Download,
  Copy,
  Check,
  List,
  Hash,
  Bold,
  Italic,
  Code,
  Table as TableIcon,
  Link as LinkIcon,
  AlertTriangle,
  Lightbulb,
  Info,
  Clock,
  Sparkles,
  ChevronLeft,
  Share2,
  FileCode,
  ListOrdered,
  CheckSquare
} from 'lucide-react';
import { AssetType } from '../../services/asset-types.service.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';

interface CategoryWikiViewProps {
  assetType: AssetType;
  onUpdateWiki: (updatedMarkdown: string) => Promise<void>;
}

// قالب‌های آماده سازمانی جهت تسریع مستندسازی
const WIKI_TEMPLATES: Record<string, { title: string; desc: string; content: string }> = {
  vps: {
    title: 'قالب جامع راهنمای سرور (Server Runbook)',
    desc: 'دستورالعمل‌های اتصال SSH، فایروال، پورت‌ها و چک‌لیست نگهداری',
    content: `# 🖥️ راهنمای جامع مدیریت و نگهداری سرورها

این سند شامل کلیه خط‌مشی‌های فنی، معماری شبکه و پروتکل‌های امنیتی سرورهای این دسته‌بندی است.

> ⚠️ **هشدار امنیتی مهم**: دسترسی مستقیم با کاربر \`root\` از طریق اینترنت مسدود است. همیشه از کلید SSH اختصاصی و شبکه امن سازمانی استفاده فرمایید.

---

## 📌 استانداردهای دسترسی و امنیتی
1. پورت پیش‌فرض SSH روی کلیه ماشین‌ها تغییر یافته است.
2. احراز هویت صرفاً مبتنی بر کلید عمومی (Public Key Authentication) می‌باشد.
3. تمامی تغییرات سیستمی و کانفیگ‌ها باید در دفتر ثبت شوند.

---

## 🚀 راهنمای اتصال سریع از طریق ترمینال (SSH)
برای اتصال به سرورهای عملیاتی، از دستور استاندارد زیر استفاده فرمایید:
\`\`\`bash
# نمونه دستور اتصال با پورت و کلید اختصاصی
ssh -i ~/.ssh/company_key -p 2222 admin@192.168.10.15
\`\`\`

---

## 📋 چک‌لیست تحویل و راه‌اندازی سرور جدید
- [x] به‌روزرسانی کلیه بسته‌های سیستم‌عامل (\`apt update && apt upgrade -y\`)
- [x] فعال‌سازی فایروال UFW با محدودسازی دسترسی پورت‌های حساس
- [x] نصب و فعال‌سازی سرویس Fail2Ban جهت مقابله با Brute-force
- [ ] اتصال لاگ‌ها به سامانه مانیتورینگ مرکزی
- [ ] زمان‌بندی بکاپ خودکار هفتگی

---

## 📞 اطلاعات تماس در شرایط بحران (NOC Contacts)
| مسئول فنی | واحد | شماره داخلی / تماس | وضعیت کشیک |
| :--- | :--- | :--- | :--- |
| تیم زیرساخت و دوآپس | دیتاسنتر تهران | داخلی ۱۰۴ | ۲۴/۷ |
| پشتیبانی هاستینگ و شبکه | مرکز عملیات NOC | ۰۲۱-۸۸۸۸۸۸۸ | آنکال شبانه‌روزی |
`,
  },
  email: {
    title: 'قالب تنظیمات کلاینت‌های ایمیل (Email Configuration)',
    desc: 'تنظیمات IMAP/SMTP برای Outlook، Thunderbird و تلفن همراه',
    content: `# 📧 راهنمای جامع پیکربندی ایمیل‌های سازمانی

کلیه همکاران گرامی جهت فعال‌سازی و راه‌اندازی ایمیل رسمی خود روی نرم‌افزارهای دسکتاپ و موبایل باید از مشخصات فنی زیر استفاده نمایند.

> 💡 **نکته**: برای دریافت رمز عبور اختصاصی ایمیل خود، به تب «دارایی‌ها» مراجعه نموده و روی دکمه نمایش رمز کلیک فرمایید.

---

## ⚙️ مشخصات سرورهای دریافت و ارسال (Incoming / Outgoing)

### ۱. پروتکل دریافت پیام‌ها (IMAP - پیشنهادی)
- **آدرس سرور (Host):** \`mail.company.ir\`
- **پورت امن:** \`993\`
- **نوع رمزنگاری (Encryption):** SSL / TLS
- **نام کاربری:** آدرس کامل ایمیل (مثلاً: \`username@company.ir\`)

### ۲. پروتکل ارسال پیام‌ها (SMTP)
- **آدرس سرور (Host):** \`smtp.company.ir\`
- **پورت امن:** \`587\` (یا \`465\`)
- **نوع رمزنگاری:** STARTTLS یا SSL
- **احراز هویت:** فعال (همانند مشخصات IMAP)

---

## 📱 راهنمای راه‌اندازی در تلفن همراه
1. وارد بخش Accounts در تنظیمات گوشی شوید.
2. گزینه **Manual Setup** و سپس **IMAP** را انتخاب کنید.
3. هاست‌های ورودی و خروجی بالا را درج نمایید.
4. تیک گزینه **Require sign-in for outgoing server** را فعال کنید.

---

## ⚠️ خط‌مشی‌های استفاده و سهمیه صندوق پستی
- حداکثر حجم هر فایل پیوست: **۲۵ مگابایت**
- نگهداری ایمیل‌های سطل بازیافت (Trash): **۳۰ روز**
- برای ارتقای سهمیه حجم به ادمین سیستم تیکت ارسال کنید.
`,
  },
  security: {
    title: 'قالب خط‌مشی امنیت و مدیریت گذرواژه‌ها',
    desc: 'اصول محافظت از اعتبارسنجی‌ها، دوره‌های انقضا و گردش کلیدها',
    content: `# 🔐 خط‌مشی امنیتی و حفاظت از دارایی‌ها و اطلاعات محرمانه

این راهنما چارچوب الزامات امنیتی، اصول مدیریت گذرواژه‌ها و رفتار با اطلاعات محرمانه ثبت‌شده در سامانه «دفتر» را تبیین می‌کند.

> 📌 **توجه سازمانی**: اشتراک‌گذاری رمزهای عبور در پیام‌رسان‌های غیرسازمانی یا به صورت متن خام اکیداً ممنوع است.

---

## 🛡️ استانداردهای الزامی گذرواژه‌ها
1. حداقل طول رمزهای عبور: **۱۶ کاراکتر** شامل حروف بزرگ، کوچک، ارقام و نمادها.
2. فعال‌سازی اجباری احراز هویت دومرحله‌ای (2FA/MFA) در کلیه پنل‌های مدیریتی.
3. چرخش دوره‌ای (Key Rotation) کلیدهای API هر ۶ ماه یک‌بار.

---

## 🕒 فرآیند ابطال دسترسی هنگام خروج نیرو (Offboarding)
- [ ] غیرفعال‌سازی حساب کاربری در Active Directory / LDAP
- [ ] تغییر رمز کلیه سرورها و پایگاه‌های داده‌ای که فرد به آن‌ها دسترسی داشته است
- [ ] ابطال کلیدهای SSH و گواهینامه‌های VPN
- [ ] خروج از تمامی سشن‌های فعال
`,
  },
};

export function CategoryWikiView({ assetType, onUpdateWiki }: CategoryWikiViewProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const canEdit = user?.role === 'ADMIN' || user?.role === 'EDITOR';

  // متن فعلی مستندات با فال‌بک به قالب متناسب اگر خالی بود
  const initialContent = useMemo(() => {
    if (assetType.typeDocsMarkdown && assetType.typeDocsMarkdown.trim().length > 0) {
      return assetType.typeDocsMarkdown;
    }
    if (assetType.slug === 'vps' || assetType.slug.includes('server')) {
      return WIKI_TEMPLATES.vps.content;
    }
    if (assetType.slug === 'email' || assetType.slug.includes('mail')) {
      return WIKI_TEMPLATES.email.content;
    }
    return `# 📖 مستندات جامع دسته‌بندی «${assetType.name}»\n\nهنوز مستنداتی برای این دسته‌بندی ثبت نشده است.\n\nبرای آغاز مستندسازی، روی دکمه «ویرایش مستندات» کلیک کرده یا از قالب‌های آماده استفاده فرمایید.\n`;
  }, [assetType]);

  const [isEditing, setIsEditing] = useState(false);
  const [editorTab, setEditorTab] = useState<'split' | 'edit' | 'preview'>('split');
  const [markdownContent, setMarkdownContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedDoc, setCopiedDoc] = useState(false);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // استخراج خودکار سرفصل‌ها (Table of Contents - TOC)
  const headings = useMemo(() => {
    const lines = markdownContent.split('\n');
    const items: Array<{ id: string; text: string; level: number }> = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        const text = trimmed.replace(/^#\s+/, '').trim();
        items.push({ id: `heading-${idx}`, text, level: 1 });
      } else if (trimmed.startsWith('## ')) {
        const text = trimmed.replace(/^##\s+/, '').trim();
        items.push({ id: `heading-${idx}`, text, level: 2 });
      } else if (trimmed.startsWith('### ')) {
        const text = trimmed.replace(/^###\s+/, '').trim();
        items.push({ id: `heading-${idx}`, text, level: 3 });
      }
    });

    return items;
  }, [markdownContent]);

  // تخمین زمان مطالعه و آمار
  const stats = useMemo(() => {
    const words = markdownContent.trim().split(/\s+/).filter(Boolean).length;
    const readingTimeMinutes = Math.max(1, Math.ceil(words / 180));
    return { words, readingTimeMinutes };
  }, [markdownContent]);

  // درج متن در موقعیت مکان‌نما در ویرایشگر
  const insertTextAtCursor = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const previousValue = textarea.value;
    const selection = previousValue.substring(start, end);

    const replacement = `${before}${selection || 'متن نمونه'}${after}`;
    const newValue = previousValue.substring(0, start) + replacement + previousValue.substring(end);

    setMarkdownContent(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + (selection ? selection.length : 'متن نمونه'.length));
    }, 0);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateWiki(markdownContent);
      setIsEditing(false);
      showToast('مستندات با موفقیت ذخیره شد.', 'success');
    } catch (err: any) {
      showToast(err.message || 'خطا در ذخیره‌سازی مستندات', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopiedDoc(true);
    showToast('متن کامل مستندات در حافظه کپی شد.', 'info');
    setTimeout(() => setCopiedDoc(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wiki_${assetType.slug}_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('فایل مارکداون دانلود شد.', 'success');
  };

  const handleApplyTemplate = (key: string) => {
    const tmpl = WIKI_TEMPLATES[key];
    if (tmpl) {
      if (confirm(`آیا می‌خواهید «${tmpl.title}» جایگزین متن فعلی شود؟`)) {
        setMarkdownContent(tmpl.content);
        showToast('قالب آماده با موفقیت بارگذاری شد.', 'success');
      }
    }
  };

  // رندرر پیشرفته و سبک Markdown با المان‌های سفارشی سازمانی
  const renderMarkdown = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockLang = '';
    let codeBlockContent: string[] = [];
    let inTable = false;
    let tableRows: string[][] = [];
    let codeBlockIndex = 0;

    const flushCodeBlock = (key: string) => {
      const codeText = codeBlockContent.join('\n');
      const idx = codeBlockIndex++;
      elements.push(
        <div key={key} className="my-4 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 text-slate-100 shadow-sm" dir="ltr">
          <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-800/90 border-b border-slate-700 text-[11px] font-mono text-slate-300">
            <span>{codeBlockLang || 'bash'}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(codeText);
                setCopiedCodeIndex(idx);
                setTimeout(() => setCopiedCodeIndex(null), 1500);
              }}
              className="flex items-center gap-1 text-slate-400 hover:text-white transition"
              title="کپی دستور"
            >
              {copiedCodeIndex === idx ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 text-[10px]">کپی شد</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span className="text-[10px]">کپی</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-4 text-xs font-mono overflow-x-auto leading-relaxed text-slate-200">
            <code>{codeText}</code>
          </pre>
        </div>
      );
      codeBlockContent = [];
      inCodeBlock = false;
      codeBlockLang = '';
    };

    const flushTable = (key: string) => {
      if (tableRows.length === 0) return;
      const headerRow = tableRows[0];
      const bodyRows = tableRows.slice(1);

      elements.push(
        <div key={key} className="my-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-border-strong shadow-2xs">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-surface-2 border-b border-slate-200 dark:border-border-strong font-bold text-slate-800 dark:text-slate-200">
                {headerRow.map((col, cIdx) => (
                  <th key={cIdx} className="p-3">
                    {col.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-border-subtle">
              {bodyRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-surface-2/60 transition">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-3 text-slate-700 dark:text-slate-300">
                      {cell.trim()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // بلوک کد چندخطی
      if (trimmed.startsWith('```')) {
        if (inCodeBlock) {
          flushCodeBlock(`code-${i}`);
        } else {
          inCodeBlock = true;
          codeBlockLang = trimmed.replace(/^```/, '').trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      // جدول Markdown
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        // نادیده گرفتن ردیف جداکننده | --- | --- |
        if (trimmed.replace(/[|\s-:]/g, '') === '') {
          continue;
        }
        const cells = trimmed
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        tableRows.push(cells);
        inTable = true;
        continue;
      } else if (inTable) {
        flushTable(`table-${i}`);
      }

      // خط جداکننده (Horizontal Rule)
      if (trimmed === '---' || trimmed === '***') {
        elements.push(<hr key={i} className="my-6 border-slate-200 dark:border-border-subtle" />);
        continue;
      }

      // کال‌اوت‌ها و هشدارهای کادربندی‌شده
      if (trimmed.startsWith('> ⚠️') || trimmed.startsWith('> [!WARNING]')) {
        const text = trimmed.replace(/^(>\s*⚠️|>\s*\[!WARNING\])/, '').trim();
        elements.push(
          <div key={i} className="my-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 flex items-start gap-3 text-rose-800 dark:text-rose-200 text-xs font-medium">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{text}</div>
          </div>
        );
        continue;
      }

      if (trimmed.startsWith('> 💡') || trimmed.startsWith('> [!TIP]')) {
        const text = trimmed.replace(/^(>\s*💡|>\s*\[!TIP\])/, '').trim();
        elements.push(
          <div key={i} className="my-3 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-start gap-3 text-emerald-800 dark:text-emerald-200 text-xs font-medium">
            <Lightbulb className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{text}</div>
          </div>
        );
        continue;
      }

      if (trimmed.startsWith('> 📌') || trimmed.startsWith('> ℹ️') || trimmed.startsWith('> [!NOTE]')) {
        const text = trimmed.replace(/^(>\s*[📌ℹ️]|>\s*\[!NOTE\])/, '').trim();
        elements.push(
          <div key={i} className="my-3 p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 flex items-start gap-3 text-indigo-800 dark:text-indigo-200 text-xs font-medium">
            <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{text}</div>
          </div>
        );
        continue;
      }

      // نقل‌قول ساده
      if (trimmed.startsWith('> ')) {
        const text = trimmed.substring(2);
        elements.push(
          <blockquote key={i} className="my-3 pr-4 border-r-4 border-indigo-500 text-slate-600 dark:text-slate-400 italic text-xs leading-relaxed">
            {text}
          </blockquote>
        );
        continue;
      }

      // عناوین
      if (trimmed.startsWith('# ')) {
        const text = trimmed.replace(/^#\s+/, '');
        elements.push(
          <h1 key={i} id={`heading-${i}`} className="text-xl font-black text-slate-900 dark:text-white mt-6 mb-3 pb-2 border-b border-slate-200 dark:border-border-subtle flex items-center gap-2">
            <span>{text}</span>
          </h1>
        );
        continue;
      }

      if (trimmed.startsWith('## ')) {
        const text = trimmed.replace(/^##\s+/, '');
        elements.push(
          <h2 key={i} id={`heading-${i}`} className="text-base font-bold text-slate-900 dark:text-white mt-5 mb-2.5 flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-indigo-600 dark:bg-indigo-400 inline-block" />
            <span>{text}</span>
          </h2>
        );
        continue;
      }

      if (trimmed.startsWith('### ')) {
        const text = trimmed.replace(/^###\s+/, '');
        elements.push(
          <h3 key={i} id={`heading-${i}`} className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-4 mb-2">
            {text}
          </h3>
        );
        continue;
      }

      // چک‌لیست‌ها (Task lists)
      if (trimmed.startsWith('- [x] ') || trimmed.startsWith('- [X] ')) {
        const text = trimmed.substring(6);
        elements.push(
          <div key={i} className="flex items-center gap-2 py-1 text-xs text-slate-700 dark:text-slate-300">
            <div className="w-4 h-4 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <Check className="w-3 h-3" />
            </div>
            <span className="line-through opacity-75">{text}</span>
          </div>
        );
        continue;
      }

      if (trimmed.startsWith('- [ ] ')) {
        const text = trimmed.substring(6);
        elements.push(
          <div key={i} className="flex items-center gap-2 py-1 text-xs text-slate-700 dark:text-slate-300">
            <div className="w-4 h-4 rounded border border-slate-300 dark:border-border-strong bg-white dark:bg-surface-2" />
            <span>{text}</span>
          </div>
        );
        continue;
      }

      // لیست‌های گلوله‌ای
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const text = trimmed.substring(2);
        elements.push(
          <li key={i} className="mr-5 list-disc text-xs text-slate-700 dark:text-slate-300 leading-relaxed my-0.5">
            {parseInlineStyles(text)}
          </li>
        );
        continue;
      }

      // لیست‌های شماره‌دار
      if (/^\d+\.\s/.test(trimmed)) {
        elements.push(
          <li key={i} className="mr-5 list-decimal text-xs text-slate-700 dark:text-slate-300 leading-relaxed my-0.5">
            {parseInlineStyles(trimmed.replace(/^\d+\.\s/, ''))}
          </li>
        );
        continue;
      }

      // پاراگراف یا خط خالی
      if (!trimmed) {
        elements.push(<div key={i} className="h-2" />);
      } else {
        elements.push(
          <p key={i} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed my-1.5">
            {parseInlineStyles(trimmed)}
          </p>
        );
      }
    }

    if (inCodeBlock) flushCodeBlock('trailing-code');
    if (inTable) flushTable('trailing-table');

    return elements;
  };

  // پردازش استایل‌های اینلاین (Bold, Italic, Inline Code, Link)
  const parseInlineStyles = (text: string): React.ReactNode => {
    // تقسیم بر اساس کد اینلاین `...`
    const parts = text.split(/(`[^`]+`)/g);

    return parts.map((part, pIdx) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={pIdx}
            className="px-1.5 py-0.5 rounded bg-slate-100 text-indigo-700 dark:bg-surface-2 dark:text-indigo-300 border border-slate-200 dark:border-border-strong font-mono text-[11px] mx-0.5"
            dir="ltr"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      // پردازش متن بولد **...**
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      return boldParts.map((bPart, bIdx) => {
        if (bPart.startsWith('**') && bPart.endsWith('**')) {
          return (
            <strong key={`${pIdx}-${bIdx}`} className="font-bold text-slate-900 dark:text-white">
              {bPart.slice(2, -2)}
            </strong>
          );
        }
        return bPart;
      });
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-canvas dark:bg-canvas">
      {/* نوار بالایی هدر مستندات */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-border-subtle bg-white dark:bg-surface-1 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-500/30 flex items-center justify-center shadow-2xs">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                ویکی و مستندات جامع: {assetType.name}
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/70 dark:bg-emerald-500/20 dark:text-emerald-300 font-medium">
                مستندات استاندارد
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 opacity-70" />
                <span>زمان تخمینی مطالعه: {stats.readingTimeMinutes} دقیقه</span>
              </span>
              <span>•</span>
              <span>{stats.words} کلمه</span>
              <span>•</span>
              <span>{headings.length} سرفصل</span>
            </div>
          </div>
        </div>

        {/* دکمه‌های اقدام بالای ویکی */}
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <button
                type="button"
                onClick={handleCopyAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-border-strong bg-white dark:bg-surface-2 hover:bg-slate-50 dark:hover:bg-surface-elevated text-xs font-semibold text-slate-700 dark:text-slate-200 transition shadow-2xs"
                title="کپی متن کامل مستندات"
              >
                {copiedDoc ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>کپی متن</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadMarkdown}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-border-strong bg-white dark:bg-surface-2 hover:bg-slate-50 dark:hover:bg-surface-elevated text-xs font-semibold text-slate-700 dark:text-slate-200 transition shadow-2xs"
                title="دانلود فایل .md"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>دانلود .md</span>
              </button>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs shadow-indigo-600/20 transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>ویرایش مستندات</span>
                </button>
              )}
            </>
          ) : (
            <>
              {/* سلکتور حالت‌های نمایش در ویرایشگر */}
              <div className="bg-slate-100 dark:bg-surface-2 border border-slate-200 dark:border-border-strong rounded-lg p-0.5 flex text-xs">
                <button
                  type="button"
                  onClick={() => setEditorTab('edit')}
                  className={`px-2.5 py-1 rounded-md transition font-medium ${
                    editorTab === 'edit'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-indigo-600 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  ویرایشگر
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab('split')}
                  className={`px-2.5 py-1 rounded-md transition font-medium ${
                    editorTab === 'split'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-indigo-600 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  دوطرفه (Split)
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab('preview')}
                  className={`px-2.5 py-1 rounded-md transition font-medium ${
                    editorTab === 'preview'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-indigo-600 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  پیش‌نمایش
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMarkdownContent(initialContent);
                  setIsEditing(false);
                }}
                disabled={isSaving}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-border-strong text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-2 transition shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>انصراف</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-xs font-semibold text-white shadow-xs shadow-emerald-600/30 transition"
              >
                {isSaving ? (
                  <span>در حال ذخیره...</span>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>ذخیره تغییرات</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* بخش ویرایشگر: نوار ابزار فرمت‌دهی در حالت ادیت */}
      {isEditing && (
        <div className="px-6 py-2 border-b border-slate-200 dark:border-border-subtle bg-slate-50/80 dark:bg-surface-2/40 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => insertTextAtCursor('**', '**')}
              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-surface-elevated text-slate-700 dark:text-slate-300"
              title="متن برجسته (Bold)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertTextAtCursor('*', '*')}
              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-surface-elevated text-slate-700 dark:text-slate-300"
              title="متن مورب (Italic)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <span className="w-px h-4 bg-slate-300 dark:bg-border-strong mx-1" />

            <button
              type="button"
              onClick={() => insertTextAtCursor('# ', '')}
              className="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-surface-elevated text-slate-700 dark:text-slate-300 font-bold"
              title="تیتر اصلی H1"
            >
              H1
            </button>
            <button
              type="button"
              onClick={() => insertTextAtCursor('## ', '')}
              className="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-surface-elevated text-slate-700 dark:text-slate-300 font-bold"
              title="تیتر فرعی H2"
            >
              H2
            </button>
            <button
              type="button"
              onClick={() => insertTextAtCursor('### ', '')}
              className="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-surface-elevated text-slate-700 dark:text-slate-300 font-bold"
              title="تیتر سوم H3"
            >
              H3
            </button>
            <span className="w-px h-4 bg-slate-300 dark:bg-border-strong mx-1" />

            <button
              type="button"
              onClick={() => insertTextAtCursor('`', '`')}
              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-surface-elevated text-slate-700 dark:text-slate-300"
              title="کد درون‌خطی"
            >
              <Code className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertTextAtCursor('```bash\n', '\n```')}
              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-surface-elevated text-slate-700 dark:text-slate-300"
              title="بلوک کد چندخطی"
            >
              <FileCode className="w-3.5 h-3.5" />
            </button>
            <span className="w-px h-4 bg-slate-300 dark:bg-border-strong mx-1" />

            <button
              type="button"
              onClick={() => insertTextAtCursor('- ', '')}
              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-surface-elevated text-slate-700 dark:text-slate-300"
              title="لیست گلوله‌ای"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertTextAtCursor('1. ', '')}
              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-surface-elevated text-slate-700 dark:text-slate-300"
              title="لیست شماره‌دار"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertTextAtCursor('- [ ] ', '')}
              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-surface-elevated text-slate-700 dark:text-slate-300"
              title="چک‌لیست کارها"
            >
              <CheckSquare className="w-3.5 h-3.5" />
            </button>
            <span className="w-px h-4 bg-slate-300 dark:bg-border-strong mx-1" />

            <button
              type="button"
              onClick={() => insertTextAtCursor('> ⚠️ **هشدار**: ', '')}
              className="px-2 py-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-medium"
              title="کال‌اوت هشدار"
            >
              هشدار
            </button>
            <button
              type="button"
              onClick={() => insertTextAtCursor('> 💡 **نکته**: ', '')}
              className="px-2 py-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium"
              title="کال‌اوت نکته"
            >
              نکته
            </button>
            <button
              type="button"
              onClick={() => insertTextAtCursor('\n| ستون ۱ | ستون ۲ |\n| :--- | :--- |\n| مقدار ۱ | مقدار ۲ |\n', '')}
              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-surface-elevated text-slate-700 dark:text-slate-300"
              title="درج جدول"
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* منوی قالب‌های آماده */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">قالب‌های آماده:</span>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleApplyTemplate(e.target.value);
                  e.target.value = '';
                }
              }}
              className="bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-indigo-600"
              defaultValue=""
            >
              <option value="" disabled>انتخاب قالب استاندارد...</option>
              <option value="vps">🖥️ راهنمای جامع سرور (Runbook)</option>
              <option value="email">📧 تنظیمات کلاینت‌های ایمیل</option>
              <option value="security">🔐 خط‌مشی امنیت و پسوردها</option>
            </select>
          </div>
        </div>
      )}

      {/* بدنه محتوا: تقسیم بین فهرست مطالب و متن */}
      <div className="flex-1 flex overflow-hidden">
        {/* حالت مطالعه: سایدبار فهرست سرفصل‌ها (Table of Contents) */}
        {!isEditing && headings.length > 0 && (
          <aside className="w-64 border-l border-slate-200 dark:border-border-subtle bg-slate-50/60 dark:bg-surface-1/50 p-4 overflow-y-auto hidden lg:block shrink-0">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>فهرست سرفصل‌های سند</span>
            </div>
            <nav className="space-y-1 text-xs">
              {headings.map((h, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    const el = document.getElementById(h.id);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className={`w-full text-right py-1 px-2 rounded-md hover:bg-slate-200/70 dark:hover:bg-surface-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition text-[11px] truncate block ${
                    h.level === 1 ? 'font-bold' : h.level === 2 ? 'pr-4' : 'pr-6 opacity-80'
                  }`}
                >
                  {h.text}
                </button>
              ))}
            </nav>
          </aside>
        )}

        {/* بخش نمایشگر یا ویرایشگر */}
        <div className="flex-1 flex overflow-hidden">
          {isEditing ? (
            <div className="flex-1 flex h-full overflow-hidden">
              {/* باکس ویرایشگر متن Markdown */}
              {(editorTab === 'split' || editorTab === 'edit') && (
                <div className={`h-full flex flex-col p-4 ${editorTab === 'split' ? 'w-1/2 border-l border-slate-200 dark:border-border-subtle' : 'w-full'}`}>
                  <div className="text-[11px] font-semibold text-slate-500 mb-2 flex items-center justify-between">
                    <span>ویرایشگر Markdown (راست‌چین با پشتیبانی از کدهای چپ‌چین)</span>
                    <span className="font-mono">{markdownContent.length} کاراکتر</span>
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={markdownContent}
                    onChange={(e) => setMarkdownContent(e.target.value)}
                    rows={20}
                    placeholder="مستندات را با استفاده از استاندارد Markdown بنویسید..."
                    className="flex-1 w-full bg-white dark:bg-surface-2 border border-slate-300 dark:border-border-strong rounded-xl p-4 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 transition leading-relaxed resize-none"
                    dir="auto"
                  />
                </div>
              )}

              {/* باکس پیش‌نمایش زنده در حالت ویرایش */}
              {(editorTab === 'split' || editorTab === 'preview') && (
                <div className={`h-full overflow-y-auto p-6 bg-white dark:bg-surface-1 ${editorTab === 'split' ? 'w-1/2' : 'w-full'}`}>
                  <div className="text-[11px] font-semibold text-slate-500 mb-3">
                    پیش‌نمایش زنده خروجی
                  </div>
                  <article className="max-w-3xl mx-auto">
                    {renderMarkdown(markdownContent)}
                  </article>
                </div>
              )}
            </div>
          ) : (
            /* حالت مطالعه تمام‌صفحه */
            <div className="flex-1 overflow-y-auto p-8 bg-white dark:bg-surface-1">
              <article className="max-w-4xl mx-auto">
                {renderMarkdown(markdownContent)}
              </article>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
