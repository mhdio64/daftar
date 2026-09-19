import { PrismaClient, Role } from '@prisma/client';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

async function main() {
  console.log('🌱 شروع بارگذاری داده‌های پیش‌فرض سامانه دفتر...');

  // ۱. ایجاد مدیر ارشد پیش‌فرض
  const existingAdmin = await prisma.user.findFirst({
    where: { role: Role.ADMIN },
  });

  let adminUser = existingAdmin;
  if (!existingAdmin) {
    adminUser = await prisma.user.create({
      data: {
        username: 'admin',
        fullName: 'مدیر کل سیستم',
        passwordHash: hashPassword('admin123456'),
        role: Role.ADMIN,
        categoryPermissions: [],
        isActive: true,
      },
    });
    console.log('✅ حساب کاربری مدیر ارشد پیش‌فرض (admin / admin123456) ایجاد شد.');
  }

  // ۲. تعریف انواع دارایی‌های استاندارد اولیه
  const defaultTypes = [
    {
      name: 'سرورهای مجازی (VPS)',
      slug: 'vps',
      icon: 'Server',
      description: 'مدیریت آدرس‌های IP، مشخصات SSH، پسوردهای Root و راهنمای سرورها',
      displayOrder: 1,
      typeDocsMarkdown: `# 📖 راهنمای جامع اتصال و نگهداری سرورها\n\n- برای اتصال امن از کلید SSH اختصاصی استفاده کنید.\n- پورت‌های غیرضروری را با \`ufw\` مسدود نمایید.\n- قبل از هرگونه آپدیت پکیج‌ها، اسنپ‌شات تهیه کنید.`,
      schemaDefinition: [
        { id: 'f_ip', name: 'ip_address', label: 'آدرس IP', type: 'ip_port', isRequired: true, showInTable: true, order: 1 },
        { id: 'f_ssh', name: 'ssh_port', label: 'پورت SSH', type: 'text', isRequired: false, showInTable: true, order: 2 },
        { id: 'f_user', name: 'root_user', label: 'نام کاربری', type: 'text', isRequired: true, showInTable: true, order: 3 },
        { id: 'f_pass', name: 'root_password', label: 'رمز عبور Root', type: 'secret', isRequired: true, isSecret: true, showInTable: true, order: 4 },
        { id: 'f_os', name: 'os_type', label: 'سیستم عامل', type: 'select', options: ['Ubuntu 24.04', 'Ubuntu 22.04', 'Debian 12', 'Rocky Linux 9', 'Windows Server 2022'], isRequired: false, showInTable: true, order: 5 },
        { id: 'f_exp', name: 'expiry_date', label: 'تاریخ سررسید تمدید', type: 'jalali_date', isRequired: false, showInTable: true, order: 6 },
      ],
    },
    {
      name: 'ایمیل‌های سازمانی',
      slug: 'email',
      icon: 'Mail',
      description: 'آدرس‌های ایمیل رسمی همکاران، پسوردها و تنظیمات وب‌میل',
      displayOrder: 2,
      typeDocsMarkdown: `# ✉️ راهنمای تنظیم کلاینت‌های ایمیل\n\n- سرور ورودی (IMAP): \`mail.company.local\` پورت 993 با SSL\n- سرور خروجی (SMTP): \`mail.company.local\` پورت 465 با SSL`,
      schemaDefinition: [
        { id: 'f_email', name: 'email_address', label: 'آدرس ایمیل', type: 'text', isRequired: true, showInTable: true, order: 1 },
        { id: 'f_epass', name: 'password', label: 'رمز عبور ایمیل', type: 'secret', isRequired: true, isSecret: true, showInTable: true, order: 2 },
        { id: 'f_dept', name: 'department', label: 'واحد سازمانی', type: 'select', options: ['فنی و IT', 'مالی و اداری', 'فروش و بازاریابی', 'پشتیبانی', 'مدیریت'], isRequired: false, showInTable: true, order: 3 },
        { id: 'f_quota', name: 'storage_quota', label: 'سقف فضا', type: 'text', isRequired: false, showInTable: true, order: 4 },
      ],
    },
    {
      name: 'دامنه‌ها و DNS',
      slug: 'domains',
      icon: 'Globe',
      description: 'اطلاعات دامنه‌های اینترنتی، ثبت‌کننده‌ها و تاریخ انقضا',
      displayOrder: 3,
      schemaDefinition: [
        { id: 'f_dom', name: 'domain_name', label: 'نام دامنه', type: 'text', isRequired: true, showInTable: true, order: 1 },
        { id: 'f_reg', name: 'registrar', label: 'شرکت ثبت‌کننده', type: 'text', isRequired: true, showInTable: true, order: 2 },
        { id: 'f_dns', name: 'dns_provider', label: 'سرویس‌دهنده DNS', type: 'text', isRequired: false, showInTable: true, order: 3 },
        { id: 'f_dexp', name: 'expiry_date', label: 'تاریخ سررسید انقضا', type: 'jalali_date', isRequired: true, showInTable: true, order: 4 },
      ],
    },
    {
      name: 'لایسنس نرم‌افزارها',
      slug: 'licenses',
      icon: 'Key',
      description: 'کلیدهای فعال‌سازی نرم‌افزارها، ابزارهای ابری و اشتراک‌ها',
      displayOrder: 4,
      schemaDefinition: [
        { id: 'f_soft', name: 'software_name', label: 'نام نرم‌افزار', type: 'text', isRequired: true, showInTable: true, order: 1 },
        { id: 'f_lkey', name: 'license_key', label: 'کد لایسنس', type: 'secret', isRequired: true, isSecret: true, showInTable: true, order: 2 },
        { id: 'f_seats', name: 'seats_count', label: 'تعداد مجاز', type: 'text', isRequired: false, showInTable: true, order: 3 },
        { id: 'f_vend', name: 'vendor', label: 'ارائه‌دهنده', type: 'text', isRequired: false, showInTable: true, order: 4 },
        { id: 'f_lexp', name: 'expiry_date', label: 'تاریخ سررسید تمدید', type: 'jalali_date', isRequired: true, showInTable: true, order: 5 },
      ],
    },
  ];

  for (const t of defaultTypes) {
    const existing = await prisma.assetType.findUnique({ where: { slug: t.slug } });
    if (!existing) {
      await prisma.assetType.create({ data: t });
      console.log(`✅ نوع دارایی "${t.name}" با موفقیت ثبت شد.`);
    }
  }

  console.log('🎉 عملیات Seed اولیه با موفقیت به پایان رسید.');
}

main()
  .catch((e) => {
    console.error('❌ خطا در اجرای seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
