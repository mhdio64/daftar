import { api } from './api.ts';
import { assetTypesService, AssetType } from './asset-types.service.ts';
import { assetsService, Asset } from './assets.service.ts';

export interface BackupBundle {
  version: string;
  system: string;
  createdAt: string;
  stats: {
    assetTypesCount: number;
    assetsCount: number;
    usersCount?: number;
  };
  assetTypes: AssetType[];
  assets: Asset[];
  users?: any[];
  appSettings?: any;
}

export interface EncryptedBackupContainer {
  version: string;
  system: string;
  encrypted: true;
  salt: string;
  iv: string;
  ciphertext: string;
}

export interface BackupInspectResult {
  valid: boolean;
  isEncrypted: boolean;
  requiresPassword?: boolean;
  error?: string;
  version?: string;
  createdAt?: string;
  stats?: {
    assetTypesCount: number;
    assetsCount: number;
    usersCount?: number;
  };
  bundle?: BackupBundle;
}

// توابع کمکی رمزنگاری Web Crypto API برای فایل‌های پشتیبان
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptData(plainText: string, password: string): Promise<{ salt: string; iv: string; ciphertext: string }> {
  const enc = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as any },
    key,
    enc.encode(plainText)
  );

  return {
    salt: btoa(String.fromCharCode(...salt)),
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
  };
}

async function decryptData(encrypted: { salt: string; iv: string; ciphertext: string }, password: string): Promise<string> {
  const dec = new TextDecoder();
  const salt = Uint8Array.from(atob(encrypted.salt), (c) => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(encrypted.iv), (c) => c.charCodeAt(0));
  const cipherBytes = Uint8Array.from(atob(encrypted.ciphertext), (c) => c.charCodeAt(0));

  const key = await deriveKey(password, salt);
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as any },
    key,
    cipherBytes as any
  );

  return dec.decode(decryptedBuffer);
}

export interface ExportBackupOptions {
  password?: string;
  includeSettings?: boolean;
  includeUsers?: boolean;
  assetTypes?: AssetType[];
  assets?: Asset[];
}

