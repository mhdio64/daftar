import XLSX from 'xlsx-js-style';
import { AssetType } from './asset-types.service.ts';
import { Asset, assetsService } from './assets.service.ts';
import { getAllSampleAssets } from '../data/sample-assets.ts';

export interface ParsedRow {
  rowNumber: number;
  title: string;
  inputValues: Record<string, any>;
  tags?: string[];
  isValid: boolean;
  errors: string[];
}

export interface ExcelParseResult {
  totalRows: number;
  validRows: ParsedRow[];
  invalidRows: ParsedRow[];
  allRows: ParsedRow[];
  headersFound: string[];
}

export interface ExcelExportOptions {
  includeSecrets?: boolean;
  includeTags?: boolean;
  includeDates?: boolean;
  customFilename?: string;
  scopeLabel?: string;
}

// -------------------------------------------------------------
// تعاریف استایل‌های حرفه‌ای و هارمونیک اکسل (Office OpenXML Styles)
// -------------------------------------------------------------
const FONT_FAMILY = 'Tahoma';

export const EXCEL_STYLES = {
  // بنر اصلی در بالای شیت (ردیف ادغام‌شده)
  BANNER_PRIMARY: {
    font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' }, name: FONT_FAMILY },
    fill: { fgColor: { rgb: '1E1B4B' } }, // سرمه‌ای بسیار تیره و شیک (Midnight Indigo)
    alignment: { horizontal: 'center', vertical: 'center' },
  },

  // زیربنر اطلاعاتی و تاریخ (ردیف ادغام‌شده)
  BANNER_SUB: {
    font: { sz: 9.5, color: { rgb: '3730A3' }, name: FONT_FAMILY },
    fill: { fgColor: { rgb: 'EEF2FF' } }, // آبی روشن بسیار لطیف (Ice Indigo)
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      bottom: { style: 'thin', color: { rgb: 'C7D2FE' } },
    },
  },

  // سرتیتر بخش‌های داخلی داشبورد
  SECTION_HEADER: {
    font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' }, name: FONT_FAMILY },
    fill: { fgColor: { rgb: '312E81' } }, // نیلی پررنگ
    alignment: { horizontal: 'right', vertical: 'center' },
    border: {
      bottom: { style: 'medium', color: { rgb: '1E1B4B' } },
      right: { style: 'medium', color: { rgb: '6366F1' } },
    },
  },

  // سرستون‌های جداول اصلی (Table Column Headers)
  COL_HEADER: {
    font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' }, name: FONT_FAMILY },
    fill: { fgColor: { rgb: '4338CA' } }, // ایندیگو غنی و رسمی (Royal Indigo)
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: '3730A3' } },
      bottom: { style: 'medium', color: { rgb: '312E81' } },
      left: { style: 'thin', color: { rgb: '6366F1' } },
      right: { style: 'thin', color: { rgb: '6366F1' } },
    },
  },

  // سرستون‌های خنثی / ثانویه
  COL_HEADER_MUTED: {
    font: { bold: true, sz: 9.5, color: { rgb: '1E293B' }, name: FONT_FAMILY },
    fill: { fgColor: { rgb: 'E2E8F0' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: '94A3B8' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } },
    },
  },

  // ردیف داده زوج (سفید)
  CELL_EVEN: {
    font: { sz: 9.5, color: { rgb: '0F172A' }, name: FONT_FAMILY },
    fill: { fgColor: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'F1F5F9' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'F1F5F9' } },
      right: { style: 'thin', color: { rgb: 'F1F5F9' } },
    },
  },

  // ردیف داده فرد (طوسی/آبی بسیار ملایم - Zebra Striping)
  CELL_ODD: {
    font: { sz: 9.5, color: { rgb: '0F172A' }, name: FONT_FAMILY },
    fill: { fgColor: { rgb: 'F8FAFC' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'F1F5F9' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'F1F5F9' } },
      right: { style: 'thin', color: { rgb: 'F1F5F9' } },
    },
  },

  // سلول داده با تراز وسط (ردیف زوج)
  CELL_CENTER_EVEN: {
    font: { sz: 9.5, color: { rgb: '0F172A' }, name: FONT_FAMILY },
    fill: { fgColor: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'F1F5F9' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'F1F5F9' } },
      right: { style: 'thin', color: { rgb: 'F1F5F9' } },
    },
  },

  // سلول داده با تراز وسط (ردیف فرد)
  CELL_CENTER_ODD: {
    font: { sz: 9.5, color: { rgb: '0F172A' }, name: FONT_FAMILY },
    fill: { fgColor: { rgb: 'F8FAFC' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'F1F5F9' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'F1F5F9' } },
      right: { style: 'thin', color: { rgb: 'F1F5F9' } },
    },
  },

  // کد اموال و شناسه اختصاصی
  CELL_CODE: {
    font: { sz: 9.5, bold: true, color: { rgb: '4338CA' }, name: 'Consolas' },
    fill: { fgColor: { rgb: 'F5F3FF' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E0E7FF' } },
      bottom: { style: 'thin', color: { rgb: 'C7D2FE' } },
      left: { style: 'thin', color: { rgb: 'E0E7FF' } },
      right: { style: 'thin', color: { rgb: 'E0E7FF' } },
    },
  },

  // متن‌های محرمانه ماسک‌شده
  CELL_SECRET_MASKED: {
    font: { sz: 10, bold: true, color: { rgb: '94A3B8' }, name: 'Consolas' },
    fill: { fgColor: { rgb: 'F1F5F9' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } },
    },
  },

  // وضعیت: معتبر / فعال (سبز ملایم)
  STATUS_ACTIVE: {
    font: { sz: 9, bold: true, color: { rgb: '166534' }, name: FONT_FAMILY },
    fill: { fgColor: { rgb: 'DCFCE7' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'BBF7D0' } },
      bottom: { style: 'thin', color: { rgb: '86EFAC' } },
      left: { style: 'thin', color: { rgb: 'BBF7D0' } },
      right: { style: 'thin', color: { rgb: 'BBF7D0' } },
    },
  },

  // وضعیت: سررسید نزدیک / هشدار (کهربایی)
  STATUS_WARNING: {
    font: { sz: 9, bold: true, color: { rgb: '92400E' }, name: FONT_FAMILY },
    fill: { fgColor: { rgb: 'FEF3C7' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'FDE68A' } },
      bottom: { style: 'thin', color: { rgb: 'FCD34D' } },
      left: { style: 'thin', color: { rgb: 'FDE68A' } },
      right: { style: 'thin', color: { rgb: 'FDE68A' } },
    },
  },

  // وضعیت: منقضی شده / بحرانی (قرمز ملایم)
  STATUS_DANGER: {
    font: { sz: 9, bold: true, color: { rgb: '991B1B' }, name: FONT_FAMILY },
    fill: { fgColor: { rgb: 'FEE2E2' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'FECACA' } },
      bottom: { style: 'thin', color: { rgb: 'FCA5A5' } },
      left: { style: 'thin', color: { rgb: 'FECACA' } },
      right: { style: 'thin', color: { rgb: 'FECACA' } },
    },
  },

  // وضعیت: خنثی / بدون انقضا
  STATUS_NEUTRAL: {
    font: { sz: 9, color: { rgb: '64748B' }, name: FONT_FAMILY },
    fill: { fgColor: { rgb: 'F1F5F9' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } },
    },
  },

  // ردیف جمع کل پایانی (Total Row)
  TOTAL_ROW: {
    font: { sz: 10, bold: true, color: { rgb: '1E1B4B' }, name: FONT_FAMILY },
    fill: { fgColor: { rgb: 'E0E7FF' } }, // ایندیگو شفاف
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '6366F1' } },
      bottom: { style: 'double', color: { rgb: '312E81' } },
      left: { style: 'thin', color: { rgb: 'C7D2FE' } },
      right: { style: 'thin', color: { rgb: 'C7D2FE' } },
    },
  },

  // مقادیر شاخص‌های کلیدی (KPI Value)
  KPI_VALUE: {
    font: { sz: 11, bold: true, color: { rgb: '1E1B4B' }, name: FONT_FAMILY },
    fill: { fgColor: { rgb: 'F8FAFC' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } },
    },
  },
};

