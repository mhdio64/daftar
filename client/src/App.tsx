import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { ToastProvider, useToast } from './context/ToastContext.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { SettingsProvider, useSettings } from './context/SettingsContext.tsx';

import { LoginModal } from './components/common/LoginModal.tsx';
import { IconPickerModal } from './components/common/IconPickerModal.tsx';
import { AppSidebar, ActiveTab } from './components/layout/AppSidebar.tsx';
import { AppHeader } from './components/layout/AppHeader.tsx';
import { AssetGridView } from './components/grid/AssetGridView.tsx';

import { assetTypesService, AssetType } from './services/asset-types.service.ts';
import { assetsService, Asset } from './services/assets.service.ts';
import type { ParsedRow } from './services/excel.service.ts';
import { DEFAULT_ASSET_TYPES, getAllSampleAssets } from './data/sample-assets.ts';

import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';
import { ExecutiveDashboardView } from './components/dashboard/ExecutiveDashboardView.tsx';
import { RemindersView } from './components/reminders/RemindersView.tsx';
import { UsersView } from './components/users/UsersView.tsx';
import { AuditLogsView } from './components/audit/AuditLogsView.tsx';
import { SettingsView } from './components/settings/SettingsView.tsx';

// بارگذاری تنبل فقط برای ویوها و ابزارهای واقعاً سنگین (مودال‌ها)
const SetupWizard = lazy(() => import('./components/common/SetupWizard.tsx').then((m) => ({ default: m.SetupWizard })));
const AssetDrawer = lazy(() => import('./components/drawer/AssetDrawer.tsx').then((m) => ({ default: m.AssetDrawer })));
const SchemaBuilderModal = lazy(() => import('./components/forms/SchemaBuilderModal.tsx').then((m) => ({ default: m.SchemaBuilderModal })));
const CommandPalette = lazy(() => import('./components/common/CommandPalette.tsx').then((m) => ({ default: m.CommandPalette })));
const PasswordGeneratorModal = lazy(() => import('./components/modals/PasswordGeneratorModal.tsx').then((m) => ({ default: m.PasswordGeneratorModal })));
const AssetQrScannerModal = lazy(() => import('./components/common/AssetQrScannerModal.tsx').then((m) => ({ default: m.AssetQrScannerModal })));
const UserProfileModal = lazy(() => import('./components/profile/UserProfileModal.tsx').then((m) => ({ default: m.UserProfileModal })));

