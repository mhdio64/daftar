import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import crypto from 'node:crypto';
import { env } from '../config/env.js';

/**
 * سرویس مدیریت فایل‌ها روی دیسک محلی سرور
 */
export class StorageService {
  private baseDir: string;

  constructor(customBaseDir?: string) {
    this.baseDir = path.resolve(customBaseDir || env.uploadDir);
    this.ensureDirectoryExists(this.baseDir);
  }

  /**
   * اطمینان از وجود دایرکتوری در فایل‌سیستم
   */
  public ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * لیست پسوندهای پرخطر، اسکریپتی و اجرایی که بارگذاری آن‌ها مسدود است
   */
  private static readonly DANGEROUS_EXTENSIONS = new Set([
    '.exe', '.dll', '.so', '.sh', '.bash', '.bat', '.cmd', '.ps1', '.vbs',
    '.php', '.phtml', '.php3', '.php4', '.php5', '.phps',
    '.asp', '.aspx', '.jsp', '.jspx', '.cgi', '.pl', '.py',
    '.jar', '.war', '.ear', '.html', '.htm', '.xhtml',
  ]);

  /**
   * تولید نام امن و یکتا برای ذخیره‌سازی روی دیسک با پالایش پسوند
   */
  public generateStorageFilename(originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    if (StorageService.DANGEROUS_EXTENSIONS.has(ext)) {
      throw new Error(`خطای امنیتی: بارگذاری فایل‌های اجرایی و اسکریپتی با پسوند "${ext}" مسدود است.`);
    }
    const uniqueId = crypto.randomUUID();
    return `${uniqueId}${ext}`;
  }

  /**
   * اعتبارسنجی امن مسیر برای پیشگیری قطعی از Path Traversal
   */
  public resolveSafePath(filename: string): string {
    // حذف هرگونه کاراکتر مسیرنورد نظیر ../ یا ..\
    const cleanFilename = path.basename(filename);
    const resolved = path.resolve(this.baseDir, cleanFilename);

    if (!resolved.startsWith(this.baseDir)) {
      throw new Error('آسیب‌پذیری امنیتی: دسترسی غیرمجاز به مسیر خارج از دایرکتوری مجاز فایل‌ها.');
    }

    return resolved;
  }

  /**
   * ذخیره‌سازی استریم فایل ورودی روی دیسک محلی
   */
  public async saveStream(
    fileStream: Readable,
    originalName: string
  ): Promise<{ storagePath: string; sizeBytes: number }> {
    this.ensureDirectoryExists(this.baseDir);
    const storageFilename = this.generateStorageFilename(originalName);
    const targetFilePath = this.resolveSafePath(storageFilename);

    const writeStream = fs.createWriteStream(targetFilePath);
    await pipeline(fileStream, writeStream);

    const stats = await fs.promises.stat(targetFilePath);

    return {
      storagePath: storageFilename, // نام ذخیره‌شده نسبت به baseDir
      sizeBytes: stats.size,
    };
  }

  /**
   * دریافت استریم خواندن فایل برای ارسال به کلاینت
   */
  public getReadStream(storageFilename: string): fs.ReadStream {
    const filePath = this.resolveSafePath(storageFilename);
    if (!fs.existsSync(filePath)) {
      throw new Error('فایل درخواستی روی دیسک سرور یافت نشد.');
    }
    return fs.createReadStream(filePath);
  }

  /**
   * حذف فیزیکی فایل از روی دیسک
   */
  public async deleteFile(storageFilename: string): Promise<boolean> {
    try {
      const filePath = this.resolveSafePath(storageFilename);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        return true;
      }
      return false;
    } catch (err) {
      console.error(`خطا در حذف فیزیکی فایل ${storageFilename}:`, err);
      return false;
    }
  }

  /**
   * بررسی وجود فایل
   */
  public fileExists(storageFilename: string): boolean {
    try {
      const filePath = this.resolveSafePath(storageFilename);
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }
}

export const storageService = new StorageService();