/**
 * تعیین وضعیت اعتبار و انقضای یک دارایی
 */
export function getAssetStatus(asset: Asset): {
  label: string;
  type: 'active' | 'warning' | 'danger' | 'neutral';
  daysRemaining?: number;
} {
  const exp = asset.expiryDate || asset.values?.expiry_date;
  if (!exp) {
    return { label: 'دائمی / بدون سررسید', type: 'neutral' };
  }

  const expStr = String(exp).trim();
  let dateObj: Date | null = null;
  if (expStr.includes('-') && !expStr.includes('/')) {
    const d = new Date(expStr);
    if (!isNaN(d.getTime())) dateObj = d;
  }

  if (dateObj) {
    const now = new Date();
    const diffMs = dateObj.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return {
        label: `منقضی شده (${Math.abs(diffDays)} روز پیش)`,
        type: 'danger',
        daysRemaining: diffDays,
      };
    }
    if (diffDays <= 30) {
      return {
        label: `سررسید نزدیک (${diffDays} روز مانده)`,
        type: 'warning',
        daysRemaining: diffDays,
      };
    }
    return {
      label: `معتبر (${diffDays} روز اعتبار)`,
      type: 'active',
      daysRemaining: diffDays,
    };
  }

  return { label: `سررسید: ${expStr}`, type: 'active' };
}

/**
 * پاکسازی نام شیت اکسل مطابق استاندارد مایکروسافت (حداکثر ۳۱ کاراکتر و بدون حروف غیرمجاز)
 */
function sanitizeSheetName(name: string, usedNames: Set<string>): string {
  let clean = name.replace(/[\\/?*[\]:]/g, '_').trim();
  if (!clean) clean = 'دارایی';
  clean = clean.slice(0, 26);
  let finalName = clean;
  let counter = 1;
  while (usedNames.has(finalName)) {
    finalName = `${clean}_${counter++}`;
  }
  usedNames.add(finalName);
  return finalName;
}

/**
 * ایجاد ردیف بنر ادغام‌شده در بالای کاربرگ
 */
function createHeaderBanners(
  ws: Record<string, any>,
  totalCols: number,
  title: string,
  subTitle: string
) {
  // ردیف ۰ (Banner Primary)
  for (let c = 0; c < totalCols; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c });
    ws[cellRef] = {
      t: 's',
      v: c === 0 ? title : '',
      s: EXCEL_STYLES.BANNER_PRIMARY,
    };
  }

  // ردیف ۱ (Banner Sub)
  for (let c = 0; c < totalCols; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: 1, c });
    ws[cellRef] = {
      t: 's',
      v: c === 0 ? subTitle : '',
      s: EXCEL_STYLES.BANNER_SUB,
    };
  }

  // ادغام ستون‌ها در ردیف ۱ و ۲
  if (!ws['!merges']) ws['!merges'] = [];
  ws['!merges'].push(
    { s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(0, totalCols - 1) } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: Math.max(0, totalCols - 1) } }
  );
}

/**
 * استخراج و دریافت تمامی دارایی‌های سازمان از منابع مختلف (API، حافظه محلی یا نمونه‌ها)
 */