function AppContent() {
  const { user, token, setupNeeded, isLoading, logout } = useAuth();
  const { showToast } = useToast();
  const { settings, updateSettings } = useSettings();

  // ناوبری و تب‌های اصلی
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [activeTypeId, setActiveTypeId] = useState<string | null>(null);

  const activeAssetType = assetTypes.find((t) => t.id === activeTypeId);

  // فیلدهای قابل نمایش در جدول بر اساس تنظیمات بخش «تنظیم فیلدها»
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
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isAddingNewType, setIsAddingNewType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeSlug, setNewTypeSlug] = useState('');
  const [newTypeIcon, setNewTypeIcon] = useState('Server');
  const [isTypeIconPickerOpen, setIsTypeIconPickerOpen] = useState(false);
  const [typeBeingEditedForIcon, setTypeBeingEditedForIcon] = useState<AssetType | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const avatarBgMap: Record<string, string> = {
    indigo: 'bg-indigo-600',
    emerald: 'bg-emerald-600',
    violet: 'bg-violet-600',
    amber: 'bg-amber-600',
    cyan: 'bg-cyan-600',
    rose: 'bg-rose-600',
  };
  const userAvatarColor = user?.preferences?.avatarColor || settings.avatarColor || 'indigo';
  const avatarBgClass = avatarBgMap[userAvatarColor] || 'bg-indigo-600';

  const density = settings.defaultDensity;
  const handleDensityChange = (d: 'compact' | 'comfortable') => {
    updateSettings({ defaultDensity: d });
  };

  const theme = settings.theme;
  const toggleTheme = () => {
    updateSettings({ theme: theme === 'light' ? 'dark' : 'light' });
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
    } catch {}

    // بررسی آیا دسته‌بندی‌ها در localStorage ذخیره شده‌اند
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

    setAssetTypes(DEFAULT_ASSET_TYPES);
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
    } catch {}

    // بررسی آیا دارایی‌ها در localStorage ذخیره شده‌اند
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

    // تولید داده‌های نمونه برای پیش‌نمایش
    const sampleAssets = getAllSampleAssets(assetTypes).filter((a) => a.assetTypeId === typeId);
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

  // جستجو و باز کردن مشخصات دارایی بر اساس شناسه یا بارکد
  const openAssetById = async (targetId: string) => {
    let cleanId = targetId.trim();
    if (cleanId.startsWith('DFT-')) {
      cleanId = cleanId.replace(/^DFT-/, '');
    }

    const ID_ALIASES: Record<string, string> = {
      'demo-dom-1': 'dom-1',
      'demo-vps-main': 'vps-1',
      'demo-vps-1': 'vps-1',
      'demo-em-1': 'em-1',
    };
    if (ID_ALIASES[cleanId]) {
      cleanId = ID_ALIASES[cleanId];
    }

    // ۱. بررسی در استیت جاری
    const foundInState = assets.find((a) => a.id.toLowerCase() === cleanId.toLowerCase());
    if (foundInState) {
      setActiveTab('assets');
      setActiveTypeId(foundInState.assetTypeId);
      setSelectedAsset(foundInState);
      setIsDrawerOpen(true);
      showToast(`شناسنامه دارایی «${foundInState.title}» باز شد.`, 'success');
      return;
    }

    // ۲. بررسی در لیست کامل نمونه‌های سیستم
    const allSamples = getAllSampleAssets(assetTypes);
    const foundInSamples = allSamples.find((a) => a.id.toLowerCase() === cleanId.toLowerCase());
    if (foundInSamples) {
      setActiveTab('assets');
      setActiveTypeId(foundInSamples.assetTypeId);
      setSelectedAsset(foundInSamples);
      setIsDrawerOpen(true);
      showToast(`شناسنامه دارایی «${foundInSamples.title}» باز شد.`, 'success');
      return;
    }

    // ۳. بررسی از API
    try {
      const apiAsset = await assetsService.getById(cleanId);
      if (apiAsset && apiAsset.id) {
        setActiveTab('assets');
        if (apiAsset.assetTypeId) {
          setActiveTypeId(apiAsset.assetTypeId);
        }
        setSelectedAsset(apiAsset);
        setIsDrawerOpen(true);
        showToast(`شناسنامه دارایی «${apiAsset.title}» باز شد.`, 'success');
        return;
      }
    } catch {}

    // ۴. بررسی در localStorage
    try {
      const stored = localStorage.getItem('daftar_demo_assets');
      if (stored) {
        const list: Asset[] = JSON.parse(stored);
        const inDemo = list.find((a) => a.id.toLowerCase() === cleanId.toLowerCase());
        if (inDemo) {
          setActiveTab('assets');
          setActiveTypeId(inDemo.assetTypeId);
          setSelectedAsset(inDemo);
          setIsDrawerOpen(true);
          showToast(`شناسنامه دارایی «${inDemo.title}» باز شد.`, 'success');
          return;
        }
      }
    } catch {}

    showToast(`دارایی با بارکد یا شناسه «${cleanId}» یافت نشد.`, 'error');
  };

  // پشتیبانی از باز کردن مستقیم دارایی از طریق Deep Link (?assetId=... یا ?asset=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const assetParam = params.get('assetId') || params.get('asset');
    if (assetParam) {
      const timer = setTimeout(() => {
        openAssetById(assetParam);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [assetTypes.length]);

  // ثبت دسته جدید
  const handleCreateNewType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim() || !newTypeSlug.trim()) return;

    const trimmedName = newTypeName.trim();
    const trimmedSlug = newTypeSlug.trim().toLowerCase();
    const chosenIcon = newTypeIcon || 'Server';

    try {
      const created = await assetTypesService.create({
        name: trimmedName,
        slug: trimmedSlug,
        icon: chosenIcon,
        schemaDefinition: [],
      });
      showToast(`دسته "${created.name}" با موفقیت ایجاد شد.`, 'success');
      setNewTypeName('');
      setNewTypeSlug('');
      setNewTypeIcon('Server');
      setIsAddingNewType(false);
      await loadAssetTypes();
      setActiveTypeId(created.id);
    } catch (err: any) {
      console.warn('API create asset type unreachable, creating locally in demo mode:', err);
      const newType: AssetType = {
        id: trimmedSlug || `type_${Date.now()}`,
        name: trimmedName,
        slug: trimmedSlug,
        icon: chosenIcon,
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
      setNewTypeIcon('Server');
      setIsAddingNewType(false);
      setActiveTypeId(newType.id);
      setAssets([]);
    }
  };

  // به‌روزرسانی مستقیم آیکون یک نوع دارایی
  const handleUpdateAssetTypeIcon = async (targetType: AssetType, newIcon: string) => {
    try {
      await assetTypesService.update(targetType.id, {
        name: targetType.name,
        icon: newIcon,
      });
      setAssetTypes((prev) => prev.map((t) => (t.id === targetType.id ? { ...t, icon: newIcon } : t)));
      showToast(`آیکون نوع دارایی «${targetType.name}» به‌روزرسانی شد.`, 'success');
    } catch (err: any) {
      console.warn('API update asset type unreachable, updating locally:', err);
      setAssetTypes((prev) => prev.map((t) => (t.id === targetType.id ? { ...t, icon: newIcon } : t)));
      showToast(`آیکون نوع دارایی «${targetType.name}» به‌روزرسانی شد.`, 'success');
    }
  };

  // ورود دسته‌ای دارایی‌ها از فایل اکسل
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
  const handleUpdateWiki = async (typeId: string, updatedMarkdown: string) => {
    try {
      await assetTypesService.updateWiki(typeId, updatedMarkdown);
      setAssetTypes((prev) =>
        prev.map((t) => (t.id === typeId ? { ...t, typeDocsMarkdown: updatedMarkdown } : t))
      );
    } catch {
      setAssetTypes((prev) =>
        prev.map((t) => (t.id === typeId ? { ...t, typeDocsMarkdown: updatedMarkdown } : t))
      );
    }
  };

  if (setupNeeded && token !== 'demo-token-preview') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-indigo-400 text-xs">در حال بارگذاری ویزارد...</div>}>
        <SetupWizard />
      </Suspense>
    );
  }

  if (!token && !isLoading) {
    return <LoginModal />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas text-slate-900 dark:text-slate-100 font-sans">
      {/* ۱. سایدبار ناوبری و دسته‌بندی‌ها */}
      <AppSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        assetTypes={assetTypes}
        activeTypeId={activeTypeId}
        onSelectAssetType={(id) => setActiveTypeId(id)}
        userRole={user?.role}
        onLogout={logout}
        isAddingNewType={isAddingNewType}
        setIsAddingNewType={setIsAddingNewType}
        newTypeName={newTypeName}
        setNewTypeName={setNewTypeName}
        newTypeSlug={newTypeSlug}
        setNewTypeSlug={setNewTypeSlug}
        newTypeIcon={newTypeIcon}
        setNewTypeIcon={setNewTypeIcon}
        onOpenIconGallery={() => {
          setTypeBeingEditedForIcon(null);
          setIsTypeIconPickerOpen(true);
        }}
        onCreateNewType={handleCreateNewType}
      />

      {/* ۲. بدنه اصلی برنامه */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* هدر بالایی */}
        <AppHeader
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenQrScanner={() => setIsQrScannerOpen(true)}
          onOpenPasswordGenerator={() => setIsGlobalPassModalOpen(true)}
          theme={theme}
          toggleTheme={toggleTheme}
          onNavigateToReminders={() => setActiveTab('reminders')}
          user={user}
          avatarBgClass={avatarBgClass}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
          onLogout={logout}
        />

        {/* نماهای اصلی سامانه به صورت ماژولار با حفاظ امنیتی خطا */}
        <ErrorBoundary fallbackTitle="خطا در بارگذاری بخش انتخاب‌شده">
          <Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center p-16 text-slate-400">
                <div className="flex items-center gap-2.5 text-xs font-medium">
                  <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span>در حال بارگذاری...</span>
                </div>
              </div>
            }
          >
            {/* نمای داشبورد آماری و مدیریتی دارایی‌ها */}
            {activeTab === 'dashboard' && (
              <ExecutiveDashboardView
                assetTypes={assetTypes}
                onNavigateToCategory={(typeId) => {
                  setActiveTypeId(typeId);
                  setActiveTab('assets');
                }}
                onSelectAsset={(asset) => {
                  setSelectedAsset(asset);
                  setIsDrawerOpen(true);
                }}
              />
            )}

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
          </Suspense>
        </ErrorBoundary>


        {/* نمای گرید دارایی‌ها و دسته فعال */}
        {activeTab === 'assets' && activeAssetType && (
          <AssetGridView
            activeAssetType={activeAssetType}
            assets={assets}
            isAssetsLoading={isAssetsLoading}
            visibleFields={visibleFields}
            assetTypes={assetTypes}
            allOrgAssets={getAllSampleAssets(assetTypes)}
            userRole={user?.role}
            density={density}
            onDensityChange={handleDensityChange}
            onSelectAsset={(asset) => {
              setSelectedAsset(asset);
              setIsDrawerOpen(true);
            }}
            onAddNewAsset={() => {
              setSelectedAsset(null);
              setIsDrawerOpen(true);
            }}
            onBatchImport={handleBatchImport}
            onOpenSchemaModal={() => setIsSchemaModalOpen(true)}
            onChangeTypeIcon={(type) => {
              setTypeBeingEditedForIcon(type);
              setIsTypeIconPickerOpen(true);
            }}
            onUpdateWiki={(typeId, markdown) => handleUpdateWiki(typeId, markdown)}
          />
        )}
      </div>

      {/* کشوی بازشونده مشخصات و مستندات و سایر مدال‌های سراسری سامانه با لود تنبل */}
      <Suspense fallback={null}>
        {isDrawerOpen && activeAssetType && (
          <AssetDrawer
            asset={selectedAsset}
            assetType={activeAssetType}
            onClose={() => setIsDrawerOpen(false)}
            onSelectAsset={(targetId) => {
              openAssetById(targetId);
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

        {/* مودال اسکنر بارکد و QR اموال */}
        <AssetQrScannerModal
          isOpen={isQrScannerOpen}
          onClose={() => setIsQrScannerOpen(false)}
          onScanSuccess={(scannedId) => {
            openAssetById(scannedId);
          }}
        />

        {/* مدال جامع پروفایل و شخصی‌سازی‌های کاربر */}
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          assetTypes={assetTypes}
        />

        {/* مودال انتخاب یا تغییر آیکون نوع دارایی */}
        <IconPickerModal
          isOpen={isTypeIconPickerOpen}
          title={typeBeingEditedForIcon ? `تغییر آیکون نوع دارایی «${typeBeingEditedForIcon.name}»` : 'انتخاب آیکون نوع دارایی جدید'}
          description="یک آیکون شاخص از میان بیش از ۴۰ گزینه تخصصی شبکه و زیرساخت برای این نوع دارایی انتخاب کنید."
          currentIcon={typeBeingEditedForIcon ? typeBeingEditedForIcon.icon : newTypeIcon}
          defaultCategoryIcon="Server"
          showResetToDefault={false}
          onSelect={(chosenIcon) => {
            const iconToSet = chosenIcon || 'Server';
            if (typeBeingEditedForIcon) {
              handleUpdateAssetTypeIcon(typeBeingEditedForIcon, iconToSet);
              setTypeBeingEditedForIcon(null);
            } else {
              setNewTypeIcon(iconToSet);
            }
          }}
          onClose={() => {
            setIsTypeIconPickerOpen(false);
            setTypeBeingEditedForIcon(null);
          }}
        />
      </Suspense>
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
