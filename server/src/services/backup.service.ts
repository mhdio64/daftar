import { prisma } from './prisma.service.js';
import { logAudit } from './audit.service.js';

export interface BackupBundle {
  version: string;
  system: string;
  createdAt: string;
  stats: {
    assetTypesCount: number;
    assetsCount: number;
    usersCount: number;
  };
  assetTypes: Array<{
    id: string;
    name: string;
    slug: string;
    icon: string;
    description: string | null;
    schemaDefinition: any;
    typeDocsMarkdown: string | null;
    displayOrder: number;
  }>;
  assets: Array<{
    id: string;
    assetTypeId: string;
    title: string;
    values: any;
    encryptedValues: any;
    expiryDate: string | null;
    docsMarkdown: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  users?: Array<{
    id: string;
    username: string;
    fullName: string;
    role: string;
    categoryPermissions: any;
    isActive: boolean;
  }>;
}

export const backupService = {
  /**
   * ایجاد پکیج کامل پشتیبان از اطلاعات سامانه
   */
  async createBackupBundle(userId: string, options: { includeUsers?: boolean } = {}): Promise<BackupBundle> {
    const [assetTypes, assets, users] = await Promise.all([
      prisma.assetType.findMany({
        orderBy: { displayOrder: 'asc' },
      }),
      prisma.asset.findMany({
        orderBy: { createdAt: 'desc' },
      }),
      options.includeUsers
        ? prisma.user.findMany({
            select: {
              id: true,
              username: true,
              fullName: true,
              role: true,
              categoryPermissions: true,
              isActive: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const bundle: BackupBundle = {
      version: '1.0.0',
      system: 'Daftar Asset Management',
      createdAt: new Date().toISOString(),
      stats: {
        assetTypesCount: assetTypes.length,
        assetsCount: assets.length,
        usersCount: users.length,
      },
      assetTypes: assetTypes.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        icon: t.icon,
        description: t.description,
        schemaDefinition: t.schemaDefinition,
        typeDocsMarkdown: t.typeDocsMarkdown,
        displayOrder: t.displayOrder,
      })),
      assets: assets.map((a) => ({
        id: a.id,
        assetTypeId: a.assetTypeId,
        title: a.title,
        values: a.values,
        encryptedValues: a.encryptedValues,
        expiryDate: a.expiryDate ? a.expiryDate.toISOString() : null,
        docsMarkdown: a.docsMarkdown,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
      users: options.includeUsers ? (users as any) : undefined,
    };

    await logAudit({
      userId,
      action: 'EXPORT_BACKUP',
      targetEntity: 'System',
      targetId: 'backup',
      diff: {
        assetTypesCount: assetTypes.length,
        assetsCount: assets.length,
      },
    });

    return bundle;
  },

  /**
   * بازیابی اطلاعات از بسته پشتیبان
   */
  async restoreBackupBundle(
    userId: string,
    bundle: BackupBundle,
    options: { mode: 'clean' | 'merge' } = { mode: 'clean' }
  ): Promise<{ restoredTypesCount: number; restoredAssetsCount: number }> {
    if (!bundle || !Array.isArray(bundle.assetTypes) || !Array.isArray(bundle.assets)) {
      throw new Error('ساختار فایل پشتیبان نامعتبر است.');
    }

    return await prisma.$transaction(async (tx) => {
      if (options.mode === 'clean') {
        // حذف ترنزکشنال دارایی‌ها و دسته‌های قبلی
        await tx.asset.deleteMany({});
        await tx.assetType.deleteMany({});
      }

      let restoredTypesCount = 0;
      let restoredAssetsCount = 0;

      // ۱. بازسازی یا به‌روزرسانی دسته‌بندی‌ها
      for (const type of bundle.assetTypes) {
        if (options.mode === 'clean') {
          await tx.assetType.create({
            data: {
              id: type.id,
              name: type.name,
              slug: type.slug,
              icon: type.icon || 'Server',
              description: type.description,
              schemaDefinition: type.schemaDefinition || [],
              typeDocsMarkdown: type.typeDocsMarkdown,
              displayOrder: type.displayOrder || 0,
            },
          });
          restoredTypesCount++;
        } else {
          // در حالت ادغام
          await tx.assetType.upsert({
            where: { slug: type.slug },
            update: {
              name: type.name,
              icon: type.icon || 'Server',
              description: type.description,
              schemaDefinition: type.schemaDefinition || [],
              typeDocsMarkdown: type.typeDocsMarkdown,
              displayOrder: type.displayOrder || 0,
            },
            create: {
              id: type.id,
              name: type.name,
              slug: type.slug,
              icon: type.icon || 'Server',
              description: type.description,
              schemaDefinition: type.schemaDefinition || [],
              typeDocsMarkdown: type.typeDocsMarkdown,
              displayOrder: type.displayOrder || 0,
            },
          });
          restoredTypesCount++;
        }
      }

      // ۲. بازسازی یا به‌روزرسانی دارایی‌ها
      for (const asset of bundle.assets) {
        // اطمینان از وجود دسته‌بندی متناظر
        const typeExists = await tx.assetType.findUnique({
          where: { id: asset.assetTypeId },
        });

        if (!typeExists) continue;

        if (options.mode === 'clean') {
          await tx.asset.create({
            data: {
              id: asset.id,
              assetTypeId: asset.assetTypeId,
              title: asset.title,
              values: asset.values || {},
              encryptedValues: asset.encryptedValues || {},
              expiryDate: asset.expiryDate ? new Date(asset.expiryDate) : null,
              docsMarkdown: asset.docsMarkdown,
              createdById: userId,
              updatedById: userId,
              createdAt: asset.createdAt ? new Date(asset.createdAt) : new Date(),
              updatedAt: asset.updatedAt ? new Date(asset.updatedAt) : new Date(),
            },
          });
          restoredAssetsCount++;
        } else {
          await tx.asset.upsert({
            where: { id: asset.id },
            update: {
              title: asset.title,
              values: asset.values || {},
              encryptedValues: asset.encryptedValues || {},
              expiryDate: asset.expiryDate ? new Date(asset.expiryDate) : null,
              docsMarkdown: asset.docsMarkdown,
              updatedById: userId,
              updatedAt: new Date(),
            },
            create: {
              id: asset.id,
              assetTypeId: asset.assetTypeId,
              title: asset.title,
              values: asset.values || {},
              encryptedValues: asset.encryptedValues || {},
              expiryDate: asset.expiryDate ? new Date(asset.expiryDate) : null,
              docsMarkdown: asset.docsMarkdown,
              createdById: userId,
              updatedById: userId,
              createdAt: asset.createdAt ? new Date(asset.createdAt) : new Date(),
              updatedAt: asset.updatedAt ? new Date(asset.updatedAt) : new Date(),
            },
          });
          restoredAssetsCount++;
        }
      }

      await logAudit({
        userId,
        action: 'RESTORE_BACKUP',
        targetEntity: 'System',
        targetId: 'restore',
        diff: {
          mode: options.mode,
          restoredTypesCount,
          restoredAssetsCount,
        },
      });

      return { restoredTypesCount, restoredAssetsCount };
    });
  },
};