export const backupService = {
  /**
   * تولید و دانلود فایل پشتیبان با یک کلیک
   */
  async exportBackup(options: ExportBackupOptions = {}): Promise<{ filename: string; stats: BackupBundle['stats'] }> {
    let bundle: BackupBundle | null = null;

    try {
      // تلاش برای دریافت از سرور بک‌اند در صورت اتصال
      bundle = await api.get<BackupBundle>(`/backup/export?includeUsers=${Boolean(options.includeUsers)}`);
    } catch (err) {
      console.warn('Backend /api/backup/export unreachable, building backup from client state:', err);
    }

    if (!bundle) {
      // فال‌بک دریافت از استیت کلاینت یا حافظه محلی
      let types: AssetType[] = options.assetTypes && options.assetTypes.length > 0 ? options.assetTypes : [];

      if (types.length === 0) {
        try {
          const storedTypes = localStorage.getItem('daftar_asset_types');
          if (storedTypes) types = JSON.parse(storedTypes);
        } catch {
          // ignore
        }
      }

      if (types.length === 0) {
        types = [
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
            assetCount: 2,
            schemaDefinition: [
              { id: 'f_em', name: 'email_address', label: 'آدرس ایمیل', type: 'text', isRequired: true, showInTable: true },
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
              { id: 'f_lx', name: 'expiry_date', label: 'سررسید تمدید', type: 'jalali_date', isRequired: true, showInTable: true },
            ],
          },
        ];
      }

      let allAssets: Asset[] = options.assets && options.assets.length > 0 ? options.assets : [];

      if (allAssets.length === 0) {
        try {
          const storedAssets = localStorage.getItem('daftar_demo_assets');
          if (storedAssets) allAssets = JSON.parse(storedAssets);
        } catch {
          // ignore
        }
      }

      if (allAssets.length === 0) {
        allAssets = [
          {
            id: 'vps-1',
            assetTypeId: 'vps',
            assetType: types[0],
            title: 'سرور اصلی دیتاسنتر تهران',
            values: {
              ip_address: '192.168.10.15:22',
              ssh_port: '22',
              root_user: 'root',
              root_password: '••••••••',
              os_type: 'Ubuntu 24.04',
              expiry_date: '۱۴۰۵/۰۲/۱۵',
            },
            docsMarkdown: '# راهنمای اتصال به سرور تهران\n- آی‌پی: 192.168.10.15\n- دستور اتصال SSH:\n`ssh root@192.168.10.15 -p 22`',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'vps-2',
            assetTypeId: 'vps',
            assetType: types[0],
            title: 'لودبالانسر و پروکسی شبکه',
            values: {
              ip_address: '10.0.1.5:443',
              ssh_port: '2222',
              root_user: 'admin',
              root_password: '••••••••',
              os_type: 'Debian 12',
              expiry_date: '۱۴۰۴/۱۲/۲۸',
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'vps-3',
            assetTypeId: 'vps',
            assetType: types[0],
            title: 'سرور بکاپ آلمان (Hetzner)',
            values: {
              ip_address: '89.144.20.12',
              ssh_port: '22',
              root_user: 'backup_usr',
              root_password: '••••••••',
              os_type: 'Rocky Linux 9',
              expiry_date: '۷ روز دیگر',
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'em-1',
            assetTypeId: 'email',
            assetType: types[1] || types[0],
            title: 'ایمیل رسمی مدیر عامل',
            values: {
              email_address: 'ceo@company.ir',
              password: '••••••••',
              department: 'مدیریت',
              storage_quota: '50 GB',
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
      }

      let settingsData: any = null;
      try {
        const storedSettings = localStorage.getItem('daftar_app_settings');
        if (storedSettings) settingsData = JSON.parse(storedSettings);
      } catch {
        // ignore
      }

      let usersData: any[] = [];
      try {
        const currentUser = localStorage.getItem('daftar_user');
        if (currentUser) usersData.push(JSON.parse(currentUser));
      } catch {
        // ignore
      }

      bundle = {
        version: '1.0.0',
        system: 'Daftar Asset Management',
        createdAt: new Date().toISOString(),
        stats: {
          assetTypesCount: types.length,
          assetsCount: allAssets.length,
          usersCount: usersData.length || 1,
        },
        assetTypes: types,
        assets: allAssets,
        users: options.includeUsers ? usersData : undefined,
        appSettings: options.includeSettings ? settingsData : undefined,
      };
    }

    if (options.includeSettings && !bundle.appSettings) {
      try {
        const storedSettings = localStorage.getItem('daftar_app_settings');
        if (storedSettings) bundle.appSettings = JSON.parse(storedSettings);
      } catch {
        // ignore
      }
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timeTag = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
    let filename = `daftar_backup_${timeTag}.json`;
    let fileContent: string;

    // در صورت انتخاب رمزگذاری توسط کاربر
    if (options.password && options.password.trim()) {
      const encrypted = await encryptData(JSON.stringify(bundle, null, 2), options.password.trim());
      const container: EncryptedBackupContainer = {
        version: '1.0.0',
        system: 'Daftar Asset Management',
        encrypted: true,
        salt: encrypted.salt,
        iv: encrypted.iv,
        ciphertext: encrypted.ciphertext,
      };
      fileContent = JSON.stringify(container, null, 2);
      filename = `daftar_backup_${timeTag}.daftar`;
    } else {
      fileContent = JSON.stringify(bundle, null, 2);
    }

    // ایجاد لینک دانلود فایل در مرورگر
    const blob = new Blob([fileContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return {
      filename,
      stats: bundle.stats,
    };
  },

  /**
   * بررسی و بازرسی ساختار فایل پشتیبان قبل از بازیابی
   */
  async inspectBackupFile(file: File, password?: string): Promise<BackupInspectResult> {
    try {
      const rawText = await file.text();
      let parsed: any;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        return {
          valid: false,
          isEncrypted: false,
          error: 'فایل ارسالی فرمت JSON استاندارد و معتبری ندارد.',
        };
      }

      // اگر فایل رمزنگاری شده باشد
      if (parsed.encrypted === true) {
        if (!password) {
          return {
            valid: true,
            isEncrypted: true,
            requiresPassword: true,
          };
        }

        try {
          const decryptedText = await decryptData(parsed, password);
          const decryptedBundle: BackupBundle = JSON.parse(decryptedText);
          return this.validateBundleStructure(decryptedBundle, true);
        } catch {
          return {
            valid: false,
            isEncrypted: true,
            error: 'رمز عبور وارد شده برای رمزگشایی فایل پشتیبان اشتباه است.',
          };
        }
      }

      // اگر فایل عادی و بدون رمز باشد
      return this.validateBundleStructure(parsed, false);
    } catch (err: any) {
      return {
        valid: false,
        isEncrypted: false,
        error: err.message || 'خطا در خواندن فایل پشتیبان.',
      };
    }
  },

  /**
   * اعتبارسنجی فیلدهای کلیدی بسته پشتیبان
   */
  validateBundleStructure(bundle: any, isEncrypted: boolean): BackupInspectResult {
    if (!bundle || !Array.isArray(bundle.assetTypes) || !Array.isArray(bundle.assets)) {
      return {
        valid: false,
        isEncrypted,
        error: 'ساختار بسته پشتیبان فاقد دسته‌بندی‌ها یا دارایی‌های معتبر است.',
      };
    }

    return {
      valid: true,
      isEncrypted,
      version: bundle.version || '1.0.0',
      createdAt: bundle.createdAt || new Date().toISOString(),
      stats: {
        assetTypesCount: bundle.assetTypes.length,
        assetsCount: bundle.assets.length,
        usersCount: bundle.users?.length || 0,
      },
      bundle,
    };
  },

  /**
   * اعمال بازیابی به سیستم
   */
  async applyRestore(
    bundle: BackupBundle,
    options: { mode: 'clean' | 'merge' } = { mode: 'clean' }
  ): Promise<{ message: string; stats: { restoredTypesCount: number; restoredAssetsCount: number } }> {
    try {
      // تلاش برای بازیابی از طریق سرور
      const res = await api.post<any>('/backup/restore', {
        bundle,
        mode: options.mode,
      });

      // در صورت وجود تنظیمات در بکاپ، ذخیره‌سازی در لوکال استوریج
      if (bundle.appSettings) {
        try {
          localStorage.setItem('daftar_app_settings', JSON.stringify(bundle.appSettings));
        } catch {
          // ignore
        }
      }

      return {
        message: res.message || 'اطلاعات با موفقیت بازیابی شد.',
        stats: res.stats || {
          restoredTypesCount: bundle.assetTypes.length,
          restoredAssetsCount: bundle.assets.length,
        },
      };
    } catch (err) {
      console.warn('Backend /api/backup/restore unreachable, applying restore to client state:', err);

      // ذخیره‌سازی دسته‌بندی‌ها و دارایی‌ها در localStorage برای بازیابی در کلاینت
      try {
        if (options.mode === 'merge') {
          let existingTypes: AssetType[] = [];
          let existingAssets: Asset[] = [];
          try {
            const t = localStorage.getItem('daftar_asset_types');
            if (t) existingTypes = JSON.parse(t);
            const a = localStorage.getItem('daftar_demo_assets');
            if (a) existingAssets = JSON.parse(a);
          } catch {}

          const typeMap = new Map(existingTypes.map((t) => [t.id, t]));
          for (const t of bundle.assetTypes) typeMap.set(t.id, t);
          const mergedTypes = Array.from(typeMap.values());

          const assetMap = new Map(existingAssets.map((a) => [a.id, a]));
          for (const a of bundle.assets) assetMap.set(a.id, a);
          const mergedAssets = Array.from(assetMap.values());

          localStorage.setItem('daftar_asset_types', JSON.stringify(mergedTypes));
          localStorage.setItem('daftar_demo_assets', JSON.stringify(mergedAssets));
        } else {
          localStorage.setItem('daftar_asset_types', JSON.stringify(bundle.assetTypes));
          localStorage.setItem('daftar_demo_assets', JSON.stringify(bundle.assets));
        }
      } catch (storageErr) {
        console.error('Failed to write restored data to localStorage:', storageErr);
      }

      // در حالت دمو کلاینت، تنظیمات را بازیابی می‌کنیم
      if (bundle.appSettings) {
        try {
          localStorage.setItem('daftar_app_settings', JSON.stringify(bundle.appSettings));
          if (bundle.appSettings.theme) {
            localStorage.setItem('daftar_theme', bundle.appSettings.theme);
          }
          if (bundle.appSettings.defaultDensity) {
            localStorage.setItem('daftar_density', bundle.appSettings.defaultDensity);
          }
        } catch {
          // ignore
        }
      }

      return {
        message: `بازیابی با موفقیت در حافظه مرورگر اعمال شد (${bundle.assetTypes.length} دسته و ${bundle.assets.length} دارایی).`,
        stats: {
          restoredTypesCount: bundle.assetTypes.length,
          restoredAssetsCount: bundle.assets.length,
        },
      };
    }
  },
};
