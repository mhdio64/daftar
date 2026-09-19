import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { generateExcelTemplate, generateAssetsExcel } from './excel.service.js';

describe('ExcelService (Template & Export Engine)', () => {
  const mockAssetType = {
    id: 'type-vps',
    name: 'سرورهای مجازی (VPS)',
    slug: 'vps',
    schemaDefinition: [
      { id: 'f_ip', name: 'ip_address', label: 'آدرس IP', type: 'ip_port', isRequired: true },
      { id: 'f_ssh', name: 'ssh_port', label: 'پورت SSH', type: 'text', isRequired: false },
      { id: 'f_pwd', name: 'root_password', label: 'رمز عبور Root', type: 'secret', isRequired: true },
    ],
  };

  it('باید فایل قالب اکسل استاندارد را با ستاره در ستون‌های اجباری و ردیف نمونه تولید کند', () => {
    const buffer = generateExcelTemplate(mockAssetType);
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(100);

    // بررسی ساختار فایل تولید شده توسط SheetJS
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    expect(workbook.SheetNames.length).toBeGreaterThan(0);

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data: any[] = XLSX.utils.sheet_to_json(sheet);

    expect(data.length).toBe(1); // ردیف نمونه
    const sample = data[0];
    expect(sample['عنوان دارایی *']).toBeDefined();
    expect(sample['آدرس IP *']).toBe('192.168.1.100:22');
    expect(sample['رمز عبور Root *']).toBe('P@ssw0rd123!');
  });

  it('باید گزارش اکسل از دارایی‌ها را با فرمت ستون‌های صحیح تولید کند', () => {
    const mockAssets = [
      {
        id: 'ast-1',
        title: 'سرور شماره ۱',
        values: {
          ip_address: '10.20.30.40',
          ssh_port: '2222',
          root_password: '••••••••',
        },
        createdAt: new Date().toISOString(),
      },
    ];

    const buffer = generateAssetsExcel(mockAssetType, mockAssets);
    expect(buffer).toBeDefined();

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: any[] = XLSX.utils.sheet_to_json(sheet);

    expect(data.length).toBe(1);
    expect(data[0]['عنوان دارایی']).toBe('سرور شماره ۱');
    expect(data[0]['آدرس IP']).toBe('10.20.30.40');
    expect(data[0]['رمز عبور Root']).toBe('••••••••');
  });

  it('باید ستون‌های بدون مقدار یا اختیاری را به صورت خط تیره در خروجی قرار دهد', () => {
    const mockAssets = [
      {
        id: 'ast-2',
        title: 'سرور بدون پورت',
        values: {
          ip_address: '1.2.3.4',
        },
        createdAt: new Date().toISOString(),
      },
    ];

    const buffer = generateAssetsExcel(mockAssetType, mockAssets);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: any[] = XLSX.utils.sheet_to_json(sheet);

    expect(data[0]['پورت SSH']).toBe('—');
  });
});
