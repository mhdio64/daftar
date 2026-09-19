import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { Readable } from 'node:stream';
import { StorageService } from './storage.service.js';

describe('StorageService (Local Disk Attachment Engine)', () => {
  const testDir = path.resolve(process.cwd(), 'temp_test_uploads');
  let storage: StorageService;

  beforeAll(() => {
    storage = new StorageService(testDir);
  });

  afterAll(async () => {
    if (fs.existsSync(testDir)) {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    }
  });

  it('باید فایل را از استریم ذخیره کند و حجم دقیق آن را بازگرداند', async () => {
    const fileContent = 'sample vpn configuration: client\ndev tun\nremote 1.2.3.4 1194';
    const stream = Readable.from(Buffer.from(fileContent, 'utf-8'));

    const result = await storage.saveStream(stream, 'client.ovpn');
    expect(result.storagePath).toBeDefined();
    expect(result.storagePath.endsWith('.ovpn')).toBe(true);
    expect(result.sizeBytes).toBe(Buffer.byteLength(fileContent));

    const exists = storage.fileExists(result.storagePath);
    expect(exists).toBe(true);

    // خواندن محتوا از طریق getReadStream
    const readStream = storage.getReadStream(result.storagePath);
    const chunks: Buffer[] = [];
    for await (const chunk of readStream) {
      chunks.push(Buffer.from(chunk));
    }
    const readText = Buffer.concat(chunks).toString('utf-8');
    expect(readText).toBe(fileContent);
  });

  it('باید در برابر حملات Path Traversal مقاوم بوده و مسیر را در بیس‌دایرکتوری محدود کند', () => {
    const maliciousInput = '../../../../etc/passwd';
    const safePath = storage.resolveSafePath(maliciousInput);
    
    // باید نام فایل را به passwd تقلیل دهد و آن را در testDir قرار دهد
    expect(safePath.startsWith(testDir)).toBe(true);
    expect(path.basename(safePath)).toBe('passwd');
  });

  it('باید فایل را پس از درخواست حذف با موفقیت از دیسک پاک کند', async () => {
    const stream = Readable.from(Buffer.from('temporary data to delete'));
    const { storagePath } = await storage.saveStream(stream, 'temp.key');

    expect(storage.fileExists(storagePath)).toBe(true);
    const deleted = await storage.deleteFile(storagePath);
    expect(deleted).toBe(true);
    expect(storage.fileExists(storagePath)).toBe(false);
  });
});
