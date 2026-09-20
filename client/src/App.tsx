import React, { useState, useEffect, useMemo } from 'react';
import { 
  Server, 
  Mail, 
  Globe, 
  Key, 
  Plus, 
  Search, 
  Bell, 
  Clock, 
  ShieldCheck, 
  Users, 
  Copy, 
  Check, 
  Sliders, 
  Download, 
  Upload,
  FileSpreadsheet,
  BookOpen, 
  ExternalLink,
  LogOut,
  FolderPlus,
  Sun,
  Moon,
  Settings,
  KeyRound,
  Filter,
  Tag,
  RotateCcw,
  Network,
  X
} from 'lucide-react';

import { ToastProvider, useToast } from './context/ToastContext.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { SettingsProvider, useSettings } from './context/SettingsContext.tsx';
import { SetupWizard } from './components/common/SetupWizard.tsx';
import { LoginModal } from './components/common/LoginModal.tsx';
import { CommandPalette } from './components/common/CommandPalette.tsx';
import { SecretCell } from './components/grid/SecretCell.tsx';
import { AssetDrawer } from './components/drawer/AssetDrawer.tsx';
import { SchemaBuilderModal } from './components/forms/SchemaBuilderModal.tsx';
import { ExcelImportModal } from './components/modals/ExcelImportModal.tsx';
import { CategoryWikiView } from './components/wiki/CategoryWikiView.tsx';
import { RemindersView } from './components/reminders/RemindersView.tsx';
import { UsersView } from './components/users/UsersView.tsx';
import { AuditLogsView } from './components/audit/AuditLogsView.tsx';
import { SettingsView } from './components/settings/SettingsView.tsx';
import { PasswordGeneratorModal } from './components/modals/PasswordGeneratorModal.tsx';
import { TagBadge } from './components/common/TagBadge.tsx';

import { assetTypesService, AssetType } from './services/asset-types.service.ts';
import { assetsService, Asset } from './services/assets.service.ts';
import { exportAssetsToExcel, ParsedRow } from './services/excel.service.ts';

// بررسی وضعیت سررسید دارایی جهت فیلتر هوشمند
function checkAssetExpiry(asset: Asset): { hasExpiry: boolean; isExpired: boolean; isUrgent: boolean } {
  const dateVal = asset.expiryDate || asset.values?.expiry_date;
  if (!dateVal) return { hasExpiry: false, isExpired: false, isUrgent: false };

  const str = String(dateVal).trim();
  if (str.includes('روز دیگر') || str.includes('روز قبل')) {
    const days = parseInt(str, 10);
    if (!isNaN(days)) {
      return {
        hasExpiry: true,
        isExpired: days < 0,
        isUrgent: days <= 30 && days >= 0,
      };
    }
  }

  const parsedTime = Date.parse(str);
  if (!isNaN(parsedTime)) {
    const days = Math.ceil((parsedTime - Date.now()) / (1000 * 60 * 60 * 24));
    return {
      hasExpiry: true,
      isExpired: days < 0,
      isUrgent: days <= 30 && days >= 0,
    };
  }

  if (str.includes('۱۴۰۴') || str.includes('1404')) {
    return { hasExpiry: true, isExpired: false, isUrgent: true };
  }
  if (str.includes('۱۴۰۳') || str.includes('1403')) {
    return { hasExpiry: true, isExpired: true, isUrgent: false };
  }

  return { hasExpiry: true, isExpired: false, isUrgent: false };
}

