import React from 'react';
import {
  Server,
  HardDrive,
  Cpu,
  Box,
  Layers,
  Cloud,
  Terminal,
  Globe,
  Network,
  Wifi,
  Radio,
  Share2,
  Cable,
  ShieldCheck,
  Database,
  Binary,
  Archive,
  FileCode,
  FileText,
  FolderTree,
  Shield,
  Lock,
  Key,
  KeyRound,
  Fingerprint,
  UserCheck,
  Monitor,
  Laptop,
  Smartphone,
  Printer,
  Camera,
  Router,
  Power,
  Mail,
  MessageSquare,
  Bot,
  Zap,
  Activity,
  Sliders,
  Tag,
  HelpCircle,
} from 'lucide-react';

export interface AssetIconItem {
  id: string;
  name: string;
  category: 'servers' | 'network' | 'data' | 'security' | 'hardware' | 'services';
  categoryLabel: string;
  keywords: string[];
  component: React.ComponentType<{ className?: string }>;
}

export const ASSET_ICONS: AssetIconItem[] = [
  // ۱. سرور و زیرساخت
  { id: 'Server', name: 'سرور فیزیکی / میزبان', category: 'servers', categoryLabel: 'سرور و زیرساخت', keywords: ['سرور', 'هاست', 'server', 'host', 'vps'], component: Server },
  { id: 'Cloud', name: 'رایانش ابری / Cloud', category: 'servers', categoryLabel: 'سرور و زیرساخت', keywords: ['ابر', 'کلود', 'cloud', 'aws', 'hetzner'], component: Cloud },
  { id: 'Box', name: 'کانتینر / داکر', category: 'servers', categoryLabel: 'سرور و زیرساخت', keywords: ['داکر', 'کانتینر', 'docker', 'container', 'box'], component: Box },
  { id: 'Layers', name: 'کلاستر / مجازی‌ساز', category: 'servers', categoryLabel: 'سرور و زیرساخت', keywords: ['کلاستر', 'لایه', 'cluster', 'vmware', 'proxmox'], component: Layers },
  { id: 'Terminal', name: 'کنسول لینوکس / SSH', category: 'servers', categoryLabel: 'سرور و زیرساخت', keywords: ['ترمینال', 'کنسول', 'terminal', 'ssh', 'bash', 'linux'], component: Terminal },
  { id: 'Cpu', name: 'پردازنده / هسته سخت‌افزار', category: 'servers', categoryLabel: 'سرور و زیرساخت', keywords: ['سی پی یو', 'پردازنده', 'cpu', 'processor'], component: Cpu },
  { id: 'HardDrive', name: 'هارد دیسک / استوریج', category: 'servers', categoryLabel: 'سرور و زیرساخت', keywords: ['هارد', 'استوریج', 'حافظه', 'hard', 'storage', 'ssd'], component: HardDrive },

  // ۲. شبکه و وب
  { id: 'Globe', name: 'دامنه اینترنتی / وب', category: 'network', categoryLabel: 'شبکه و وب', keywords: ['دامنه', 'اینترنت', 'وب', 'domain', 'dns', 'web', 'site'], component: Globe },
  { id: 'Network', name: 'سوئیچ / ساب‌نت شبکه', category: 'network', categoryLabel: 'شبکه و وب', keywords: ['شبکه', 'روتر', 'سوئیچ', 'network', 'switch', 'subnet'], component: Network },
  { id: 'Router', name: 'مودم / روتر صنعتی', category: 'network', categoryLabel: 'شبکه و وب', keywords: ['مودم', 'روتر', 'router', 'mikrotik', 'cisco'], component: Router },
  { id: 'Wifi', name: 'شبکه بی‌سیم / وای‌فای', category: 'network', categoryLabel: 'شبکه و وب', keywords: ['وای فای', 'بیسیم', 'wifi', 'wireless'], component: Wifi },
  { id: 'Radio', name: 'آنتن / رادیو وایرلس', category: 'network', categoryLabel: 'شبکه و وب', keywords: ['رادیو', 'آنتن', 'دکل', 'radio', 'antenna', 'wireless'], component: Radio },
  { id: 'Share2', name: 'لودبالانسر / پراکسی', category: 'network', categoryLabel: 'شبکه و وب', keywords: ['پراکسی', 'توزیع بار', 'proxy', 'load balancer', 'share'], component: Share2 },
  { id: 'Cable', name: 'کابل و پورت شبکه', category: 'network', categoryLabel: 'شبکه و وب', keywords: ['پورت', 'کابل', 'cable', 'port', 'ethernet'], component: Cable },
  { id: 'ShieldCheck', name: 'فایروال / CDN امنیتی', category: 'network', categoryLabel: 'شبکه و وب', keywords: ['فایروال', 'سی دی ان', 'firewall', 'cdn', 'cloudflare'], component: ShieldCheck },

  // ۳. دیتابیس و ذخیره‌سازی
  { id: 'Database', name: 'پایگاه داده / دیتابیس', category: 'data', categoryLabel: 'داده و دیتابیس', keywords: ['دیتابیس', 'پایگاه داده', 'database', 'sql', 'postgres', 'mysql', 'redis'], component: Database },
  { id: 'Archive', name: 'آرشیو و فایل‌های پشتیبان', category: 'data', categoryLabel: 'داده و دیتابیس', keywords: ['بکاپ', 'پشتیبان', 'آرشیو', 'backup', 'archive'], component: Archive },
  { id: 'Binary', name: 'داده خام و باینری', category: 'data', categoryLabel: 'داده و دیتابیس', keywords: ['داده', 'باینری', 'binary', 'data'], component: Binary },
  { id: 'FileCode', name: 'سورس‌کد / اسکریپت', category: 'data', categoryLabel: 'داده و دیتابیس', keywords: ['کد', 'برنامه', 'اسکریپت', 'code', 'script'], component: FileCode },
  { id: 'FileText', name: 'فایل کانفیگ / مستند', category: 'data', categoryLabel: 'داده و دیتابیس', keywords: ['متن', 'کانفیگ', 'config', 'doc', 'text'], component: FileText },
  { id: 'FolderTree', name: 'مخزن و ساختار فایل', category: 'data', categoryLabel: 'داده و دیتابیس', keywords: ['فولدر', 'مخزن', 'پوشه', 'folder', 'repo'], component: FolderTree },

  // ۴. امنیت و دسترسی
  { id: 'Key', name: 'کلید دسترسی / لایسنس', category: 'security', categoryLabel: 'امنیت و دسترسی', keywords: ['کلید', 'لایسنس', 'مجوز', 'key', 'license'], component: Key },
  { id: 'Lock', name: 'قفل و کلمه عبور', category: 'security', categoryLabel: 'امنیت و دسترسی', keywords: ['قفل', 'رمز', 'پسورد', 'lock', 'password'], component: Lock },
  { id: 'Shield', name: 'سپر امنیتی / پایش', category: 'security', categoryLabel: 'امنیت و دسترسی', keywords: ['امنیت', 'سپر', 'حفاظت', 'security', 'shield'], component: Shield },
  { id: 'KeyRound', name: 'توکن و API Key', category: 'security', categoryLabel: 'امنیت و دسترسی', keywords: ['توکن', 'api key', 'token', 'secret'], component: KeyRound },
  { id: 'Fingerprint', name: 'احراز هویت / بیومتریک', category: 'security', categoryLabel: 'امنیت و دسترسی', keywords: ['اثر انگشت', 'احراز', 'auth', 'fingerprint'], component: Fingerprint },
  { id: 'UserCheck', name: 'حساب کاربری ممتاز / ادمین', category: 'security', categoryLabel: 'امنیت و دسترسی', keywords: ['کاربر', 'ادمین', 'user', 'admin'], component: UserCheck },

  // ۵. سخت‌افزار و تجهیزات اداری
  { id: 'Monitor', name: 'کیس و کامپیوتر سازمانی', category: 'hardware', categoryLabel: 'سخت‌افزار و تجهیزات', keywords: ['کامپیوتر', 'کیس', 'مانیتور', 'pc', 'computer', 'monitor'], component: Monitor },
  { id: 'Laptop', name: 'لپ‌تاپ سازمانی', category: 'hardware', categoryLabel: 'سخت‌افزار و تجهیزات', keywords: ['لپ تاپ', 'نوت بوک', 'laptop', 'notebook'], component: Laptop },
  { id: 'Smartphone', name: 'موبایل / تبلت تست', category: 'hardware', categoryLabel: 'سخت‌افزار و تجهیزات', keywords: ['گوشی', 'موبایل', 'تبلت', 'phone', 'mobile', 'tablet'], component: Smartphone },
  { id: 'Printer', name: 'چاپگر و اسکنر اداری', category: 'hardware', categoryLabel: 'سخت‌افزار و تجهیزات', keywords: ['پرینتر', 'چاپگر', 'اسکنر', 'printer', 'scanner'], component: Printer },
  { id: 'Camera', name: 'دوربین مداربسته / نظارت', category: 'hardware', categoryLabel: 'سخت‌افزار و تجهیزات', keywords: ['دوربین', 'cctv', 'camera', 'ip cam'], component: Camera },
  { id: 'Power', name: 'منبع تغذیه / UPS برق', category: 'hardware', categoryLabel: 'سخت‌افزار و تجهیزات', keywords: ['یو پی اس', 'برق', 'پاور', 'power', 'ups'], component: Power },

  // ۶. سرویس‌ها و ارتباطات
  { id: 'Mail', name: 'سرویس ایمیل سازمانی', category: 'services', categoryLabel: 'سرویس‌ها و ارتباطات', keywords: ['ایمیل', 'میل', 'پست الکترونیک', 'mail', 'email', 'smtp'], component: Mail },
  { id: 'MessageSquare', name: 'پیام‌رسان / چت‌بات', category: 'services', categoryLabel: 'سرویس‌ها و ارتباطات', keywords: ['پیام رسان', 'چت', 'بات', 'chat', 'bot', 'sms'], component: MessageSquare },
  { id: 'Bot', name: 'ربات خودکار / کرون‌جاب', category: 'services', categoryLabel: 'سرویس‌ها و ارتباطات', keywords: ['ربات', 'کرون', 'ورکر', 'bot', 'cron', 'worker'], component: Bot },
  { id: 'Zap', name: 'وب‌هوک و وب‌سرویس', category: 'services', categoryLabel: 'سرویس‌ها و ارتباطات', keywords: ['وب هوک', 'سریع', 'api', 'webhook', 'zap'], component: Zap },
  { id: 'Activity', name: 'مانیتورینگ و وضعیت', category: 'services', categoryLabel: 'سرویس‌ها و ارتباطات', keywords: ['مانیتورینگ', 'پایش', 'لاگ', 'status', 'activity', 'uptime'], component: Activity },
  { id: 'Sliders', name: 'تنظیمات و پارامترها', category: 'services', categoryLabel: 'سرویس‌ها و ارتباطات', keywords: ['تنظیمات', 'کانفیگ', 'sliders', 'settings'], component: Sliders },
  { id: 'Tag', name: 'دارایی عمومی / برچسب', category: 'services', categoryLabel: 'سرویس‌ها و ارتباطات', keywords: ['تگ', 'عمومی', 'دیگر', 'tag', 'other'], component: Tag },
];

const ICON_MAP = new Map<string, React.ComponentType<{ className?: string }>>();
for (const item of ASSET_ICONS) {
  ICON_MAP.set(item.id.toLowerCase(), item.component);
}

interface AssetIconProps {
  name?: string | null;
  className?: string;
  fallback?: React.ComponentType<{ className?: string }>;
}

export const AssetIcon: React.FC<AssetIconProps> = ({
  name,
  className = 'w-4 h-4',
  fallback: FallbackComponent = Server,
}) => {
  if (!name) {
    return <FallbackComponent className={className} />;
  }

  const Component = ICON_MAP.get(name.trim().toLowerCase());
  if (Component) {
    return <Component className={className} />;
  }

  return <FallbackComponent className={className} />;
};

export function getAssetIconComponent(name?: string | null): React.ComponentType<{ className?: string }> {
  if (!name) return Server;
  return ICON_MAP.get(name.trim().toLowerCase()) || Server;
}
