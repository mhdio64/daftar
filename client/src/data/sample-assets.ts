import { Asset } from '../services/assets.service';
import { AssetType } from '../services/asset-types.service';

export const DEFAULT_ASSET_TYPES: AssetType[] = [
  {
    id: 'vps',
    name: 'سرورهای مجازی (VPS)',
    slug: 'vps',
    icon: 'Server',
    description: 'مدیریت آدرس‌های IP، مشخصات SSH، پسوردهای Root و راهنمای سرورها',
    displayOrder: 1,
    assetCount: 3,
    schemaDefinition: [
      { id: 'f_ip', name: 'ip_address', label: 'آدرس IP', type: 'ip_port', isRequired: true, showInTable: true },
      { id: 'f_ssh', name: 'ssh_port', label: 'پورت SSH', type: 'text', isRequired: false, showInTable: true },
      { id: 'f_user', name: 'root_user', label: 'نام کاربری', type: 'text', isRequired: true, showInTable: true },
      { id: 'f_pass', name: 'root_password', label: 'رمز عبور Root', type: 'secret', isRequired: true, isSecret: true, showInTable: true },
      { id: 'f_os', name: 'os_type', label: 'سیستم عامل', type: 'select', options: ['Ubuntu 24.04', 'Debian 12', 'Rocky Linux 9'], isRequired: false, showInTable: true },
      { id: 'f_cost', name: 'cost_amount', label: 'هزینه سرور', type: 'text', isRequired: false, showInTable: true },
      { id: 'f_curr', name: 'cost_currency', label: 'ارز', type: 'select', options: ['تومان', 'دلار ($)', 'یورو (€)'], isRequired: false, showInTable: true },
      { id: 'f_cycl', name: 'billing_cycle', label: 'دوره پرداخت', type: 'select', options: ['ماهانه', 'سالانه'], isRequired: false, showInTable: true },
      { id: 'f_exp', name: 'expiry_date', label: 'سررسید تمدید', type: 'jalali_date', isRequired: false, showInTable: true },
    ],
  },
  {
    id: 'email',
    name: 'ایمیل‌های سازمانی',
    slug: 'email',
    icon: 'Mail',
    description: 'آدرس‌های ایمیل رسمی همکاران، پسوردها و تنظیمات وب‌میل',
    displayOrder: 2,
    assetCount: 4,
    schemaDefinition: [
      { id: 'f_em', name: 'email_address', label: 'آدرس ایمیل', type: 'email', isRequired: true, showInTable: true, isCopyable: true },
      { id: 'f_ep', name: 'password', label: 'رمز عبور ایمیل', type: 'secret', isRequired: true, isSecret: true, showInTable: true },
      { id: 'f_dp', name: 'department', label: 'واحد سازمانی', type: 'select', options: ['فنی و IT', 'مالی', 'پشتیبانی', 'مدیریت'], isRequired: false, showInTable: true },
      { id: 'f_qt', name: 'storage_quota', label: 'سقف فضا', type: 'text', isRequired: false, showInTable: true },
    ],
  },
  {
    id: 'domains',
    name: 'دامنه‌ها و DNS',
    slug: 'domains',
    icon: 'Globe',
    description: 'اطلاعات دامنه‌های اینترنتی، ثبت‌کننده‌ها و تاریخ انقضا',
    displayOrder: 3,
    assetCount: 2,
    schemaDefinition: [
      { id: 'f_dn', name: 'domain_name', label: 'نام دامنه', type: 'text', isRequired: true, showInTable: true },
      { id: 'f_rg', name: 'registrar', label: 'شرکت ثبت‌کننده', type: 'text', isRequired: true, showInTable: true },
      { id: 'f_cost', name: 'cost_amount', label: 'هزینه تمدید', type: 'text', isRequired: false, showInTable: true },
      { id: 'f_curr', name: 'cost_currency', label: 'ارز', type: 'select', options: ['تومان', 'دلار ($)', 'یورو (€)'], isRequired: false, showInTable: true },
      { id: 'f_cycl', name: 'billing_cycle', label: 'دوره پرداخت', type: 'select', options: ['ماهانه', 'سالانه'], isRequired: false, showInTable: true },
      { id: 'f_dx', name: 'expiry_date', label: 'تاریخ انقضا', type: 'jalali_date', isRequired: true, showInTable: true },
    ],
  },
  {
    id: 'licenses',
    name: 'لایسنس نرم‌افزارها',
    slug: 'licenses',
    icon: 'Key',
    description: 'کلیدهای فعال‌سازی نرم‌افزارها، ابزارهای ابری و اشتراک‌ها',
    displayOrder: 4,
    assetCount: 2,
    schemaDefinition: [
      { id: 'f_sw', name: 'software_name', label: 'نام نرم‌افزار', type: 'text', isRequired: true, showInTable: true },
      { id: 'f_lk', name: 'license_key', label: 'کد لایسنس', type: 'secret', isRequired: true, isSecret: true, showInTable: true },
      { id: 'f_vn', name: 'vendor', label: 'ارائه‌دهنده', type: 'text', isRequired: false, showInTable: true },
      { id: 'f_cost', name: 'cost_amount', label: 'مبلغ لایسنس', type: 'text', isRequired: false, showInTable: true },
      { id: 'f_curr', name: 'cost_currency', label: 'ارز', type: 'select', options: ['تومان', 'دلار ($)', 'یورو (€)'], isRequired: false, showInTable: true },
      { id: 'f_cycl', name: 'billing_cycle', label: 'دوره پرداخت', type: 'select', options: ['ماهانه', 'سالانه'], isRequired: false, showInTable: true },
      { id: 'f_lx', name: 'expiry_date', label: 'سررسید تمدید', type: 'jalali_date', isRequired: true, showInTable: true },
    ],
  },
];

