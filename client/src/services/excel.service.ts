import * as XLSX from 'xlsx';
import { AssetType, FieldDefinition } from './asset-types.service.ts';
import { Asset } from './assets.service.ts';

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

/**
 * ایجاد و دانلود فایل قالب اکسل استاندارد برای یک دسته‌بندی
 */
export function downloadExcelTemplate(assetType: AssetType): void {
  const schema = assetType.schemaDefinition || [];

  const headers = ['عنوان دارایی *', 'برچسب‌ها (Tags)'];
  const sampleRow: Record<string, any> = {
    'عنوان دارایی *': `نمونه ${assetType.name} ۱`,
    'برچسب‌ها (Tags)': 'Production, اصلی',
  };

  for (const field of schema) {
    const colName = `${field.label}${field.isRequired ? ' *' : ''}`;
    headers.push(colName);

    switch (field.type) {
      case 'ip_port':
        sampleRow[colName] = '192.168.1.100:22';
        break;
      case 'email':
        sampleRow[colName] = 'user@company.ir';
        break;
      case 'secret':
        sampleRow[colName] = 'P@ssw0rd123!';
        break;
      case 'jalali_date':
        sampleRow[colName] = '1405/06/30';
        break;
      case 'url':
        sampleRow[colName] = 'https://portal.company.ir';
        break;
      case 'select':
        sampleRow[colName] = field.options && field.options.length > 0 ? field.options[0] : 'گزینه پیش‌فرض';
        break;
      default:
        sampleRow[colName] = 'مقدار نمونه';
        break;
    }
  }

  const ws = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
  ws['!cols'] = headers.map(() => ({ wch: 24 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, assetType.name.slice(0, 31));

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  triggerBrowserDownload(
    excelBuffer,
    `قالب_اکسل_${assetType.name.replace(/\s+/g, '_')}.xlsx`
  );
}

/**
 * ایجاد و دانلود فایل خروجی اکسل از کلیه دارایی‌های جاری
 */
export function exportAssetsToExcel(assetType: AssetType, assets: Asset[]): void {
  const schema = assetType.schemaDefinition || [];
  const headers = ['ردیف', 'عنوان دارایی', 'برچسب‌ها', ...schema.map((f) => f.label), 'تاریخ ایجاد'];

  const rows = assets.map((asset, index) => {
    const row: Record<string, any> = {
      'ردیف': index + 1,
      'عنوان دارایی': asset.title,
      'برچسب‌ها': Array.isArray(asset.tags) && asset.tags.length > 0 ? asset.tags.join('، ') : '—',
    };

    for (const field of schema) {
      const val = asset.values?.[field.name];
      row[field.label] = val !== undefined && val !== null ? val : '—';
    }

    row['تاریخ ایجاد'] = new Date(asset.createdAt).toLocaleDateString('fa-IR');
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  ws['!cols'] = headers.map(() => ({ wch: 22 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, assetType.name.slice(0, 31));

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  triggerBrowserDownload(
    excelBuffer,
    `خروجی_${assetType.name.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.xlsx`
  );
}

export interface ExcelExportOptions {
  includeSecrets?: boolean;
  includeTags?: boolean;
  includeDates?: boolean;
  customFilename?: string;
  scopeLabel?: string;
}

/**
 * ایجاد و دانلود فایل اکسل سفارشی از دارایی‌های مشخص‌شده (همه‌یا فیلترشده)
 */
export function exportCustomAssetsToExcel(
  assetType: AssetType,
  assets: Asset[],
  options: ExcelExportOptions = {}
): void {
  const schema = assetType.schemaDefinition || [];
  const headers: string[] = ['ردیف', 'کد اموال', 'عنوان دارایی'];
  if (options.includeTags !== false) headers.push('برچسب‌ها');

  for (const field of schema) {
    headers.push(field.label);
  }

  if (options.includeDates !== false) {
    headers.push('تاریخ ثبت');
    headers.push('سررسید تمدید');
  }

  const rows = assets.map((asset, index) => {
    const row: Record<string, any> = {
      'ردیف': index + 1,
      'کد اموال': `DFT-${asset.id}`,
      'عنوان دارایی': asset.title,
    };

    if (options.includeTags !== false) {
      row['برچسب‌ها'] = Array.isArray(asset.tags) && asset.tags.length > 0 ? asset.tags.join('، ') : '—';
    }

    for (const field of schema) {
      const val = asset.values?.[field.name];
      if (field.type === 'secret' && options.includeSecrets === false) {
        row[field.label] = '••••••••';
      } else {
        row[field.label] = val !== undefined && val !== null && val !== '' ? val : '—';
      }
    }

    if (options.includeDates !== false) {
      row['تاریخ ثبت'] = new Date(asset.createdAt).toLocaleDateString('fa-IR');
      const exp = asset.expiryDate || asset.values?.expiry_date;
      row['سررسید تمدید'] = exp ? String(exp) : '—';
    }

    return row;
  });

  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  ws['!cols'] = headers.map(() => ({ wch: 22 }));

  const wb = XLSX.utils.book_new();
  const safeSheetName = (assetType.name || 'دارایی‌ها').slice(0, 31).replace(/[\\/?*[\]]/g, '_');
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const filename = options.customFilename || `گزارش_${assetType.name.replace(/\s+/g, '_')}_${options.scopeLabel ? options.scopeLabel + '_' : ''}${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.xlsx`;
  triggerBrowserDownload(excelBuffer, filename);
}

/**
 * ایجاد و صدور کتابچه جامع اکسل چند شیتی (Multi-Sheet Comprehensive Workbook)
 * ویژه ارائه به امور مالی، حسابداری و مدیران ارشد
 */
export function exportComprehensiveFinancialExcel(
  assetTypes: AssetType[],
  allAssets: Asset[],
  options: ExcelExportOptions = {}
): void {
  const wb = XLSX.utils.book_new();

  // ۱. شیت خلاصه مدیریتی و مالی (Executive & Financial Summary)
  const summaryRows: Record<string, any>[] = [];

  assetTypes.forEach((type, idx) => {
    const typeAssets = allAssets.filter((a) => a.assetTypeId === type.id);
    let totalMonthlyToman = 0;
    let totalMonthlyDollar = 0;
    let totalMonthlyEuro = 0;
    let expiringCount = 0;

    typeAssets.forEach((a) => {
      const costAmountStr = String(a.values?.cost_amount || '').replace(/,/g, '').trim();
      const num = parseFloat(costAmountStr);
      const curr = String(a.values?.cost_currency || '').trim();
      const cycle = String(a.values?.billing_cycle || 'ماهانه').trim();
      const monthlyRate = cycle === 'سالانه' ? (num ? num / 12 : 0) : (num || 0);

      if (!isNaN(num) && num > 0) {
        if (curr.includes('دلار') || curr.includes('$')) {
          totalMonthlyDollar += monthlyRate;
        } else if (curr.includes('یورو') || curr.includes('€')) {
          totalMonthlyEuro += monthlyRate;
        } else {
          totalMonthlyToman += monthlyRate;
        }
      }

      if (a.expiryDate || a.values?.expiry_date) {
        expiringCount++;
      }
    });

    summaryRows.push({
      'ردیف': idx + 1,
      'دسته دارایی': type.name,
      'تعداد دارایی‌های ثبت‌شده': typeAssets.length,
      'تخمین هزینه ماهانه (تومان)': totalMonthlyToman > 0 ? Math.round(totalMonthlyToman).toLocaleString('fa-IR') : '—',
      'تخمین هزینه سالانه (تومان)': totalMonthlyToman > 0 ? Math.round(totalMonthlyToman * 12).toLocaleString('fa-IR') : '—',
      'هزینه ارزی ماهانه (ارز)': [
        totalMonthlyDollar > 0 ? `${Math.round(totalMonthlyDollar)} $` : '',
        totalMonthlyEuro > 0 ? `${Math.round(totalMonthlyEuro)} €` : '',
      ].filter(Boolean).join(' + ') || '—',
      'اقلام با تاریخ سررسید': expiringCount,
    });
  });

  const summaryHeaders = [
    'ردیف',
    'دسته دارایی',
    'تعداد دارایی‌های ثبت‌شده',
    'تخمین هزینه ماهانه (تومان)',
    'تخمین هزینه سالانه (تومان)',
    'هزینه ارزی ماهانه (ارز)',
    'اقلام با تاریخ سررسید',
  ];
  const summaryWs = XLSX.utils.json_to_sheet(summaryRows, { header: summaryHeaders });
  summaryWs['!cols'] = [
    { wch: 8 },
    { wch: 25 },
    { wch: 22 },
    { wch: 25 },
    { wch: 25 },
    { wch: 22 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'خلاصه مالی و مدیریتی');

  // ۲. شیت‌های تفکیکی هر دسته‌بندی
  assetTypes.forEach((type) => {
    const typeAssets = allAssets.filter((a) => a.assetTypeId === type.id);
    const schema = type.schemaDefinition || [];
    const headers: string[] = ['ردیف', 'کد اموال', 'عنوان دارایی'];
    if (options.includeTags !== false) headers.push('برچسب‌ها');
    for (const field of schema) {
      headers.push(field.label);
    }
    if (options.includeDates !== false) {
      headers.push('تاریخ ثبت');
      headers.push('سررسید تمدید');
    }

    const rows = typeAssets.map((asset, index) => {
      const row: Record<string, any> = {
        'ردیف': index + 1,
        'کد اموال': `DFT-${asset.id}`,
        'عنوان دارایی': asset.title,
      };

      if (options.includeTags !== false) {
        row['برچسب‌ها'] = Array.isArray(asset.tags) && asset.tags.length > 0 ? asset.tags.join('، ') : '—';
      }

      for (const field of schema) {
        const val = asset.values?.[field.name];
        if (field.type === 'secret' && options.includeSecrets === false) {
          row[field.label] = '••••••••';
        } else {
          row[field.label] = val !== undefined && val !== null && val !== '' ? val : '—';
        }
      }

      if (options.includeDates !== false) {
        row['تاریخ ثبت'] = new Date(asset.createdAt).toLocaleDateString('fa-IR');
        const exp = asset.expiryDate || asset.values?.expiry_date;
        row['سررسید تمدید'] = exp ? String(exp) : '—';
      }

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
    ws['!cols'] = headers.map(() => ({ wch: 22 }));

    const safeName = type.name.slice(0, 30).replace(/[\\/?*[\]]/g, '_');
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  });

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const filename = `گزارش_جامع_مالی_اموال_سازمان_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.xlsx`;
  triggerBrowserDownload(excelBuffer, filename);
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
  // پشتیبانی از عنوان فارسی، عنوان فارسی ستاره‌دار و کلید انگلیسی
  const fieldMapping: Record<string, string> = {}; // rawHeader -> field.name
  let titleHeader = '';
  let tagsHeader = '';

  for (const header of rawHeaders) {
    const cleaned = cleanHeader(header);

    // بررسی اینکه آیا این ستون برای عنوان دارایی است
    if (
      cleaned === 'عنوان' ||
      cleaned === 'عنوان دارایی' ||
      cleaned === 'title' ||
      cleaned === 'نام دارایی'
    ) {
      titleHeader = header;
      continue;
    }

    // بررسی اینکه آیا این ستون برای برچسب‌ها است
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

    // بررسی تطابق با فیلدهای تعریف‌شده در اسکیما
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
    const rowNumber = idx + 2; // در اکسل ردیف ۱ هدر است
    const errors: string[] = [];

    // استخراج عنوان دارایی
    const rawTitle = titleHeader ? String(raw[titleHeader] || '').trim() : '';
    if (!rawTitle) {
      errors.push('عنوان دارایی وارد نشده است.');
    }

    // استخراج سایر مقادیر بر اساس مپینگ
    const inputValues: Record<string, any> = {};
    for (const [header, fieldName] of Object.entries(fieldMapping)) {
      const val = raw[header];
      if (val !== undefined && val !== null && val !== '') {
        inputValues[fieldName] = String(val).trim();
      }
    }

    // بررسی فیلدهای اجباری
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