export async function fetchAllOrgAssets(assetTypes: AssetType[]): Promise<Asset[]> {
  try {
    const res = await assetsService.getAll({ limit: 1000 });
    if (res.items && res.items.length > 0) {
      return res.items;
    }
  } catch {}

  try {
    const stored = localStorage.getItem('daftar_demo_assets');
    if (stored) {
      const parsed: Asset[] = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  return getAllSampleAssets(assetTypes);
}

/**
 * ایجاد و صدور کتابچه جامع اکسل چند شیتی (Multi-Sheet Comprehensive Workbook)
 * شامل یک شیت داشبورد مالی و آماری کل سازمان + یک شیت مستقل برای هر دسته دارایی با استایل کامل
 */
export function exportComprehensiveFinancialExcel(
  assetTypes: AssetType[],
  allAssets: Asset[],
  options: ExcelExportOptions = {}
): void {
  const wb = XLSX.utils.book_new();
  const currentDateFa = new Date().toLocaleDateString('fa-IR');
  const usedSheetNames = new Set<string>();

  // =========================================================================
  // شیت ۱: 📊 داشبورد و کارنامه کل سازمان (Executive & Financial Dashboard)
  // =========================================================================
  const dashWs: Record<string, any> = {
    '!views': [{ rightToLeft: true }],
    '!merges': [],
    '!rows': [],
  };

  const DASH_COLS = 10;
  const dashRowHeights: Array<{ hpt: number }> = [];

  // بنرهای هدر
  createHeaderBanners(
    dashWs,
    DASH_COLS,
    'سامانه مدیریت دارایی‌ها و فناوری اطلاعات (دفتر) — کارنامه جامع و خلاصه کل سازمان',
    `تاریخ استخراج گزارش: ${currentDateFa} | ویژه: امور مالی، حسابرسی، مدیریت ارشد و زیرساخت فناوری اطلاعات`
  );
  dashRowHeights[0] = { hpt: 36 };
  dashRowHeights[1] = { hpt: 24 };
  dashRowHeights[2] = { hpt: 12 }; // ردیف خالی جداکننده

  // محاسبه آمارهای کلان مالی و سازمانی
  let orgTotalMonthlyToman = 0;
  let orgTotalMonthlyDollar = 0;
  let orgTotalMonthlyEuro = 0;
  let orgTotalExpiring = 0;
  const urgentAssets: Array<{
    asset: Asset;
    typeName: string;
    status: ReturnType<typeof getAssetStatus>;
  }> = [];

  const categorySummaries = assetTypes.map((type) => {
    const typeAssets = allAssets.filter((a) => a.assetTypeId === type.id);
    let catMonthlyToman = 0;
    let catMonthlyDollar = 0;
    let catMonthlyEuro = 0;
    let catExpiring = 0;

    typeAssets.forEach((a) => {
      const costAmountStr = String(a.values?.cost_amount || '').replace(/,/g, '').trim();
      const num = parseFloat(costAmountStr);
      const curr = String(a.values?.cost_currency || '').trim();
      const cycle = String(a.values?.billing_cycle || 'ماهانه').trim();
      const monthlyRate = cycle === 'سالانه' ? (num ? num / 12 : 0) : (num || 0);

      if (!isNaN(num) && num > 0) {
        if (curr.includes('دلار') || curr.includes('$')) {
          catMonthlyDollar += monthlyRate;
          orgTotalMonthlyDollar += monthlyRate;
        } else if (curr.includes('یورو') || curr.includes('€')) {
          catMonthlyEuro += monthlyRate;
          orgTotalMonthlyEuro += monthlyRate;
        } else {
          catMonthlyToman += monthlyRate;
          orgTotalMonthlyToman += monthlyRate;
        }
      }

      const st = getAssetStatus(a);
      if (st.type === 'danger' || st.type === 'warning') {
        catExpiring++;
        orgTotalExpiring++;
        urgentAssets.push({ asset: a, typeName: type.name, status: st });
      }
    });

    return {
      type,
      count: typeAssets.length,
      monthlyToman: catMonthlyToman,
      yearlyToman: catMonthlyToman * 12,
      monthlyDollar: catMonthlyDollar,
      monthlyEuro: catMonthlyEuro,
      expiringCount: catExpiring,
    };
  });

  // -------------------------------------------------------------
  // بخش ۱: شاخص‌های کلیدی زیرساخت (Executive KPIs Table)
  // -------------------------------------------------------------
  let curRow = 3;

  // سرتیتر بخش شاخص‌ها
  for (let c = 0; c < DASH_COLS; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: curRow, c });
    dashWs[cellRef] = {
      t: 's',
      v: c === 0 ? '🔹 ۱. شاخص‌های کلان سازمان و بودجه‌بندی (Executive Key Metrics)' : '',
      s: EXCEL_STYLES.SECTION_HEADER,
    };
  }
  dashWs['!merges'].push({ s: { r: curRow, c: 0 }, e: { r: curRow, c: DASH_COLS - 1 } });
  dashRowHeights[curRow] = { hpt: 26 };
  curRow++;

  // سرستون‌های جدول شاخص‌ها
  const kpiHeaders = ['ردیف', 'شاخص ارزیابی سازمانی', 'مقدار آماری', 'واحد / مقیاس', 'توضیحات و وضعیت'];
  kpiHeaders.forEach((h, colIdx) => {
    const cellRef = XLSX.utils.encode_cell({ r: curRow, c: colIdx });
    dashWs[cellRef] = { t: 's', v: h, s: EXCEL_STYLES.COL_HEADER_MUTED };
  });
  // پر کردن بقیه ستون‌های هدر
  for (let c = kpiHeaders.length; c < DASH_COLS; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: curRow, c });
    dashWs[cellRef] = { t: 's', v: '', s: EXCEL_STYLES.COL_HEADER_MUTED };
  }
  dashWs['!merges'].push({ s: { r: curRow, c: 4 }, e: { r: curRow, c: DASH_COLS - 1 } });
  dashRowHeights[curRow] = { hpt: 22 };
  curRow++;

  const kpis = [
    { title: 'تعداد کل دسته‌بندی‌های دارایی', val: assetTypes.length, unit: 'دسته دارایی', desc: 'شامل زیرساخت، سرور، نرم‌افزار، شبکه، دامنه و پایگاه‌های داده' },
    { title: 'مجموع کل دارایی‌های ثبت‌شده سازمان', val: allAssets.length, unit: 'آیتم دارایی', desc: 'کلیه شناسنامه‌های سخت‌افزاری، ابری و نرم‌افزاری فعال' },
    { title: 'تخمین مجموع هزینه ماهانه ریالی', val: Math.round(orgTotalMonthlyToman).toLocaleString('fa-IR'), unit: 'تومان / ماه', desc: 'حاصل جمع مبالغ نرمالایزشده دوره‌های پرداخت ماهانه و سالانه' },
    { title: 'تخمین مجموع هزینه سالانه ریالی', val: Math.round(orgTotalMonthlyToman * 12).toLocaleString('fa-IR'), unit: 'تومان / سال', desc: '۱۲ برابر تخمین هزینه ماهانه زیرساخت کل سازمان' },
    {
      title: 'مجموع تعهدات ارزی ماهانه',
      val: [
        orgTotalMonthlyDollar > 0 ? `${Math.round(orgTotalMonthlyDollar)} $` : '',
        orgTotalMonthlyEuro > 0 ? `${Math.round(orgTotalMonthlyEuro)} €` : '',
      ].filter(Boolean).join(' + ') || 'بدون تعهد ارزی',
      unit: 'ارز خارجی',
      desc: 'سرویس‌های هاستینگ بین‌المللی، لایسنس‌ها و دامنه‌های خارجی'
    },
    {
      title: 'دارایی‌های منقضی‌شده یا در آستانه سررسید',
      val: orgTotalExpiring > 0 ? `${orgTotalExpiring} مورد ⚠️` : '۰ (همه معتبر ✅)',
      unit: 'آیتم نیازمند تمدید',
      desc: orgTotalExpiring > 0 ? 'نیازمند اقدام فوری واحد تدارکات و پرداخت مالی' : 'تمامی دارایی‌ها دارای اعتبار زمانی مجاز هستند'
    },
  ];

  kpis.forEach((kpi, idx) => {
    const isOdd = idx % 2 === 1;
    const baseStyle = isOdd ? EXCEL_STYLES.CELL_ODD : EXCEL_STYLES.CELL_EVEN;
    const centerStyle = isOdd ? EXCEL_STYLES.CELL_CENTER_ODD : EXCEL_STYLES.CELL_CENTER_EVEN;

    dashWs[XLSX.utils.encode_cell({ r: curRow, c: 0 })] = { t: 'n', v: idx + 1, s: centerStyle };
    dashWs[XLSX.utils.encode_cell({ r: curRow, c: 1 })] = { t: 's', v: kpi.title, s: { ...baseStyle, font: { ...baseStyle.font, bold: true } } };
    dashWs[XLSX.utils.encode_cell({ r: curRow, c: 2 })] = { t: 's', v: String(kpi.val), s: EXCEL_STYLES.KPI_VALUE };
    dashWs[XLSX.utils.encode_cell({ r: curRow, c: 3 })] = { t: 's', v: kpi.unit, s: centerStyle };
    dashWs[XLSX.utils.encode_cell({ r: curRow, c: 4 })] = { t: 's', v: kpi.desc, s: baseStyle };

    for (let c = 5; c < DASH_COLS; c++) {
      dashWs[XLSX.utils.encode_cell({ r: curRow, c })] = { t: 's', v: '', s: baseStyle };
    }
    dashWs['!merges'].push({ s: { r: curRow, c: 4 }, e: { r: curRow, c: DASH_COLS - 1 } });
    dashRowHeights[curRow] = { hpt: 22 };
    curRow++;
  });

  // ردیف جداکننده
  dashRowHeights[curRow] = { hpt: 14 };
  curRow++;

  // -------------------------------------------------------------
  // بخش ۲: جدول تفکیک دسته‌های دارایی و بودجه‌بندی (Categories Breakdown)
  // -------------------------------------------------------------
  for (let c = 0; c < DASH_COLS; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: curRow, c });
    dashWs[cellRef] = {
      t: 's',
      v: c === 0 ? '📊 ۲. تفکیک دارایی‌ها بر اساس دسته‌بندی و شیت‌های اکسل (Categories Breakdown)' : '',
      s: EXCEL_STYLES.SECTION_HEADER,
    };
  }
  dashWs['!merges'].push({ s: { r: curRow, c: 0 }, e: { r: curRow, c: DASH_COLS - 1 } });
  dashRowHeights[curRow] = { hpt: 26 };
  curRow++;

  const catHeaders = [
    'ردیف',
    'عنوان دسته دارایی',
    'شناسه (Slug)',
    'تعداد اقلام',
    'سهم از کل',
    'هزینه ماهانه (تومان)',
    'هزینه سالانه (تومان)',
    'هزینه ارزی ماهانه',
    'اقلام سررسیددار',
    'شیت اختصاصی در اکسل',
  ];

  catHeaders.forEach((h, colIdx) => {
    const cellRef = XLSX.utils.encode_cell({ r: curRow, c: colIdx });
    dashWs[cellRef] = { t: 's', v: h, s: EXCEL_STYLES.COL_HEADER };
  });
  dashRowHeights[curRow] = { hpt: 28 };
  curRow++;

  categorySummaries.forEach((cat, idx) => {
    const isOdd = idx % 2 === 1;
    const baseStyle = isOdd ? EXCEL_STYLES.CELL_ODD : EXCEL_STYLES.CELL_EVEN;
    const centerStyle = isOdd ? EXCEL_STYLES.CELL_CENTER_ODD : EXCEL_STYLES.CELL_CENTER_EVEN;
    const sharePercent = allAssets.length > 0 ? ((cat.count / allAssets.length) * 100).toFixed(1) : '0';

    dashWs[XLSX.utils.encode_cell({ r: curRow, c: 0 })] = { t: 'n', v: idx + 1, s: centerStyle };
    dashWs[XLSX.utils.encode_cell({ r: curRow, c: 1 })] = {
      t: 's',
      v: cat.type.name,
      s: { ...baseStyle, font: { ...baseStyle.font, bold: true, color: { rgb: '312E81' } } },
    };
    dashWs[XLSX.utils.encode_cell({ r: curRow, c: 2 })] = { t: 's', v: cat.type.slug, s: EXCEL_STYLES.CELL_CODE };
    dashWs[XLSX.utils.encode_cell({ r: curRow, c: 3 })] = { t: 'n', v: cat.count, s: centerStyle };
    dashWs[XLSX.utils.encode_cell({ r: curRow, c: 4 })] = { t: 's', v: `${sharePercent} %`, s: centerStyle };
    dashWs[XLSX.utils.encode_cell({ r: curRow, c: 5 })] = {
      t: 's',
      v: cat.monthlyToman > 0 ? Math.round(cat.monthlyToman).toLocaleString('fa-IR') : '—',
      s: centerStyle,
    };
    dashWs[XLSX.utils.encode_cell({ r: curRow, c: 6 })] = {
      t: 's',
      v: cat.yearlyToman > 0 ? Math.round(cat.yearlyToman).toLocaleString('fa-IR') : '—',
      s: centerStyle,
    };
    dashWs[XLSX.utils.encode_cell({ r: curRow, c: 7 })] = {
      t: 's',
      v: [
        cat.monthlyDollar > 0 ? `${Math.round(cat.monthlyDollar)} $` : '',
        cat.monthlyEuro > 0 ? `${Math.round(cat.monthlyEuro)} €` : '',
      ].filter(Boolean).join(' + ') || '—',
      s: centerStyle,
    };
    dashWs[XLSX.utils.encode_cell({ r: curRow, c: 8 })] = {
      t: 's',
      v: cat.expiringCount > 0 ? `${cat.expiringCount} مورد ⚠️` : '۰',
      s: cat.expiringCount > 0 ? EXCEL_STYLES.STATUS_WARNING : centerStyle,
    };
    dashWs[XLSX.utils.encode_cell({ r: curRow, c: 9 })] = {
      t: 's',
      v: `➡️ شیت «${cat.type.name}»`,
      s: { ...centerStyle, font: { ...centerStyle.font, color: { rgb: '4338CA' }, bold: true } },
    };

    dashRowHeights[curRow] = { hpt: 22 };
    curRow++;
  });

  // سطر جمع کل (Total Summary Row)
  const totalRowCols = [
    '—',
    'جمع کل سازمان',
    '—',
    allAssets.length,
    '۱۰۰ ٪',
    orgTotalMonthlyToman > 0 ? Math.round(orgTotalMonthlyToman).toLocaleString('fa-IR') : '—',
    orgTotalMonthlyToman > 0 ? Math.round(orgTotalMonthlyToman * 12).toLocaleString('fa-IR') : '—',
    [
      orgTotalMonthlyDollar > 0 ? `${Math.round(orgTotalMonthlyDollar)} $` : '',
      orgTotalMonthlyEuro > 0 ? `${Math.round(orgTotalMonthlyEuro)} €` : '',
    ].filter(Boolean).join(' + ') || '—',
    orgTotalExpiring > 0 ? `${orgTotalExpiring} مورد` : '۰',
    'تمام شیت‌ها',
  ];

  totalRowCols.forEach((val, c) => {
    dashWs[XLSX.utils.encode_cell({ r: curRow, c })] = {
      t: typeof val === 'number' ? 'n' : 's',
      v: val,
      s: EXCEL_STYLES.TOTAL_ROW,
    };
  });
  dashRowHeights[curRow] = { hpt: 26 };
  curRow++;

  // -------------------------------------------------------------
  // بخش ۳: جدول اقلام در آستانه انقضا یا منقضی‌شده (در صورت وجود)
  // -------------------------------------------------------------
  if (urgentAssets.length > 0) {
    dashRowHeights[curRow] = { hpt: 14 };
    curRow++;

    for (let c = 0; c < DASH_COLS; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: curRow, c });
      dashWs[cellRef] = {
        t: 's',
        v: c === 0 ? `⚠️ ۳. فهرست اقلام نیازمند تمدید فوری و منقضی‌شده (${urgentAssets.length} مورد)` : '',
        s: { ...EXCEL_STYLES.SECTION_HEADER, fill: { fgColor: { rgb: '991B1B' } } },
      };
    }
    dashWs['!merges'].push({ s: { r: curRow, c: 0 }, e: { r: curRow, c: DASH_COLS - 1 } });
    dashRowHeights[curRow] = { hpt: 26 };
    curRow++;

    const urgentHeaders = ['ردیف', 'کد اموال', 'عنوان دارایی', 'دسته دارایی', 'سررسید انقضا', 'وضعیت تمدید', 'مبلغ تمدید', 'برچسب‌ها'];
    urgentHeaders.forEach((h, colIdx) => {
      const cellRef = XLSX.utils.encode_cell({ r: curRow, c: colIdx });
      dashWs[cellRef] = { t: 's', v: h, s: EXCEL_STYLES.COL_HEADER_MUTED };
    });
    for (let c = urgentHeaders.length; c < DASH_COLS; c++) {
      dashWs[XLSX.utils.encode_cell({ r: curRow, c })] = { t: 's', v: '', s: EXCEL_STYLES.COL_HEADER_MUTED };
    }
    dashWs['!merges'].push({ s: { r: curRow, c: 7 }, e: { r: curRow, c: DASH_COLS - 1 } });
    dashRowHeights[curRow] = { hpt: 24 };
    curRow++;

    urgentAssets.forEach((item, idx) => {
      const isOdd = idx % 2 === 1;
      const baseStyle = isOdd ? EXCEL_STYLES.CELL_ODD : EXCEL_STYLES.CELL_EVEN;
      const centerStyle = isOdd ? EXCEL_STYLES.CELL_CENTER_ODD : EXCEL_STYLES.CELL_CENTER_EVEN;
      const stStyle = item.status.type === 'danger' ? EXCEL_STYLES.STATUS_DANGER : EXCEL_STYLES.STATUS_WARNING;

      const expDate = item.asset.expiryDate || item.asset.values?.expiry_date || '—';
      const cost = item.asset.values?.cost_amount ? `${item.asset.values.cost_amount} ${item.asset.values.cost_currency || 'تومان'}` : '—';
      const tags = Array.isArray(item.asset.tags) && item.asset.tags.length > 0 ? item.asset.tags.join('، ') : '—';

      dashWs[XLSX.utils.encode_cell({ r: curRow, c: 0 })] = { t: 'n', v: idx + 1, s: centerStyle };
      dashWs[XLSX.utils.encode_cell({ r: curRow, c: 1 })] = { t: 's', v: `DFT-${item.asset.id}`, s: EXCEL_STYLES.CELL_CODE };
      dashWs[XLSX.utils.encode_cell({ r: curRow, c: 2 })] = { t: 's', v: item.asset.title, s: { ...baseStyle, font: { ...baseStyle.font, bold: true } } };
      dashWs[XLSX.utils.encode_cell({ r: curRow, c: 3 })] = { t: 's', v: item.typeName, s: centerStyle };
      dashWs[XLSX.utils.encode_cell({ r: curRow, c: 4 })] = { t: 's', v: String(expDate), s: centerStyle };
      dashWs[XLSX.utils.encode_cell({ r: curRow, c: 5 })] = { t: 's', v: item.status.label, s: stStyle };
      dashWs[XLSX.utils.encode_cell({ r: curRow, c: 6 })] = { t: 's', v: cost, s: centerStyle };
      dashWs[XLSX.utils.encode_cell({ r: curRow, c: 7 })] = { t: 's', v: tags, s: baseStyle };

      for (let c = 8; c < DASH_COLS; c++) {
        dashWs[XLSX.utils.encode_cell({ r: curRow, c })] = { t: 's', v: '', s: baseStyle };
      }
      dashWs['!merges'].push({ s: { r: curRow, c: 7 }, e: { r: curRow, c: DASH_COLS - 1 } });
      dashRowHeights[curRow] = { hpt: 22 };
      curRow++;
    });
  }

  // تنظیم عرض ستون‌های شیت داشبورد
  dashWs['!cols'] = [
    { wch: 8 },  // ردیف
    { wch: 28 }, // عنوان / شاخص
    { wch: 22 }, // شناسه / مقدار
    { wch: 14 }, // تعداد اقلام / واحد
    { wch: 14 }, // سهم از کل
    { wch: 22 }, // هزینه ماهانه
    { wch: 22 }, // هزینه سالانه
    { wch: 20 }, // هزینه ارزی
    { wch: 18 }, // اقلام سررسید
    { wch: 24 }, // لینک شیت
  ];
  dashWs['!rows'] = dashRowHeights;
  dashWs['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: curRow, c: DASH_COLS - 1 } });

  // اضافه کردن شیت ۱ به کتابچه
  const dashSheetName = sanitizeSheetName('📊 خلاصه کل سازمان', usedSheetNames);
  XLSX.utils.book_append_sheet(wb, dashWs, dashSheetName);

  // =========================================================================
  // شیت‌های ۲ تا N: یک شیت اختصاصی و آراسته برای هر دسته دارایی
  // =========================================================================
  assetTypes.forEach((type) => {
    const typeAssets = allAssets.filter((a) => a.assetTypeId === type.id);
    const schema = type.schemaDefinition || [];

    // استخراج ستون‌های جدول این دسته
    const headers: string[] = ['ردیف', 'کد اموال', 'عنوان دارایی'];
    schema.forEach((f) => headers.push(f.label));

    if (options.includeTags !== false) headers.push('برچسب‌ها');
    if (options.includeDates !== false) {
      headers.push('تاریخ ثبت');
      headers.push('تاریخ سررسید');
      headers.push('وضعیت اعتبار');
    }

    const totalCols = headers.length;
    const catWs: Record<string, any> = {
      '!views': [{ rightToLeft: true }],
      '!merges': [],
      '!rows': [],
    };
    const rowHeights: Array<{ hpt: number }> = [];

    // بنرهای هدر شیت
    createHeaderBanners(
      catWs,
      totalCols,
      `لیست دارایی‌های دسته: ${type.name} (شناسه: ${type.slug})`,
      `تعداد رکوردهای ثبت‌شده: ${typeAssets.length} مورد | تاریخ استخراج: ${currentDateFa} | وضعیت: مستند و تاییدشده`
    );
    rowHeights[0] = { hpt: 36 };
    rowHeights[1] = { hpt: 24 };
    rowHeights[2] = { hpt: 10 }; // ردیف جداکننده

    // ردیف سرستون‌های جدول (ردیف ۳)
    headers.forEach((h, colIdx) => {
      const cellRef = XLSX.utils.encode_cell({ r: 3, c: colIdx });
      catWs[cellRef] = { t: 's', v: h, s: EXCEL_STYLES.COL_HEADER };
    });
    rowHeights[3] = { hpt: 28 };

    let rowIdx = 4;
    const colLengths = headers.map((h) => h.length);

    if (typeAssets.length === 0) {
      // پیام عدم وجود داده در این دسته
      for (let c = 0; c < totalCols; c++) {
        const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c });
        catWs[cellRef] = {
          t: 's',
          v: c === 0 ? 'هیچ دارایی در این دسته‌بندی ثبت نشده است.' : '',
          s: EXCEL_STYLES.CELL_CENTER_EVEN,
        };
      }
      catWs['!merges'].push({ s: { r: rowIdx, c: 0 }, e: { r: rowIdx, c: totalCols - 1 } });
      rowHeights[rowIdx] = { hpt: 26 };
      rowIdx++;
    } else {
      typeAssets.forEach((asset, idx) => {
        const isOdd = idx % 2 === 1;
        const baseStyle = isOdd ? EXCEL_STYLES.CELL_ODD : EXCEL_STYLES.CELL_EVEN;
        const centerStyle = isOdd ? EXCEL_STYLES.CELL_CENTER_ODD : EXCEL_STYLES.CELL_CENTER_EVEN;
        let c = 0;

        // ردیف
        catWs[XLSX.utils.encode_cell({ r: rowIdx, c })] = { t: 'n', v: idx + 1, s: centerStyle };
        c++;

        // کد اموال
        const assetCode = `DFT-${asset.id}`;
        catWs[XLSX.utils.encode_cell({ r: rowIdx, c })] = { t: 's', v: assetCode, s: EXCEL_STYLES.CELL_CODE };
        if (assetCode.length > colLengths[c]) colLengths[c] = assetCode.length;
        c++;

        // عنوان دارایی
        catWs[XLSX.utils.encode_cell({ r: rowIdx, c })] = {
          t: 's',
          v: asset.title,
          s: { ...baseStyle, font: { ...baseStyle.font, bold: true } },
        };
        if (asset.title.length > colLengths[c]) colLengths[c] = asset.title.length;
        c++;

        // فیلدهای اسکیما
        schema.forEach((f) => {
          const rawVal = asset.values?.[f.name];
          let displayVal = '—';
          let cellStyle = baseStyle;

          if (f.type === 'secret' && options.includeSecrets === false) {
            displayVal = '••••••••';
            cellStyle = EXCEL_STYLES.CELL_SECRET_MASKED;
          } else if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
            displayVal = String(rawVal);
            if (f.type === 'ip_port' || f.type === 'url' || f.type === 'jalali_date') {
              cellStyle = centerStyle;
            }
          }

          catWs[XLSX.utils.encode_cell({ r: rowIdx, c })] = {
            t: 's',
            v: displayVal,
            s: cellStyle,
          };
          if (displayVal.length > colLengths[c]) colLengths[c] = displayVal.length;
          c++;
        });

        // برچسب‌ها
        if (options.includeTags !== false) {
          const tagsStr = Array.isArray(asset.tags) && asset.tags.length > 0 ? asset.tags.join('، ') : '—';
          catWs[XLSX.utils.encode_cell({ r: rowIdx, c })] = { t: 's', v: tagsStr, s: baseStyle };
          if (tagsStr.length > colLengths[c]) colLengths[c] = tagsStr.length;
          c++;
        }

        // تاریخ‌ها و وضعیت
        if (options.includeDates !== false) {
          // تاریخ ثبت
          const regDate = new Date(asset.createdAt).toLocaleDateString('fa-IR');
          catWs[XLSX.utils.encode_cell({ r: rowIdx, c })] = { t: 's', v: regDate, s: centerStyle };
          c++;

          // تاریخ سررسید
          const exp = asset.expiryDate || asset.values?.expiry_date;
          const expStr = exp ? String(exp) : '—';
          catWs[XLSX.utils.encode_cell({ r: rowIdx, c })] = { t: 's', v: expStr, s: centerStyle };
          c++;

          // وضعیت اعتبار
          const st = getAssetStatus(asset);
          let stStyle = EXCEL_STYLES.STATUS_NEUTRAL;
          if (st.type === 'active') stStyle = EXCEL_STYLES.STATUS_ACTIVE;
          else if (st.type === 'warning') stStyle = EXCEL_STYLES.STATUS_WARNING;
          else if (st.type === 'danger') stStyle = EXCEL_STYLES.STATUS_DANGER;

          catWs[XLSX.utils.encode_cell({ r: rowIdx, c })] = { t: 's', v: st.label, s: stStyle };
          if (st.label.length > colLengths[c]) colLengths[c] = st.label.length;
          c++;
        }

        rowHeights[rowIdx] = { hpt: 22 };
        rowIdx++;
      });

      // سطر جمع کل انتهای شیت
      for (let c = 0; c < totalCols; c++) {
        let v: string | number = '—';
        if (c === 0) v = 'جمع';
        else if (c === 1) v = `تعداد: ${typeAssets.length}`;
        else if (c === 2) v = 'کل اقلام این دسته';

        catWs[XLSX.utils.encode_cell({ r: rowIdx, c })] = {
          t: 's',
          v: String(v),
          s: EXCEL_STYLES.TOTAL_ROW,
        };
      }
      rowHeights[rowIdx] = { hpt: 25 };
      rowIdx++;
    }

    // تنظیم عرض ستون‌ها با حاشیه امن
    catWs['!cols'] = colLengths.map((len) => ({
      wch: Math.min(42, Math.max(12, len + 3)),
    }));
    catWs['!rows'] = rowHeights;
    catWs['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rowIdx - 1, c: totalCols - 1 } });

    const safeName = sanitizeSheetName(type.name, usedSheetNames);
    XLSX.utils.book_append_sheet(wb, catWs, safeName);
  });

  // تولید بافر و دانلود مستقیم در مرورگر
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const filename = options.customFilename || `کارنامه_جامع_دارایی‌های_سازمان_${currentDateFa.replace(/\//g, '-')}.xlsx`;
  triggerBrowserDownload(excelBuffer, filename);
}

