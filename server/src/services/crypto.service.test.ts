import { describe, it, expect } from 'vitest';
import { encryptSecret, decryptSecret, maskSecret } from './crypto.service.js';

describe('CryptoService (AES-256-GCM)', () => {
  it('باید رمز عبور را رمزنگاری و با موفقیت بدون تغییر رمزگشایی کند', () => {
    const rawSecret = 'MySuper$ecretP@ssword2026!';
    
    const encrypted = encryptSecret(rawSecret);
    expect(encrypted.iv).toHaveLength(24); // 12 bytes in hex = 24 chars
    expect(encrypted.authTag).toHaveLength(32); // 16 bytes in hex = 32 chars
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.ciphertext).not.toBe(rawSecret);

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(rawSecret);
  });

  it('باید برای دو بار رمزنگاری از یک مقدار، به دلیل IV تصادفی، دو سایفرتکست متفاوت تولید کند', () => {
    const text = 'RepeatSecret';
    const enc1 = encryptSecret(text);
    const enc2 = encryptSecret(text);

    expect(enc1.iv).not.toBe(enc2.iv);
    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
  });

  it('در صورت دستکاری تعمدی محتوا (Tampering)، به دلیل Auth Tag با خطا رد شود', () => {
    const rawSecret = 'ConfidentialData';
    const encrypted = encryptSecret(rawSecret);

    // دستکاری یک کاراکتر در متن رمزشده
    const tamperedCiphertext = encrypted.ciphertext.slice(0, -1) + (encrypted.ciphertext.endsWith('a') ? 'b' : 'a');
    
    expect(() => {
      decryptSecret({
        ...encrypted,
        ciphertext: tamperedCiphertext,
      });
    }).toThrow();
  });

  it('ماسک پسورد باید رشته ۸ نقطه‌ای ثابت برگرداند', () => {
    expect(maskSecret()).toBe('••••••••');
  });
});