function AppContent() {
  const { user, token, setupNeeded, isLoading, logout } = useAuth();
  const { showToast } = useToast();
  const { settings, updateSettings } = useSettings();

  // ناوبری و تب‌های اصلی
  const [activeTab, setActiveTab] = useState<'assets' | 'reminders' | 'audit' | 'users' | 'settings'>('assets');
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [activeTypeId, setActiveTypeId] = useState<string | null>(null);

  const activeAssetType = assetTypes.find((t) => t.id === activeTypeId);

  // فیلدهای قابل نمایش در جدول بر اساس تنظیمات بخش «تنظیم فیلدها» (showInTable !== false)
  const visibleFields = useMemo(() => {
    if (!activeAssetType) return [];
    return activeAssetType.schemaDefinition.filter((f) => f.showInTable !== false);
  }, [activeAssetType]);
  
  // داده‌های دارایی‌ها
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isAssetsLoading, setIsAssetsLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // مودال‌ها و ابزارها
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [isGlobalPassModalOpen, setIsGlobalPassModalOpen] = useState(false);
  const [isAddingNewType, setIsAddingNewType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeSlug, setNewTypeSlug] = useState('');

  const density = settings.defaultDensity;
  const handleDensityChange = (d: 'compact' | 'comfortable') => {
    updateSettings({ defaultDensity: d });
  };

  const [copiedCellId, setCopiedCellId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [categoryViewTab, setCategoryViewTab] = useState<'grid' | 'wiki'>('grid');

  // استیت‌های فیلتر پیشرفته و سیستم برچسب‌ها
  const [filterSearch, setFilterSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagFilterMode, setTagFilterMode] = useState<'AND' | 'OR'>('OR');
  const [expiryStatusFilter, setExpiryStatusFilter] = useState<'all' | 'has_expiry' | 'urgent' | 'expired'>('all');

  // ریست فیلترها هنگام تعویض دسته‌بندی
  useEffect(() => {
    setFilterSearch('');
    setSelectedTags([]);
    setExpiryStatusFilter('all');
  }, [activeTypeId]);

  // استخراج تمام برچسب‌های موجود در دسته جاری به همراه تعداد
  const availableTagsWithCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of assets) {
      if (Array.isArray(a.tags)) {
        for (const t of a.tags) {
          const clean = t.trim();
          if (clean) {
            counts.set(clean, (counts.get(clean) || 0) + 1);
          }
        }
      }
    }
    return Array.from(counts.entries()).map(([tag, count]) => ({ tag, count }));
  }, [assets]);

  // دارایی‌های فیلتر شده بر اساس متن، برچسب‌ها و وضعیت سررسید
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      // ۱. فیلتر متنی (جستجو در عنوان، برچسب‌ها و کلیه فیلدها)
      if (filterSearch.trim()) {
        const q = filterSearch.trim().toLowerCase();
        const titleMatch = (asset.title || '').toLowerCase().includes(q);
        const tagsMatch = (asset.tags || []).some((t) => t.toLowerCase().includes(q));
        const valuesMatch = Object.values(asset.values || {}).some((v) =>
          String(v || '').toLowerCase().includes(q)
        );
        if (!titleMatch && !tagsMatch && !valuesMatch) return false;
      }

      // ۲. فیلتر برچسب‌ها
      if (selectedTags.length > 0) {
        const assetTags = (asset.tags || []).map((t) => t.toLowerCase());
        if (tagFilterMode === 'AND') {
          const hasAll = selectedTags.every((st) => assetTags.includes(st.toLowerCase()));
          if (!hasAll) return false;
        } else {
          const hasAny = selectedTags.some((st) => assetTags.includes(st.toLowerCase()));
          if (!hasAny) return false;
        }
      }

      // ۳. فیلتر سررسید و انقضا
      if (expiryStatusFilter !== 'all') {
        const status = checkAssetExpiry(asset);
        if (expiryStatusFilter === 'has_expiry' && !status.hasExpiry) return false;
        if (expiryStatusFilter === 'expired' && !status.isExpired) return false;
        if (expiryStatusFilter === 'urgent' && !status.isUrgent) return false;
      }

      return true;
    });
  }, [assets, filterSearch, selectedTags, tagFilterMode, expiryStatusFilter]);

  const activeFiltersCount =
    (filterSearch.trim() ? 1 : 0) +
    selectedTags.length +
    (expiryStatusFilter !== 'all' ? 1 : 0);

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSingleTagFilter = (tag: string) => {
    if (selectedTags.length === 1 && selectedTags[0] === tag) {
      setSelectedTags([]);
      showToast(`فیلتر برچسب «${tag}» غیرفعال شد.`, 'info');
    } else {
      setSelectedTags([tag]);
      showToast(`فیلتر بر اساس برچسب «${tag}» فعال شد.`, 'info');
    }
  };

  const handleClearAllFilters = () => {
    setFilterSearch('');
    setSelectedTags([]);
    setExpiryStatusFilter('all');
    showToast('کلیه فیلترها پاکسازی شدند.', 'info');
  };

  // سیستم تم هماهنگ با تنظیمات
  const theme = settings.theme;
  const toggleTheme = () => {
    updateSettings({ theme: theme === 'light' ? 'dark' : 'light' });
  };

  // خروجی اکسل از دارایی‌های جاری این دسته با ستون‌های انتخابی کاربر
  const handleExportExcel = () => {
    if (!activeAssetType) return;
    if (assets.length === 0) {
      showToast('هیچ دارایی برای خروجی اکسل در این دسته وجود ندارد.', 'info');
      return;
    }
    try {
      exportAssetsToExcel({ ...activeAssetType, schemaDefinition: visibleFields }, assets);
      showToast(`خروجی اکسل «${activeAssetType.name}» با موفقیت دانلود شد.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'خطا در صدور خروجی اکسل', 'error');
    }
  };

  // ورود دسته‌ای دارایی‌ها از فایل اکسل اعتبارسنجی شده
  const handleBatchImport = async (validRows: ParsedRow[]) => {
    if (!activeAssetType) return;
    const items = validRows.map((r) => ({
      title: r.title,
      inputValues: r.inputValues,
      tags: r.tags || [],
    }));

    try {
      await assetsService.createBatch({
        assetTypeId: activeAssetType.id,
        items,
      });
      await loadAssets(activeAssetType.id);
      await loadAssetTypes();
    } catch {
      // فال‌بک به داده‌های محلی دمو در صورت عدم اتصال به دیتابیس
      const newDemoAssets: Asset[] = items.map((item, idx) => ({
        id: `imported-${Date.now()}-${idx}`,
        assetTypeId: activeAssetType.id,
        assetType: activeAssetType,
        title: item.title,
        values: item.inputValues,
        tags: item.tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      setAssets((prev) => [...newDemoAssets, ...prev]);
      setAssetTypes((prev) =>
        prev.map((t) =>
          t.id === activeAssetType.id
            ? { ...t, assetCount: (t.assetCount || 0) + newDemoAssets.length }
            : t
        )
      );
    }
  };
  // به‌روزرسانی مستندات و ویکی جامع دسته
  const handleUpdateWiki = async (updatedMarkdown: string) => {
    if (!activeAssetType) return;
    try {
      await assetTypesService.updateWiki(activeAssetType.id, updatedMarkdown);
      setAssetTypes((prev) =>
        prev.map((t) => (t.id === activeAssetType.id ? { ...t, typeDocsMarkdown: updatedMarkdown } : t))
      );
    } catch {
      // در حالت دمو یا آفلاین:
      setAssetTypes((prev) =>
        prev.map((t) => (t.id === activeAssetType.id ? { ...t, typeDocsMarkdown: updatedMarkdown } : t))
      );
    }
  };

  // بارگذاری دسته‌بندی‌ها با فال‌بک داده‌های استاندارد در حالت دمو
  const loadAssetTypes = async () => {
    try {
      const res = await assetTypesService.getAll();
      if (res.items && res.items.length > 0) {
        setAssetTypes(res.items);
        try {
          localStorage.setItem('daftar_asset_types', JSON.stringify(res.items));
        } catch {}
        if (!activeTypeId) setActiveTypeId(res.items[0].id);
        return;
      }
    } catch {
      // استفاده از داده‌های پیش‌فرض
    }

    // بررسی آیا دسته‌بندی‌ها در localStorage ذخیره شده‌اند (مثلاً پس از بازیابی)
    try {
      const stored = localStorage.getItem('daftar_asset_types');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAssetTypes(parsed);
          if (!activeTypeId) setActiveTypeId(parsed[0].id);
          return;
        }
      }
    } catch {}

    // دسته‌بندی‌های نمونه اولیه جهت بررسی کامل UI
    const defaultAssetTypes: AssetType[] = [
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
        assetCount: 4,
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

    setAssetTypes(defaultAssetTypes);
    if (!activeTypeId) setActiveTypeId('vps');
  };

  useEffect(() => {
    if (token) {
      loadAssetTypes();
    }
  }, [token]);

  // بارگذاری دارایی‌های دسته فعال با فال‌بک نمونه‌های دمو
  const loadAssets = async (typeId: string) => {
    setIsAssetsLoading(true);
    try {
      const res = await assetsService.getAll({ assetTypeId: typeId });
      if (res.items && res.items.length > 0) {
        setAssets(res.items);
        setIsAssetsLoading(false);
        return;
      }
    } catch {
      // فال‌بک به داده‌های نمایشی دمو
    }

    // بررسی آیا دارایی‌ها در localStorage ذخیره شده‌اند (مثلاً پس از بازیابی اطلاعات)
    try {
      const stored = localStorage.getItem('daftar_demo_assets');
      if (stored) {
        const parsed: Asset[] = JSON.parse(stored);
        const filtered = parsed.filter((a) => a.assetTypeId === typeId);
        if (filtered.length > 0) {
          setAssets(filtered);
          setIsAssetsLoading(false);
          return;
        }
      }
    } catch {}

    // تولید داده‌های نمونه برای پیش‌نمایش با برچسب‌های پیش‌فرض
    let sampleAssets: Asset[] = [];
    if (typeId === 'vps') {
      sampleAssets = [
        {
          id: 'vps-1',
          assetTypeId: 'vps',
          assetType: activeAssetType!,
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
          values: {
            ip_address: '192.168.10.15:22',
            ssh_port: '22',
            root_user: 'root',
            root_password: '••••••••',
            os_type: 'Ubuntu 24.04',
            expiry_date: '۱۴۰۵/۰۲/۱۵',
          },
          docsMarkdown: `# راهنمای اتصال به سرور تهران\n- آی‌پی: 192.168.10.15\n- دستور اتصال SSH:\n\`ssh root@192.168.10.15 -p 22\``,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'vps-2',
          assetTypeId: 'vps',
          assetType: activeAssetType!,
          title: 'لودبالانسر و پروکسی شبکه',
          tags: ['Production', 'شبکه', 'پروکسی'],
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
          assetType: activeAssetType!,
          title: 'سرور بکاپ آلمان (Hetzner)',
          tags: ['Backup', 'Staging', 'آلمان'],
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
            expiry_date: '۷ روز دیگر',
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    } else if (typeId === 'email') {
      sampleAssets = [
        {
          id: 'em-1',
          assetTypeId: 'email',
          assetType: activeAssetType!,
          title: 'ایمیل رسمی مدیر عامل',
          tags: ['مدیریت', 'Internal'],
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
          assetType: activeAssetType!,
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
      ];
    } else if (typeId === 'domains') {
      sampleAssets = [
        {
          id: 'dom-1',
          assetTypeId: 'domains',
          assetType: activeAssetType!,
          title: 'دامنه اصلی شرکت (company.ir)',
          tags: ['Production', 'برند اصلی'],
          values: {
            domain_name: 'company.ir',
            registrar: 'ایران‌سرور / ایرنیک',
            expiry_date: '۱۴۰۵/۰۶/۳۰',
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'dom-2',
          assetTypeId: 'domains',
          assetType: activeAssetType!,
          title: 'دامنه بین‌المللی برند (company.com)',
          tags: ['بین‌المللی', 'برند'],
          values: {
            domain_name: 'company.com',
            registrar: 'Namecheap',
            expiry_date: '۱۴۰۴/۱۱/۱۵',
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    } else if (typeId === 'licenses') {
      sampleAssets = [
        {
          id: 'lic-1',
          assetTypeId: 'licenses',
          assetType: activeAssetType!,
          title: 'لایسنس ابری JetBrains All Products',
          tags: ['Cloud', 'توسعه'],
          values: {
            software_name: 'JetBrains Toolbox',
            license_key: '••••••••',
            vendor: 'JetBrains s.r.o.',
            expiry_date: '۱۴۰۵/۰۱/۲۰',
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'lic-2',
          assetTypeId: 'licenses',
          assetType: activeAssetType!,
          title: 'اشتراک سالانه GitKraken Pro',
          tags: ['ابزار', 'توسعه'],
          values: {
            software_name: 'GitKraken Client',
            license_key: '••••••••',
            vendor: 'Axosoft',
            expiry_date: '۱۴۰۴/۱۰/۰۱',
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    }

    setAssets(sampleAssets);
    setIsAssetsLoading(false);
  };

  useEffect(() => {
    if (token && activeTypeId && activeTab === 'assets') {
      loadAssets(activeTypeId);
    }
  }, [token, activeTypeId, activeTab]);

  // کلید میانبر جستجوی سراسری (Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


  const handleCopy = (text: string, identifier: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedCellId(identifier);
    showToast('کپی در کلیپ‌بورد انجام شد.', 'success');
    setTimeout(() => setCopiedCellId(null), 1500);
  };

  // ثبت دسته جدید
  const handleCreateNewType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim() || !newTypeSlug.trim()) return;

    const trimmedName = newTypeName.trim();
    const trimmedSlug = newTypeSlug.trim().toLowerCase();

    try {
      const created = await assetTypesService.create({
        name: trimmedName,
        slug: trimmedSlug,
        icon: 'Server',
        schemaDefinition: [],
      });
      showToast(`دسته "${created.name}" با موفقیت ایجاد شد.`, 'success');
      setNewTypeName('');
      setNewTypeSlug('');
      setIsAddingNewType(false);
      await loadAssetTypes();
      setActiveTypeId(created.id);
    } catch (err: any) {
      console.warn('API create asset type unreachable, creating locally in demo mode:', err);
      const newType: AssetType = {
        id: trimmedSlug || `type_${Date.now()}`,
        name: trimmedName,
        slug: trimmedSlug,
        icon: 'Server',
        description: `مدیریت دارایی‌ها و رکوردهای ${trimmedName}`,
        displayOrder: assetTypes.length + 1,
        assetCount: 0,
        schemaDefinition: [
          { id: `f_${Date.now()}_1`, name: 'title', label: 'عنوان رکورد', type: 'text', isRequired: true, showInTable: true },
          { id: `f_${Date.now()}_2`, name: 'description', label: 'توضیحات', type: 'text', isRequired: false, showInTable: true },
        ],
        typeDocsMarkdown: `# مستندات و راهنمای جامع دسته ${trimmedName}\n\nدر این بخش می‌توانید راهنمای جامع، معماری و چک‌لیست‌های مربوط به این دسته را مستندسازی کنید.\n`,
      };

      setAssetTypes((prev) => [...prev, newType]);
      showToast(`دسته "${newType.name}" با موفقیت ایجاد شد.`, 'success');
      setNewTypeName('');
      setNewTypeSlug('');
      setIsAddingNewType(false);
      setActiveTypeId(newType.id);
      setAssets([]);
    }
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName.toLowerCase()) {
      case 'mail': return <Mail className="w-4 h-4" />;
      case 'globe': return <Globe className="w-4 h-4" />;
      case 'key': return <Key className="w-4 h-4" />;
      default: return <Server className="w-4 h-4" />;
    }
  };

  // اگر نیاز به راه‌اندازی اولیه باشد (در حالت دمو رد می‌شود)
  if (setupNeeded && token !== 'demo-token-preview') {
    return <SetupWizard />;
  }

  // اگر کاربر هنوز وارد نشده باشد
  if (!token && !isLoading) {
    return <LoginModal />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas text-slate-900 dark:text-slate-100 font-sans">
      {/* ۱. سایدبار ناوبری و دسته‌بندی‌ها */}
      <aside className="w-64 border-l border-slate-200 dark:border-border-subtle bg-white dark:bg-surface-1 flex flex-col justify-between shrink-0 shadow-xs">
        <div>
          {/* هدر برند */}
          <div className="h-14 border-b border-slate-200 dark:border-border-subtle flex items-center justify-between px-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm">
                دف
              </div>
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">سامانه دفتر</span>
            </div>
            <span className="text-[11px] font-mono bg-slate-100 dark:bg-surface-2 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/20 font-medium">
              v1.0
            </span>
          </div>

          {/* لیست دسته‌ها */}
          <div className="p-3">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">دسته‌بندی دارایی‌ها</span>
              {user?.role === 'ADMIN' && (
                <button
                  onClick={() => setIsAddingNewType(!isAddingNewType)}
                  className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1 rounded hover:bg-slate-100 dark:hover:bg-surface-2 transition"
                  title="افزودن دسته‌بندی جدید"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* فرم بازشونده ایجاد دسته جدید */}
            {isAddingNewType && (
              <form onSubmit={handleCreateNewType} className="p-2.5 mb-2 bg-slate-50 dark:bg-surface-2 rounded-xl space-y-2 border border-slate-200 dark:border-border-strong text-xs">
                <input
                  type="text"
                  placeholder="نام دسته (مثلاً روترها)"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  className="w-full bg-white dark:bg-surface-1 border border-slate-300 dark:border-border-subtle rounded px-2.5 py-1 text-slate-800 dark:text-slate-200"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="نامک انگلیسی (routers)"
                  value={newTypeSlug}
                  onChange={(e) => setNewTypeSlug(e.target.value)}
                  dir="ltr"
                  className="w-full bg-white dark:bg-surface-1 border border-slate-300 dark:border-border-subtle rounded px-2.5 py-1 text-slate-800 dark:text-slate-200 font-mono"
                />
                <div className="flex gap-1.5 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingNewType(false)}
                    className="px-2 py-0.5 text-slate-500 hover:text-slate-800 text-[11px]"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-2.5 py-0.5 bg-indigo-600 rounded text-white text-[11px] font-medium shadow-xs"
                  >
                    ثبت
                  </button>
                </div>
              </form>
            )}

            <nav className="space-y-1">
              {assetTypes.map((type) => {
                const isActive = activeTab === 'assets' && activeTypeId === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => {
                      setActiveTab('assets');
                      setActiveTypeId(type.id);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs dark:bg-indigo-600/15 dark:text-indigo-400 dark:border-indigo-500/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-surface-2 dark:hover:text-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {getCategoryIcon(type.icon || 'Server')}
                      <span>{type.name}</span>
                    </div>
                    {type.assetCount !== undefined && (
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-medium ${
                        isActive
                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300'
                          : 'bg-slate-100 text-slate-600 border border-slate-200/70 dark:bg-surface-2 dark:text-slate-400 dark:border-transparent'
                      }`}>
                        {type.assetCount}
                      </span>
                    )}
                  </button>
                );
              })}

              {assetTypes.length === 0 && (
                <div className="text-center py-4 text-xs text-slate-400">
                  دسته‌بندی وجود ندارد.
                </div>
              )}
            </nav>
          </div>
        </div>

        {/* بخش پایین سایدبار: ابزارهای سیستم */}
        <div className="p-3 border-t border-slate-200 dark:border-border-subtle space-y-1">
          <button
            onClick={() => setActiveTab('reminders')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === 'reminders'
                ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-xs dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-surface-2 dark:hover:text-slate-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>یادآورهای سررسید</span>
            </div>
            <span className="text-[11px] bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 px-2 py-0.5 rounded-full font-mono font-bold">
              پایش
            </span>
          </button>

          {user?.role === 'ADMIN' && (
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === 'users'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs dark:bg-indigo-600/15 dark:text-indigo-400 dark:border-indigo-500/30'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-surface-2 dark:hover:text-slate-100'
              }`}
            >
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>کاربران و دسترسی‌ها</span>
            </button>
          )}

          {user?.role === 'ADMIN' && (
            <button
              onClick={() => setActiveTab('audit')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === 'audit'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-surface-2 dark:hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>لاگ‌های ممیزی و امنیت</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                Audit
              </span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === 'settings'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs dark:bg-indigo-600/15 dark:text-indigo-400 dark:border-indigo-500/30'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-surface-2 dark:hover:text-slate-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>تنظیمات سامانه</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-surface-2 text-slate-600 dark:text-slate-400 font-mono font-bold">
              Config
            </span>
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 hover:bg-rose-50 hover:text-rose-700 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 text-xs font-medium transition mt-2"
          >
            <LogOut className="w-4 h-4" />
            <span>خروج از حساب</span>
          </button>
        </div>
      </aside>

      {/* ۲. بدنه اصلی برنامه */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* هدر بالایی */}
        <header className="h-14 border-b border-slate-200 dark:border-border-subtle bg-white/95 dark:bg-surface-1/90 backdrop-blur px-6 flex items-center justify-between shrink-0 shadow-xs">
          {/* باکس جستجوی سراسری (Ctrl + K) */}
          <div className="flex items-center gap-3 w-96">
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="w-full bg-slate-100 dark:bg-surface-2 border border-slate-200 hover:border-slate-300 dark:border-border-strong dark:hover:border-indigo-500 rounded-lg pr-9 pl-12 py-1.5 text-xs text-slate-600 dark:text-slate-300 text-right transition relative flex items-center shadow-xs"
            >
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <span>جستجوی سریع سراسری...</span>
              <kbd className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono font-medium shadow-2xs">
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* نشانگرهای سررسید، تم، ابزارها و کاربر */}
          <div className="flex items-center gap-3">
            {/* دکمه ابزار سریع تولید رمز عبور */}
            <button
              onClick={() => setIsGlobalPassModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-border-strong text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-surface-2 text-xs font-semibold transition shadow-2xs"
              title="تولیدکننده کلمه عبور و عبارت عبور تصادفی"
            >
              <KeyRound className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">تولید رمز عبور</span>
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-slate-200 dark:border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-2 transition shadow-2xs"
              title={theme === 'light' ? 'فعال‌سازی تم تیره' : 'فعال‌سازی تم روشن'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>

            <button
              onClick={() => setActiveTab('reminders')}
              className="relative p-2 rounded-lg border border-slate-200 dark:border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-2 transition shadow-2xs"
              title="مشاهده سررسیدها"
            >
              <Bell className="w-4 h-4" />
            </button>

            <div className="h-5 w-px bg-slate-200 dark:bg-border-subtle" />

            <div className="flex items-center gap-2.5 p-1 rounded-lg">
              <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-600/30 dark:border-indigo-500/40 dark:text-indigo-300 flex items-center justify-center text-xs font-bold shadow-2xs">
                {user?.fullName?.slice(0, 2) || 'کار'}
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">{user?.fullName}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  {user?.role === 'ADMIN' ? 'مدیر ارشد' : user?.role === 'EDITOR' ? 'اپراتور' : 'مشاهده‌گر'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* نمای سررسیدها */}
        {activeTab === 'reminders' && <RemindersView />}

        {/* نمای مدیریت کاربران */}
        {activeTab === 'users' && <UsersView assetTypes={assetTypes} />}

        {/* نمای لاگ‌های ممیزی و امنیت */}
        {activeTab === 'audit' && <AuditLogsView />}

        {/* نمای تنظیمات سامانه */}
        {activeTab === 'settings' && (
          <SettingsView
            assetTypes={assetTypes}
            assets={assets}
            onDataRestored={async () => {
              await loadAssetTypes();
              if (activeTypeId) {
                await loadAssets(activeTypeId);
              }
            }}
          />
        )}

        {/* نمای گرید دارایی‌ها */}
        {activeTab === 'assets' && activeAssetType && (
          <>
            {/* نوار ابزار دسته فعال و سوئیچ تب‌ها */}
            <div className="p-6 pb-0 shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="text-indigo-600 dark:text-indigo-400">
                      {getCategoryIcon(activeAssetType.icon || 'Server')}
                    </span>
                    <span>{activeAssetType.name}</span>
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {activeAssetType.description || 'مدیریت دارایی‌ها، دسترسی‌ها و مستندات این دسته‌بندی'}
                  </p>
                </div>

                {categoryViewTab === 'grid' && (
                  <div className="flex items-center gap-2.5">
                    {/* سوئیچ تراکم جدول */}
                    <div className="bg-slate-100 dark:bg-surface-2 border border-slate-200 dark:border-border-strong rounded-lg p-0.5 flex text-xs shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleDensityChange('compact')}
                        className={`px-3 py-1 rounded-md transition font-medium text-xs ${
                          density === 'compact' 
                            ? 'bg-white text-indigo-700 shadow-xs dark:bg-indigo-600 dark:text-white font-semibold' 
                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                        }`}
                        title="نمایش فشرده با تراکم بالا (مشاهده بیشترین تعداد ردیف در صفحه)"
                      >
                        فشرده
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDensityChange('comfortable')}
                        className={`px-3 py-1 rounded-md transition font-medium text-xs ${
                          density === 'comfortable' 
                            ? 'bg-white text-indigo-700 shadow-xs dark:bg-indigo-600 dark:text-white font-semibold' 
                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                        }`}
                        title="نمایش عادی با فضای تنفسی بیشتر و ارتفاع باز ردیف‌ها"
                      >
                        عادی
                      </button>
                    </div>

                    {/* دکمه‌های خروجی و ورود اکسل */}
                    <button
                      onClick={handleExportExcel}
                      disabled={assets.length === 0}
                      title={assets.length === 0 ? 'دارایی برای خروجی وجود ندارد' : 'دانلود خروجی اکسل از کلیه ردیف‌ها'}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-border-strong bg-white dark:bg-surface-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-surface-elevated hover:text-slate-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>خروجی اکسل</span>
                    </button>

                    {(user?.role === 'ADMIN' || user?.role === 'EDITOR') && (
                      <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-border-strong bg-white dark:bg-surface-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-surface-elevated hover:text-slate-900 dark:hover:text-white transition shadow-2xs"
                      >
                        <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>ورود از اکسل</span>
                      </button>
                    )}

                    {user?.role === 'ADMIN' && (
                      <button
                        onClick={() => setIsSchemaModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-border-strong bg-white dark:bg-surface-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-surface-elevated hover:text-slate-900 dark:hover:text-white transition shadow-2xs"
                      >
                        <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>تنظیم فیلدها ({activeAssetType.schemaDefinition?.length || 0})</span>
                      </button>
                    )}

                    {(user?.role === 'ADMIN' || user?.role === 'EDITOR') && (
                      <button
                        onClick={() => {
                          setSelectedAsset(null);
                          setIsDrawerOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-medium text-white shadow-xs shadow-indigo-600/20 transition"
                      >
                        <Plus className="w-4 h-4" />
                        <span>افزودن دارایی جدید</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* سوئیچر تب‌های درون دسته: دارایی‌ها و ویکی */}
              <div className="flex border-b border-slate-200 dark:border-border-subtle text-xs gap-6 -mb-px">
                <button
                  type="button"
                  onClick={() => setCategoryViewTab('grid')}
                  className={`pb-3 font-bold transition border-b-2 flex items-center gap-2 ${
                    categoryViewTab === 'grid'
                      ? 'text-indigo-600 border-indigo-600 dark:text-indigo-400 dark:border-indigo-500'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border-transparent'
                  }`}
                >
                  <Server className="w-4 h-4" />
                  <span>دارایی‌ها و رکوردهای ثبت‌شده</span>
                  <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold ${
                    categoryViewTab === 'grid'
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                      : 'bg-slate-100 dark:bg-surface-2 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-border-strong'
                  }`}>
                    {assets.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategoryViewTab('wiki')}
                  className={`pb-3 font-bold transition border-b-2 flex items-center gap-2 ${
                    categoryViewTab === 'wiki'
                      ? 'text-indigo-600 border-indigo-600 dark:text-indigo-400 dark:border-indigo-500'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border-transparent'
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>ویکی و مستندات جامع دسته</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200/60 dark:border-indigo-500/30">
                    Wiki
                  </span>
                </button>
              </div>
            </div>

            {categoryViewTab === 'grid' ? (
              /* جدول داده اکسل‌گونه پویا به همراه نوار فیلتر پیشرفته */
              <div className="flex-1 px-6 pb-6 overflow-auto pt-3 flex flex-col min-h-0">
                {/* نوار فیلترهای پیشرفته و برچسب‌ها */}
                <div className="mb-3 bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong rounded-xl p-3 shadow-2xs space-y-2.5 shrink-0">
                  {/* ردیف اول: جستجوی متنی زنده، فیلتر وضعیت سررسید، دکمه پاکسازی، و آمار */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 max-w-lg">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={filterSearch}
                          onChange={(e) => setFilterSearch(e.target.value)}
                          placeholder="جستجو در عنوان دارایی، فیلدها و برچسب‌ها..."
                          className="w-full bg-slate-50 dark:bg-surface-2 border border-slate-200 dark:border-border-strong rounded-lg pr-9 pl-8 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition"
                        />
                        {filterSearch && (
                          <button
                            onClick={() => setFilterSearch('')}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-surface-elevated text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                            title="پاک کردن متن جستجو"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* فیلتر وضعیت سررسید */}
                      <select
                        value={expiryStatusFilter}
                        onChange={(e) => setExpiryStatusFilter(e.target.value as any)}
                        className="bg-slate-50 dark:bg-surface-2 border border-slate-200 dark:border-border-strong rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition cursor-pointer font-medium"
                      >
                        <option value="all">همه وضعیت‌ها</option>
                        <option value="has_expiry">📅 دارای سررسید</option>
                        <option value="urgent">⚠️ تمدید فوری (&lt; ۳۰ روز)</option>
                        <option value="expired">🚨 منقضی‌شده</option>
                      </select>
                    </div>

                    {/* بخش آمار نتایج و دکمه پاکسازی فیلترها */}
                    <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        نمایش <strong className="text-slate-900 dark:text-white font-mono font-bold">{filteredAssets.length}</strong> از <span className="font-mono">{assets.length}</span> رکورد
                      </span>

                      {activeFiltersCount > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAllFilters}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 text-[11px] font-semibold transition shadow-2xs"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>پاکسازی فیلترها ({activeFiltersCount})</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ردیف دوم: چیپ‌های برچسب موجود در دسته جاری با شمارنده و سوئیچ AND/OR */}
                  {availableTagsWithCount.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-border-subtle flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center flex-wrap gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 ml-1">
                          <Tag className="w-3 h-3 text-indigo-500" />
                          <span>برچسب‌ها:</span>
                        </span>

                        {/* دکمه همه برچسب‌ها */}
                        <button
                          type="button"
                          onClick={() => setSelectedTags([])}
                          className={`text-[11px] px-2.5 py-0.5 rounded-md font-medium border transition ${
                            selectedTags.length === 0
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-semibold'
                              : 'bg-slate-50 dark:bg-surface-2 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-border-strong hover:bg-slate-100 dark:hover:bg-surface-elevated'
                          }`}
                        >
                          همه ({assets.length})
                        </button>

                        {/* چیپ‌های تک‌تک برچسب‌ها */}
                        {availableTagsWithCount.map(({ tag, count }) => {
                          const isSelected = selectedTags.includes(tag);
                          return (
                            <TagBadge
                              key={tag}
                              tag={tag}
                              count={count}
                              isSelected={isSelected}
                              onClick={() => handleToggleTag(tag)}
                              className="cursor-pointer"
                            />
                          );
                        })}
                      </div>

                      {/* سوئیچ منطق AND / OR هنگام انتخاب چند برچسب */}
                      {selectedTags.length > 1 && (
                        <div className="flex items-center gap-1 text-[10px] bg-slate-100 dark:bg-surface-2 p-0.5 rounded-lg border border-slate-200 dark:border-border-strong animate-in fade-in">
                          <span className="text-slate-500 px-1.5 font-medium">منطق فیلتر:</span>
                          <button
                            type="button"
                            onClick={() => setTagFilterMode('OR')}
                            className={`px-2 py-0.5 rounded font-semibold transition ${
                              tagFilterMode === 'OR'
                                ? 'bg-white dark:bg-surface-elevated text-indigo-700 dark:text-indigo-300 shadow-2xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                          >
                            یا (OR)
                          </button>
                          <button
                            type="button"
                            onClick={() => setTagFilterMode('AND')}
                            className={`px-2 py-0.5 rounded font-semibold transition ${
                              tagFilterMode === 'AND'
                                ? 'bg-white dark:bg-surface-elevated text-indigo-700 dark:text-indigo-300 shadow-2xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                          >
                            و (AND)
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* جدول داده اکسل‌گونه */}
                <div className="border border-slate-200 dark:border-border-strong rounded-xl bg-white dark:bg-surface-1 overflow-hidden shadow-xs flex-1">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className={`border-b border-slate-200 dark:border-border-strong bg-slate-50/90 dark:bg-surface-2/60 text-slate-700 dark:text-slate-300 font-semibold transition-all ${
                        density === 'compact' ? 'text-[11px]' : 'text-xs'
                      }`}>
                        <th className={`${density === 'compact' ? 'py-2 px-3' : 'py-3.5 px-4'} w-12 text-center`}>#</th>
                        <th className={density === 'compact' ? 'py-2 px-3' : 'py-3.5 px-4'}>عنوان دارایی</th>

                        {/* رندر ستون‌های داینامیک انتخاب‌شده توسط کاربر */}
                        {visibleFields.map((field) => (
                          <th key={field.id} className={density === 'compact' ? 'py-2 px-3' : 'py-3.5 px-4'}>
                            {field.label}
                          </th>
                        ))}

                        <th className={`${density === 'compact' ? 'py-2 px-3' : 'py-3.5 px-4'} w-16 text-center`}>جزئیات</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y divide-slate-200/80 dark:divide-border-subtle ${
                      density === 'compact' ? 'text-[11px]' : 'text-xs'
                    }`}>
                      {isAssetsLoading ? (
                        <tr>
                          <td
                            colSpan={visibleFields.length + 3}
                            className="p-8 text-center text-slate-500 dark:text-slate-400"
                          >
                            در حال بارگذاری اطلاعات دارایی‌ها...
                          </td>
                        </tr>
                      ) : filteredAssets.length > 0 ? (
                        filteredAssets.map((asset, index) => {
                          const cellPadding = density === 'compact' ? 'py-1.5 px-3' : 'py-3.5 px-4';
                          return (
                            <tr
                              key={asset.id}
                              onClick={() => {
                                setSelectedAsset(asset);
                                setIsDrawerOpen(true);
                              }}
                              className={`hover:bg-slate-50/90 dark:hover:bg-surface-2/60 transition-all cursor-pointer ${
                                density === 'compact' ? 'min-h-[40px]' : 'h-14'
                              }`}
                            >
                              <td className={`${cellPadding} text-center text-slate-400 dark:text-slate-500 font-mono`}>{index + 1}</td>
                              
                              {/* ستون عنوان اصلی و برچسب‌های رنگی سطر */}
                              <td className={`${cellPadding} font-semibold text-slate-900 dark:text-slate-100`}>
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span>{asset.title}</span>
                                      {(() => {
                                        const rels = (asset.values as any)?.__relations || asset.relations;
                                        const count = Array.isArray(rels) ? rels.length : 0;
                                        if (count === 0) return null;
                                        return (
                                          <span
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                                            title={`${count} ارتباط و وابستگی ثبت‌شده`}
                                          >
                                            <Network className="w-2.5 h-2.5" />
                                            <span>{count}</span>
                                          </span>
                                        );
                                      })()}
                                    </div>
                                  {asset.tags && asset.tags.length > 0 && (
                                    <div className="flex items-center flex-wrap gap-1">
                                      {asset.tags.map((t) => (
                                        <TagBadge
                                          key={t}
                                          tag={t}
                                          size="xs"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSingleTagFilter(t);
                                          }}
                                          isSelected={selectedTags.includes(t)}
                                          title={`کلیک برای فیلتر بر اساس «${t}»`}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* سلول‌های مقادیر بر اساس ستون‌های انتخابی */}
                              {visibleFields.map((field) => {
                                const val = asset.values?.[field.name];
                                const cellId = `${asset.id}-${field.name}`;
                                const isCopyable = Boolean(field.isCopyable);

                                if (field.type === 'secret') {
                                  return (
                                    <td key={field.id} className={cellPadding}>
                                      <SecretCell assetId={asset.id} fieldKey={field.name} />
                                    </td>
                                  );
                                }

                                if (field.type === 'ip_port') {
                                  return (
                                    <td key={field.id} className={cellPadding}>
                                      {val ? (
                                        <div className="inline-flex items-center gap-1.5">
                                          {isCopyable && (
                                            <button
                                              onClick={(e) => handleCopy(String(val), cellId, e)}
                                              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-surface-elevated text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition shrink-0"
                                              title={`کپی ${field.label}`}
                                            >
                                              {copiedCellId === cellId ? (
                                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                              ) : (
                                                <Copy className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
                                              )}
                                            </button>
                                          )}
                                          <span dir="ltr" className={`font-mono font-medium rounded bg-slate-100 text-slate-800 border border-slate-200/90 dark:bg-surface-2 dark:text-indigo-300 dark:border-border-strong ${
                                            density === 'compact' ? 'text-[11px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1'
                                          }`}>
                                            {val}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 dark:text-slate-600">—</span>
                                      )}
                                    </td>
                                  );
                                }

                                if (field.type === 'jalali_date') {
                                  return (
                                    <td key={field.id} className={cellPadding}>
                                      {val ? (
                                        <div className="inline-flex items-center gap-1.5">
                                          {isCopyable && (
                                            <button
                                              onClick={(e) => handleCopy(String(val), cellId, e)}
                                              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-surface-elevated text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition shrink-0"
                                              title={`کپی ${field.label}`}
                                            >
                                              {copiedCellId === cellId ? (
                                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                              ) : (
                                                <Copy className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
                                              )}
                                            </button>
                                          )}
                                          <span className={`inline-flex items-center rounded-md font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30 ${
                                            density === 'compact' ? 'text-[10px] px-1.5 py-0.5' : 'text-[11px] px-2.5 py-1'
                                          }`}>
                                            {val}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 dark:text-slate-600">—</span>
                                      )}
                                    </td>
                                  );
                                }

                                return (
                                  <td key={field.id} className={`${cellPadding} text-slate-700 dark:text-slate-300`}>
                                    {val ? (
                                      <div className="inline-flex items-center gap-1.5 max-w-full">
                                        {isCopyable && (
                                          <button
                                            onClick={(e) => handleCopy(String(val), cellId, e)}
                                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-surface-elevated text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition shrink-0"
                                            title={`کپی ${field.label}`}
                                          >
                                            {copiedCellId === cellId ? (
                                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                            ) : (
                                              <Copy className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
                                            )}
                                          </button>
                                        )}
                                        <span className="truncate">{val}</span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 dark:text-slate-600">—</span>
                                    )}
                                  </td>
                                );
                              })}

                              <td className={`${cellPadding} text-center`}>
                                <ExternalLink className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 inline" />
                              </td>
                            </tr>
                          );
                        })
                      ) : assets.length > 0 ? (
                        /* وضعیت زمانی که دارایی وجود دارد اما با فیلترها تطابق ندارد */
                        <tr>
                          <td
                            colSpan={visibleFields.length + 3}
                            className="p-12 text-center text-slate-500 dark:text-slate-400"
                          >
                            <div className="max-w-xs mx-auto space-y-2">
                              <Filter className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
                              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                دارایی‌ای مطابق با فیلترهای انتخابی یافت نشد
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                لطفاً عبارت جستجو را تغییر دهید یا فیلترهای برچسب را پاکسازی کنید.
                              </p>
                              <button
                                onClick={handleClearAllFilters}
                                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-600/20 dark:hover:bg-indigo-600/30 dark:text-indigo-300 text-xs font-semibold border border-indigo-200 dark:border-indigo-500/30 transition shadow-2xs"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>پاکسازی فیلترها</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        /* وضعیت عدم وجود هرگونه دارایی در دسته */
                        <tr>
                          <td
                            colSpan={visibleFields.length + 3}
                            className="p-12 text-center text-slate-500 dark:text-slate-400"
                          >
                            <div className="max-w-xs mx-auto space-y-3">
                              <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                هنوز هیچ دارایی در دسته «{activeAssetType.name}» ثبت نشده است.
                              </div>
                              {(user?.role === 'ADMIN' || user?.role === 'EDITOR') && (
                                <div className="flex items-center justify-center gap-2 pt-1">
                                  <button
                                    onClick={() => {
                                      setSelectedAsset(null);
                                      setIsDrawerOpen(true);
                                    }}
                                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs shadow-indigo-600/20 transition"
                                  >
                                    ثبت اولین {activeAssetType.name}
                                  </button>
                                  <button
                                    onClick={() => setIsImportModalOpen(true)}
                                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-border-strong bg-white dark:bg-surface-2 hover:bg-slate-50 dark:hover:bg-surface-elevated text-xs font-semibold text-slate-700 dark:text-slate-200 transition shadow-2xs"
                                  >
                                    <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span>بارگذاری از اکسل</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* تب ویکی و مستندات مارکداون در سطح دسته */
              <CategoryWikiView
                assetType={activeAssetType}
                onUpdateWiki={handleUpdateWiki}
              />
            )}
          </>
        )}
      </div>

      {/* کشوی بازشونده مشخصات و مستندات */}
      {isDrawerOpen && activeAssetType && (
        <AssetDrawer
          asset={selectedAsset}
          assetType={activeAssetType}
          onClose={() => setIsDrawerOpen(false)}
          onSelectAsset={(targetId) => {
            const found = assets.find((a) => a.id === targetId);
            if (found) {
              setSelectedAsset(found);
            } else {
              try {
                const demoAssetsStr = localStorage.getItem('daftar_demo_assets');
                if (demoAssetsStr) {
                  const list: Asset[] = JSON.parse(demoAssetsStr);
                  const inDemo = list.find((a) => a.id === targetId);
                  if (inDemo) {
                    setSelectedAsset(inDemo);
                    const t = assetTypes.find((x) => x.id === inDemo.assetTypeId);
                    if (t) setActiveTypeId(t.id);
                  }
                }
              } catch {}
            }
          }}
          onSaved={(savedAsset) => {
            setAssets((prev) => {
              const exists = prev.some((a) => a.id === savedAsset.id);
              const updatedList = exists
                ? prev.map((a) => (a.id === savedAsset.id ? savedAsset : a))
                : [savedAsset, ...prev];
              try {
                localStorage.setItem('daftar_demo_assets', JSON.stringify(updatedList));
              } catch {}
              return updatedList;
            });
            setAssetTypes((prev) =>
              prev.map((t) =>
                t.id === activeAssetType.id
                  ? { ...t, assetCount: (t.assetCount || 0) + (selectedAsset ? 0 : 1) }
                  : t
              )
            );
          }}
          onDeleted={(deletedId) => {
            setAssets((prev) => prev.filter((a) => a.id !== deletedId));
            setAssetTypes((prev) =>
              prev.map((t) =>
                t.id === activeAssetType.id
                  ? { ...t, assetCount: Math.max(0, (t.assetCount || 1) - 1) }
                  : t
              )
            );
          }}
        />
      )}

      {/* مودال تنظیم ساختار فیلدهای داینامیک */}
      {isSchemaModalOpen && activeAssetType && (
        <SchemaBuilderModal
          assetType={activeAssetType}
          onClose={() => setIsSchemaModalOpen(false)}
          onSaved={(updated) => {
            setAssetTypes(assetTypes.map((t) => (t.id === updated.id ? updated : t)));
            loadAssets(updated.id);
          }}
        />
      )}

      {/* مودال بارگذاری دسته‌ای اکسل */}
      {isImportModalOpen && activeAssetType && (
        <ExcelImportModal
          isOpen={isImportModalOpen}
          assetType={activeAssetType}
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleBatchImport}
        />
      )}

      {/* پنجره فرمان جستجوی سراسری (Ctrl + K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        assetTypes={assetTypes}
        currentAssets={assets}
        onSelectAsset={(asset) => {
          setActiveTab('assets');
          setActiveTypeId(asset.assetTypeId);
          setSelectedAsset(asset);
          setIsDrawerOpen(true);
        }}
      />

      {/* مودال سراسری تولید کلمه عبور پیشرفته */}
      <PasswordGeneratorModal
        isOpen={isGlobalPassModalOpen}
        onClose={() => setIsGlobalPassModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <SettingsProvider>
          <AppContent />
        </SettingsProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