/**
 * ایجاد و دانلود فایل اکسل سفارشی از دارایی‌های مشخص‌شده (همه‌یا فیلترشده) با استایل کامل
 */
export function exportCustomAssetsToExcel(
  assetType: AssetType,
  assets: Asset[],
  options: ExcelExportOptions = {}
): void {
  const wb = XLSX.utils.book_new();
  const currentDateFa = new Date().toLocaleDateString('fa-IR');
  const schema = assetType.schemaDefinition || [];

  const headers: string[] = ['ردیف', 'کد اموال', 'عنوان دارایی'];
  schema.forEach((f) => headers.push(f.label));

  if (options.includeTags !== false) headers.push('برچسب‌ها');
  if (options.includeDates !== false) {
    headers.push('تاریخ ثبت');
    headers.push('سررسید تمدید');
    headers.push('وضعیت اعتبار');
  }

  const totalCols = headers.length;
  const ws: Record<string, any> = {
    '!views': [{ rightToLeft: true }],
    '!merges': [],
    '!rows': [],
  };
  const rowHeights: Array<{ hpt: number }> = [];

  const scopeText = options.scopeLabel || (assets.length === 0 ? 'خالی' : 'لیست دارایی‌ها');
  createHeaderBanners(
    ws,
    totalCols,
    `گزارش دارایی‌های دسته: ${assetType.name} (${scopeText})`,
    `تعداد دارایی‌ها: ${assets.length} مورد | تاریخ استخراج: ${currentDateFa} | سامانه مدیریت دارایی‌های دفتر`
  );
  rowHeights[0] = { hpt: 36 };
  rowHeights[1] = { hpt: 24 };
  rowHeights[2] = { hpt: 10 };

  // ردیف سرستون‌ها
  headers.forEach((h, colIdx) => {
    const cellRef = XLSX.utils.encode_cell({ r: 3, c: colIdx });
    ws[cellRef] = { t: 's', v: h, s: EXCEL_STYLES.COL_HEADER };
  });
  rowHeights[3] = { hpt: 28 };

  const colLengths = headers.map((h) => h.length);
  let rowIdx = 4;

  if (assets.length === 0) {
    for (let c = 0; c < totalCols; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c });
      ws[cellRef] = {
        t: 's',
        v: c === 0 ? 'هیچ ردیفی برای استخراج یافت نشد.' : '',
        s: EXCEL_STYLES.CELL_CENTER_EVEN,
      };
    }
    ws['!merges'].push({ s: { r: rowIdx, c: 0 }, e: { r: rowIdx, c: totalCols - 1 } });
    rowHeights[rowIdx] = { hpt: 26 };
    rowIdx++;
  } else {
    assets.forEach((asset, idx) => {
      const isOdd = idx % 2 === 1;
      const baseStyle = isOdd ? EXCEL_STYLES.CELL_ODD : EXCEL_STYLES.CELL_EVEN;
      const centerStyle = isOdd ? EXCEL_STYLES.CELL_CENTER_ODD : EXCEL_STYLES.CELL_CENTER_EVEN;
      let c = 0;

      // ردیف
      ws[XLSX.utils.encode_cell({ r: rowIdx, c })] = { t: 'n', v: idx + 1, s: centerStyle };
      c++;

      // کد اموال
      const assetCode = `DFT-${asset.id}`;
      ws[XLSX.utils.encode_cell({ r: rowIdx, c })] = { t: 's', v: assetCode, s: EXCEL_STYLES.CELL_CODE };
      if (assetCode.length > colLengths[c]) colLengths[c] = assetCode.length;
      c++;

      // عنوان دارایی
      ws[XLSX.utils.encode_cell({ r: rowIdx, c })] = {
        t: 's',
        v: asset.title,
        s: { ...baseStyle, font: { ...baseStyle.font, bold: true } },
      };
      if (asset.title.length > colLengths[c]) colLengths[c] = asset.title.length;
      c++;

      // فیلدهای اسکیما
      schema.forEach((f) => {
        const rawVal = asset.values?.[f.name];
        let displayVal = '—';
        let cellStyle = baseStyle;

        if (f.type === 'secret' && options.includeSecrets === false) {
          displayVal = '••••••••';
          cellStyle = EXCEL_STYLES.CELL_SECRET_MASKED;
        } else if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
          displayVal = String(rawVal);
          if (f.type === 'ip_port' || f.type === 'url' || f.type === 'jalali_date') {
            cellStyle = centerStyle;
          }
        }

        ws[XLSX.utils.encode_cell({ r: rowIdx, c })] = { t: 's', v: displayVal, s: cellStyle };
        if (displayVal.length > colLengths[c]) colLengths[c] = displayVal.length;
        c++;
      });

      // برچسب‌ها
      if (options.includeTags !== false) {
        const tagsStr = Array.isArray(asset.tags) && asset.tags.length > 0 ? asset.tags.join('، ') : '—';
        ws[XLSX.utils.encode_cell({ r: rowIdx, c })] = { t: 's', v: tagsStr, s: baseStyle };
        if (tagsStr.length > colLengths[c]) colLengths[c] = tagsStr.length;
        c++;
      }

      // تاریخ‌ها
      if (options.includeDates !== false) {
        const regDate = new Date(asset.createdAt).toLocaleDateString('fa-IR');
        ws[XLSX.utils.encode_cell({ r: rowIdx, c })] = { t: 's', v: regDate, s: centerStyle };
        c++;

        const exp = asset.expiryDate || asset.values?.expiry_date;
        const expStr = exp ? String(exp) : '—';
        ws[XLSX.utils.encode_cell({ r: rowIdx, c })] = { t: 's', v: expStr, s: centerStyle };
        c++;

        const st = getAssetStatus(asset);
        let stStyle = EXCEL_STYLES.STATUS_NEUTRAL;
        if (st.type === 'active') stStyle = EXCEL_STYLES.STATUS_ACTIVE;
        else if (st.type === 'warning') stStyle = EXCEL_STYLES.STATUS_WARNING;
        else if (st.type === 'danger') stStyle = EXCEL_STYLES.STATUS_DANGER;

        ws[XLSX.utils.encode_cell({ r: rowIdx, c })] = { t: 's', v: st.label, s: stStyle };
        if (st.label.length > colLengths[c]) colLengths[c] = st.label.length;
        c++;
      }

      rowHeights[rowIdx] = { hpt: 22 };
      rowIdx++;
    });

    // سطر جمع کل
    for (let c = 0; c < totalCols; c++) {
      let v = '—';
      if (c === 0) v = 'جمع';
      else if (c === 1) v = `تعداد: ${assets.length}`;
      else if (c === 2) v = 'مجموع رکوردهای استخراج‌شده';

      ws[XLSX.utils.encode_cell({ r: rowIdx, c })] = {
        t: 's',
        v,
        s: EXCEL_STYLES.TOTAL_ROW,
      };
    }
    rowHeights[rowIdx] = { hpt: 25 };
    rowIdx++;
  }

  ws['!cols'] = colLengths.map((len) => ({
    wch: Math.min(42, Math.max(12, len + 3)),
  }));
  ws['!rows'] = rowHeights;
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rowIdx - 1, c: totalCols - 1 } });

  const safeSheetName = sanitizeSheetName(assetType.name, new Set());
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const filename = options.customFilename || `گزارش_${assetType.name.replace(/\s+/g, '_')}_${options.scopeLabel ? options.scopeLabel + '_' : ''}${currentDateFa.replace(/\//g, '-')}.xlsx`;
  triggerBrowserDownload(excelBuffer, filename);
}