/**
 * بررسی وضعیت سررسید دارایی جهت فیلتر هوشمند و رنگ‌آمیزی برچسب‌ها
 */
export function checkAssetExpiry(asset: Asset): { hasExpiry: boolean; isExpired: boolean; isUrgent: boolean } {
  const dateVal = asset.expiryDate || asset.values?.expiry_date;
  if (!dateVal) return { hasExpiry: false, isExpired: false, isUrgent: false };

  // بررسی عبارات متنی دمو
  if (typeof dateVal === 'string' && dateVal.includes('۷ روز دیگر')) {
    return { hasExpiry: true, isExpired: false, isUrgent: true };
  }

  const expDate = new Date(dateVal);
  if (isNaN(expDate.getTime())) {
    return { hasExpiry: true, isExpired: false, isUrgent: false };
  }

  const now = new Date();
  const diffDays = (expDate.getTime() - now.getTime()) / (1000 * 3600 * 24);

  if (diffDays < 0) {
    return { hasExpiry: true, isExpired: true, isUrgent: false };
  }
  if (diffDays <= 7) {
    return { hasExpiry: true, isExpired: false, isUrgent: true };
  }

  return { hasExpiry: true, isExpired: false, isUrgent: false };
}

/**
 * ساخت لیست کامل دارایی‌های نمونه دمو شامل سرورها، دیتابیس، دامنه‌ها، ایمیل‌ها و لایسنس‌ها
 */
