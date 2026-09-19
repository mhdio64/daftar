import React, { useState } from 'react';
import { Terminal, ExternalLink, Download, Copy, Check, Monitor, Database, Globe } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';

interface QuickConnectBoxProps {
  values: Record<string, any>;
  title: string;
  assetTypeName?: string;
}

export function QuickConnectBox({ values, title }: QuickConnectBoxProps) {
  const { settings } = useSettings();
  const { showToast } = useToast();
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // اگر قابلیت اتصال سریع در تنظیمات خاموش باشد، رندر نمی‌شود
  if (!settings.enableQuickConnect) {
    return null;
  }

  // ۱. شناسایی هوشمند IP یا Hostname
  let rawIp = '';
  let extractedPort = '';

  for (const [k, v] of Object.entries(values || {})) {
    const keyLower = k.toLowerCase();
    const strVal = String(v || '').trim();
    if (!strVal) continue;

    if (keyLower.includes('ip') || keyLower.includes('host') || keyLower.includes('server') || keyLower.includes('address')) {
      if (strVal.includes(':')) {
        const parts = strVal.split(':');
        rawIp = parts[0];
        extractedPort = parts[1];
      } else {
        rawIp = strVal;
      }
      break;
    }
  }

  // اگر فیلد پورت اختصاصی وجود داشت
  for (const [k, v] of Object.entries(values || {})) {
    const keyLower = k.toLowerCase();
    const strVal = String(v || '').trim();
    if ((keyLower.includes('port') || keyLower.includes('ssh_port')) && strVal) {
      extractedPort = strVal;
      break;
    }
  }

  // اگر هیچ آدرس آی‌پی یا هاست مشخصی یافت نشد، نیازی به نمایش باکس اتصال نیست
  if (!rawIp || rawIp.includes('@')) {
    return null;
  }

  // شناسایی نام کاربری
  let user = 'root';
  for (const [k, v] of Object.entries(values || {})) {
    const keyLower = k.toLowerCase();
    const strVal = String(v || '').trim();
    if ((keyLower.includes('user') || keyLower.includes('root_user') || keyLower.includes('admin')) && strVal) {
      user = strVal;
      break;
    }
  }

  // شناسایی سیستم عامل
  let osType = '';
  for (const [k, v] of Object.entries(values || {})) {
    const keyLower = k.toLowerCase();
    const strVal = String(v || '').trim();
    if (keyLower.includes('os') || keyLower.includes('system')) {
      osType = strVal.toLowerCase();
      break;
    }
  }

  const portNum = extractedPort ? parseInt(extractedPort, 10) : parseInt(settings.defaultSshPort || '22', 10);
  const isWindows = osType.includes('win') || portNum === 3389;
  const isWebPort = [80, 443, 8080, 8443, 9000, 3000, 8000, 5000].includes(portNum);
  const isDatabase = [5432, 3306, 6379, 27017].includes(portNum);

  // دستور SSH
  const sshPortPart = portNum !== 22 ? `-p ${portNum} ` : '';
  const sshCommand = `ssh ${sshPortPart}${user}@${rawIp}`;

  // دستور RDP
  const rdpCommand = `mstsc /v:${rawIp}:${portNum || 3389}`;

  // دستور دیتابیس
  let dbCommand = '';
  if (portNum === 5432) {
    dbCommand = `psql -h ${rawIp} -p 5432 -U ${user} -d postgres`;
  } else if (portNum === 3306) {
    dbCommand = `mysql -h ${rawIp} -P 3306 -u ${user} -p`;
  } else if (portNum === 6379) {
    dbCommand = `redis-cli -h ${rawIp} -p 6379`;
  }

  const handleCopy = async (text: string, type: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedType(type);
    showToast(`دستور اتصال ${label} کپی شد.`, 'success');
    setTimeout(() => setCopiedType(null), 1800);
  };

  const handleDownloadRdp = () => {
    const content = `full address:s:${rawIp}:${portNum || 3389}\nusername:s:${user}\nprompt for credentials:i:1\n`;
    const blob = new Blob([content], { type: 'application/x-rdp' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_connect.rdp`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('فایل اتصال RDP دانلود شد.', 'success');
  };

  return (
    <div className="p-3.5 rounded-xl border border-indigo-200/90 dark:border-indigo-500/30 bg-gradient-to-br from-indigo-50/70 to-slate-50 dark:from-indigo-950/20 dark:to-surface-1 shadow-2xs space-y-2.5 text-right animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400 font-bold text-xs">
          <Terminal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>دستور اتصال سریع (Quick Connect)</span>
        </div>
        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded bg-white dark:bg-surface-2 border border-slate-200 dark:border-border-strong">
          {rawIp}:{portNum}
        </span>
      </div>

      {/* ۱. اگر سرور لینوکس یا SSH باشد */}
      {!isWindows && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
            <span className="font-semibold">اتصال امن ترمینال (SSH):</span>
            <a
              href={`ssh://${user}@${rawIp}:${portNum}`}
              className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              title="اجرای مستقیم در نرم‌افزار ترمینال لوکال (Putty/Termius)"
            >
              <span>باز کردن ترمینال</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div
            onClick={() => handleCopy(sshCommand, 'ssh', 'SSH')}
            className="group flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs cursor-pointer hover:bg-slate-800 transition"
            dir="ltr"
            title="کلیک برای کپی دستور اتصال SSH"
          >
            <span className="truncate select-all">{sshCommand}</span>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              {copiedType === 'ssh' ? (
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>کپی شد!</span>
                </span>
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ۲. اگر سرور ویندوز یا پورت RDP باشد */}
      {isWindows && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
            <span className="font-semibold">اتصال ریموت دسکتاپ (RDP):</span>
            <button
              type="button"
              onClick={handleDownloadRdp}
              className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              <span>دانلود فایل .rdp</span>
            </button>
          </div>

          <div
            onClick={() => handleCopy(rdpCommand, 'rdp', 'RDP')}
            className="group flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs cursor-pointer hover:bg-slate-800 transition"
            dir="ltr"
            title="کلیک برای کپی دستور mstsc"
          >
            <span className="truncate select-all">{rdpCommand}</span>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              {copiedType === 'rdp' ? (
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>کپی شد!</span>
                </span>
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ۳. اگر پورت وب باشد */}
      {isWebPort && (
        <div className="pt-1 flex items-center justify-between border-t border-indigo-100 dark:border-border-subtle">
          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
            <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>کنسول و پنل وب:</span>
          </div>
          <a
            href={`${portNum === 443 || portNum === 8443 ? 'https' : 'http'}://${rawIp}:${portNum}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-surface-2 hover:bg-indigo-50 dark:hover:bg-surface-elevated text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-border-strong text-xs font-semibold transition shadow-2xs"
          >
            <span>ورود به پنل وب</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* ۴. اگر پورت دیتابیس باشد */}
      {isDatabase && dbCommand && (
        <div className="space-y-1 pt-1 border-t border-indigo-100 dark:border-border-subtle">
          <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300 font-semibold">
            <Database className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>دستور اتصال به پایگاه داده:</span>
          </div>
          <div
            onClick={() => handleCopy(dbCommand, 'db', 'دیتابیس')}
            className="group flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs cursor-pointer hover:bg-slate-800 transition"
            dir="ltr"
          >
            <span className="truncate select-all">{dbCommand}</span>
            <div className="shrink-0 ml-2">
              {copiedType === 'db' ? (
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                </span>
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