/**
 * ایجاد و دانلود فایل خروجی اکسل پیش‌فرض از کلیه دارایی‌های جاری
 */
export function exportAssetsToExcel(assetType: AssetType, assets: Asset[]): void {
  exportCustomAssetsToExcel(assetType, assets, {
    includeSecrets: false,
    includeTags: true,
    includeDates: true,
    scopeLabel: 'کل_دسته',
  });
}

/**
 * ایجاد و دانلود فایل قالب استاندارد اکسل برای یک دسته‌بندی با استایل زیبا
 */
export function downloadExcelTemplate(assetType: AssetType): void {
  const schema = assetType.schemaDefinition || [];
  const wb = XLSX.utils.book_new();

  const headers = ['عنوان دارایی *', 'برچسب‌ها (Tags)'];
  const sampleValues = [`نمونه ${assetType.name} ۱`, 'Production, اصلی'];

  for (const field of schema) {
    const colName = `${field.label}${field.isRequired ? ' *' : ''}`;
    headers.push(colName);

    switch (field.type) {
      case 'ip_port':
        sampleValues.push('192.168.1.100:22');
        break;
      case 'email':
        sampleValues.push('admin@company.ir');
        break;
      case 'secret':
        sampleValues.push('P@ssw0rd123!');
        break;
      case 'jalali_date':
        sampleValues.push('1405/06/30');
        break;
      case 'url':
        sampleValues.push('https://portal.company.ir');
        break;
      case 'select':
        sampleValues.push(field.options && field.options.length > 0 ? field.options[0] : 'گزینه ۱');
        break;
      default:
        sampleValues.push('مقدار نمونه');
        break;
    }
  }

  const totalCols = headers.length;
  const ws: Record<string, any> = {
    '!views': [{ rightToLeft: true }],
    '!merges': [],
    '!rows': [],
  };

  createHeaderBanners(
    ws,
    totalCols,
    `قالب اکسل استاندارد ورود اطلاعات: دسته «${assetType.name}»`,
    'ستون‌های دارای علامت ستاره (*) اجباری هستند. لطفاً سطر نمونه دوم را با مقادیر واقعی جایگزین فرمایید.'
  );

  // هدرها (ردیف ۳)
  headers.forEach((h, colIdx) => {
    ws[XLSX.utils.encode_cell({ r: 3, c: colIdx })] = {
      t: 's',
      v: h,
      s: EXCEL_STYLES.COL_HEADER,
    };
  });

  // سطر نمونه (ردیف ۴)
  sampleValues.forEach((val, colIdx) => {
    ws[XLSX.utils.encode_cell({ r: 4, c: colIdx })] = {
      t: 's',
      v: val,
      s: EXCEL_STYLES.CELL_ODD,
    };
  });

  ws['!cols'] = headers.map((h, i) => ({
    wch: Math.max(16, Math.max(h.length, sampleValues[i]?.length || 0) + 4),
  }));
  ws['!rows'] = [
    { hpt: 36 },
    { hpt: 24 },
    { hpt: 10 },
    { hpt: 28 },
    { hpt: 24 },
  ];
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 4, c: totalCols - 1 } });

  const safeName = sanitizeSheetName(assetType.name, new Set());
  XLSX.utils.book_append_sheet(wb, ws, safeName);

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  triggerBrowserDownload(excelBuffer, `قالب_اکسل_${assetType.name.replace(/\s+/g, '_')}.xlsx`);
}