export function getAllSampleAssets(types: AssetType[]): Asset[] {
  const vpsType = types.find((t) => t.id === 'vps') || types[0];
  const emailType = types.find((t) => t.id === 'email') || types[0];
  const domType = types.find((t) => t.id === 'domains') || types[0];
  const licType = types.find((t) => t.id === 'licenses') || types[0];

  return [
    {
      id: 'vps-1',
      assetTypeId: 'vps',
      assetType: vpsType,
      title: 'سرور اصلی دیتاسنتر تهران',
      tags: ['Production', 'اصلی', 'Critical'],
      relations: [
        {
          id: 'rel-1',
          targetAssetId: 'vps-2',
          type: 'DEPENDS_ON',
          note: 'لودبالانسر ورودی ترافیک',
        },
        {
          id: 'rel-2',
          targetAssetId: 'vps-3',
          type: 'BACKUP_OF',
          note: 'بکاپ روزانه در دیتاسنتر آلمان',
        },
      ],
      expiryDate: new Date(Date.now() + 55 * 86400000).toISOString(),
      values: {
        ip_address: '192.168.10.15:22',
        ssh_port: '22',
        root_user: 'root',
        root_password: '••••••••',
        os_type: 'Ubuntu 24.04',
        cost_amount: '4,500,000',
        cost_currency: 'تومان',
        billing_cycle: 'ماهانه',
        expiry_date: '۱۴۰۵/۰۲/۱۵',
      },
      docsMarkdown: `# راهنمای اتصال به سرور تهران\n- آی‌پی: 192.168.10.15\n- دستور اتصال SSH:\n\`ssh root@192.168.10.15 -p 22\``,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'vps-2',
      assetTypeId: 'vps',
      assetType: vpsType,
      title: 'لودبالانسر و پروکسی شبکه',
      tags: ['Production', 'شبکه', 'پروکسی'],
      expiryDate: new Date(Date.now() + 180 * 86400000).toISOString(),
      relations: [
        {
          id: 'rel-lb-1',
          targetAssetId: 'vps-1',
          type: 'DEPENDS_ON',
          note: 'توزیع بار روی سرور اصلی',
        },
      ],
      values: {
        ip_address: '10.0.1.5:443',
        ssh_port: '2222',
        root_user: 'admin',
        root_password: '••••••••',
        os_type: 'Debian 12',
        cost_amount: '1,800,000',
        cost_currency: 'تومان',
        billing_cycle: 'ماهانه',
        expiry_date: '۱۴۰۴/۱۲/۲۸',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'vps-3',
      assetTypeId: 'vps',
      assetType: vpsType,
      title: 'سرور بکاپ آلمان (Hetzner)',
      tags: ['Backup', 'Staging', 'آلمان'],
      expiryDate: new Date(Date.now() + 6 * 86400000).toISOString(),
      relations: [
        {
          id: 'rel-3',
          targetAssetId: 'vps-1',
          type: 'BACKUP_OF',
          note: 'پشتیبان‌گیری از دیتابیس و فایل‌های سرور تهران',
        },
      ],
      values: {
        ip_address: '89.144.20.12',
        ssh_port: '22',
        root_user: 'backup_usr',
        root_password: '••••••••',
        os_type: 'Rocky Linux 9',
        cost_amount: '38',
        cost_currency: 'یورو (€)',
        billing_cycle: 'ماهانه',
        expiry_date: '۷ روز دیگر',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'demo-db-1',
      assetTypeId: 'vps',
      assetType: vpsType,
      title: 'دیتابیس اصلی PostgreSQL (کانتینر داکر)',
      tags: ['Database', 'PostgreSQL', 'Critical', 'Production'],
      relations: [
        {
          id: 'rel-db-1',
          targetAssetId: 'vps-1',
          type: 'HOSTED_ON',
          note: 'میزبانی روی سرور اصلی دیتاسنتر تهران',
        },
      ],
      expiryDate: new Date(Date.now() + 120 * 86400000).toISOString(),
      values: {
        ip_address: '192.168.10.15:5432',
        ssh_port: '5432',
        root_user: 'postgres',
        root_password: '••••••••',
        os_type: 'PostgreSQL 16 (Debian 12)',
        cost_amount: '2,800,000',
        cost_currency: 'تومان',
        billing_cycle: 'ماهانه',
        expiry_date: '۱۴۰۵/۰۱/۱۵',
      },
      docsMarkdown: `# مستندات پایگاه داده اصلی PostgreSQL\n- کانتینر: \`postgres-prod\`\n- پورت سرویس: \`5432\`\n- نام دیتابیس‌های اصلی: \`daftar_production\`, \`auth_db\`\n- دستور اتصال:\n\`psql -h 192.168.10.15 -U postgres -d daftar_production\``,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'em-1',
      assetTypeId: 'email',
      assetType: emailType,
      title: 'ایمیل رسمی مدیر عامل',
      tags: ['مدیریت', 'Internal'],
      relations: [
        {
          id: 'rel-em-1',
          targetAssetId: 'vps-1',
          type: 'HOSTED_ON',
          note: 'میزبانی روی میل‌سرور سرور تهران',
        },
      ],
      values: {
        email_address: 'ceo@company.ir',
        password: '••••••••',
        department: 'مدیریت',
        storage_quota: '50 GB',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'em-2',
      assetTypeId: 'email',
      assetType: emailType,
      title: 'ایمیل دپارتمان مالی',
      tags: ['مالی', 'Internal'],
      values: {
        email_address: 'finance@company.ir',
        password: '••••••••',
        department: 'مالی',
        storage_quota: '20 GB',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'dom-1',
      assetTypeId: 'domains',
      assetType: domType,
      title: 'دامنه اصلی شرکت (company.ir)',
      tags: ['Production', 'برند اصلی'],
      expiryDate: new Date(Date.now() + 320 * 86400000).toISOString(),
      relations: [
        {
          id: 'rel-dom-1',
          targetAssetId: 'vps-1',
          type: 'POINTS_TO',
          note: 'DNS A Record -> 192.168.10.15',
        },
      ],
      values: {
        domain_name: 'company.ir',
        registrar: 'ایران‌سرور / ایرنیک',
        cost_amount: '650,000',
        cost_currency: 'تومان',
        billing_cycle: 'سالانه',
        expiry_date: '۱۴۰۵/۰۶/۳۰',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'dom-2',
      assetTypeId: 'domains',
      assetType: domType,
      title: 'دامنه بین‌المللی برند (company.com)',
      tags: ['بین‌المللی', 'برند'],
      expiryDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      relations: [
        {
          id: 'rel-dom-2',
          targetAssetId: 'vps-2',
          type: 'POINTS_TO',
          note: 'اتصال به لودبالانسر شبکه',
        },
      ],
      values: {
        domain_name: 'company.com',
        registrar: 'Namecheap',
        cost_amount: '16',
        cost_currency: 'دلار ($)',
        billing_cycle: 'سالانه',
        expiry_date: '۱۴۰۴/۱۱/۱۵',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'lic-1',
      assetTypeId: 'licenses',
      assetType: licType,
      title: 'لایسنس ابری JetBrains All Products',
      tags: ['Cloud', 'توسعه'],
      expiryDate: new Date(Date.now() + 190 * 86400000).toISOString(),
      values: {
        software_name: 'JetBrains Toolbox',
        license_key: '••••••••',
        vendor: 'JetBrains s.r.o.',
        cost_amount: '290',
        cost_currency: 'دلار ($)',
        billing_cycle: 'سالانه',
        expiry_date: '۱۴۰۵/۰۱/۲۰',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'lic-2',
      assetTypeId: 'licenses',
      assetType: licType,
      title: 'اشتراک سالانه GitKraken Pro',
      tags: ['ابزار', 'توسعه'],
      expiryDate: new Date(Date.now() - 2 * 86400000).toISOString(),
      values: {
        software_name: 'GitKraken Client',
        license_key: '••••••••',
        vendor: 'Axosoft',
        cost_amount: '60',
        cost_currency: 'دلار ($)',
        billing_cycle: 'سالانه',
        expiry_date: '۱۴۰۴/۱۰/۰۱',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}
