import * as XLSX from 'xlsx';

export interface AssetTypeWithSchema {
  id: string;
  name: string;
  slug: string;
  schemaDefinition: Array<{
    id: string;
    name: string;
    label: string;
    type: string;
    isRequired: boolean;
    options?: string[];
  }>;
}

/**
 * تولید فایل باینری اکسل تمپلیت برای دسته‌بندی با فیلدهای پویا
 */
export function generateExcelTemplate(assetType: AssetTypeWithSchema): Buffer {
  const schema = Array.isArray(assetType.schemaDefinition) ? assetType.schemaDefinition : [];

  // ساخت سرستون‌ها با نشانگر ستاره برای فیلدهای اجباری
  const headers = ['عنوان دارایی *', 'برچسب‌ها (Tags)'];
  const sampleRow: Record<string, string> = {
    'عنوان دارایی *': `نمونه ${assetType.name} ۱`,
    'برچسب‌ها (Tags)': 'Production, اصلی',
  };

  for (const field of schema) {
    const colHeader = `${field.label}${field.isRequired ? ' *' : ''}`;
    headers.push(colHeader);

    // تولید مقدار راهنما بر اساس نوع فیلد
    switch (field.type) {
      case 'ip_port':
        sampleRow[colHeader] = '192.168.1.100:22';
        break;
      case 'secret':
        sampleRow[colHeader] = 'P@ssw0rd123!';
        break;
      case 'jalali_date':
        sampleRow[colHeader] = '1405/06/30';
        break;
      case 'url':
        sampleRow[colHeader] = 'https://example.com';
        break;
      case 'select':
        sampleRow[colHeader] = field.options && field.options.length > 0 ? field.options[0] : 'گزینه پیش‌فرض';
        break;
      default:
        sampleRow[colHeader] = 'اطلاعات نمونه';
        break;
    }
  }

  const ws = XLSX.utils.json_to_sheet([sampleRow], { header: headers });

  // تنظیم عرض ستون‌ها برای نمایش زیبا در اکسل
  ws['!cols'] = headers.map(() => ({ wch: 22 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, assetType.name.slice(0, 31));

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * تولید فایل اکسل گزارش دارایی‌های موجود در یک دسته‌بندی
 */
export function generateAssetsExcel(assetType: AssetTypeWithSchema, assets: any[]): Buffer {
  const schema = Array.isArray(assetType.schemaDefinition) ? assetType.schemaDefinition : [];

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
  ws['!cols'] = headers.map(() => ({ wch: 20 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, assetType.name.slice(0, 31));

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