/**
 * پاکسازی رشته سرستون برای مقایسه انعطاف‌پذیر
 */
function cleanHeader(header: string): string {
  return header.replace(/[*_]/g, '').trim().toLowerCase();
}

/**
 * خواندن، نگاشت و اعتبارسنجی فایل اکسل بارگذاری‌شده
 */
export async function parseAndValidateExcel(
  file: File,
  assetType: AssetType
): Promise<ExcelParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('فایل اکسل ارائه‌شده فاقد شیت معتبر است.');
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // تبدیل شیت به ردیف‌های خام (هر ردیف یک آبجکت است)
  const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (rawRows.length === 0) {
    throw new Error('فایل اکسل خالی است و هیچ ردیف داده‌ای یافت نشد.');
  }

  const schema = assetType.schemaDefinition || [];
  const rawHeaders = Object.keys(rawRows[0] || {});

  // نگاشت هدرهای اکسل به کلیدهای فیلدهای اسکیما
  const fieldMapping: Record<string, string> = {};
  let titleHeader = '';
  let tagsHeader = '';

  for (const header of rawHeaders) {
    const cleaned = cleanHeader(header);

    if (
      cleaned === 'عنوان' ||
      cleaned === 'عنوان دارایی' ||
      cleaned === 'title' ||
      cleaned === 'نام دارایی'
    ) {
      titleHeader = header;
      continue;
    }

    if (
      cleaned === 'برچسب' ||
      cleaned === 'برچسب ها' ||
      cleaned === 'برچسب‌ها' ||
      cleaned === 'برچسبها' ||
      cleaned === 'tags' ||
      cleaned === 'tag' ||
      cleaned.includes('برچسب') ||
      cleaned.includes('tag')
    ) {
      tagsHeader = header;
      continue;
    }

    for (const field of schema) {
      if (
        cleanHeader(field.label) === cleaned ||
        cleanHeader(field.name) === cleaned
      ) {
        fieldMapping[header] = field.name;
        break;
      }
    }
  }

  const allRows: ParsedRow[] = [];
  const validRows: ParsedRow[] = [];
  const invalidRows: ParsedRow[] = [];

  rawRows.forEach((raw, idx) => {
    const rowNumber = idx + 2;
    const errors: string[] = [];

    const rawTitle = titleHeader ? String(raw[titleHeader] || '').trim() : '';
    if (!rawTitle) {
      errors.push('عنوان دارایی وارد نشده است.');
    }

    const inputValues: Record<string, any> = {};
    for (const [header, fieldName] of Object.entries(fieldMapping)) {
      const val = raw[header];
      if (val !== undefined && val !== null && val !== '') {
        inputValues[fieldName] = String(val).trim();
      }
    }

    for (const field of schema) {
      if (field.isRequired) {
        const val = inputValues[field.name];
        if (!val || String(val).trim() === '') {
          errors.push(`فیلد اجباری «${field.label}» تکمیل نشده است.`);
        }
      }
    }

    const parsedRow: ParsedRow = {
      rowNumber,
      title: rawTitle || `ردیف شماره ${rowNumber}`,
      inputValues,
      tags: tagsHeader && raw[tagsHeader]
        ? String(raw[tagsHeader]).split(/[,،]+/).map((t) => t.trim()).filter(Boolean)
        : [],
      isValid: errors.length === 0,
      errors,
    };

    allRows.push(parsedRow);
    if (parsedRow.isValid) {
      validRows.push(parsedRow);
    } else {
      invalidRows.push(parsedRow);
    }
  });

  return {
    totalRows: allRows.length,
    validRows,
    invalidRows,
    allRows,
    headersFound: rawHeaders,
  };
}

/**
 * تریگر کردن مستقیم دانلود فایل اکسل در مرورگر کاربر
 */
function triggerBrowserDownload(data: ArrayBuffer, fileName: string): void {
  const blob = new Blob([data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
