import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './auth.service.js';
import { calculateDiff } from './audit.service.js';
import { getSecretKeysFromSchema, formatAssetForClient } from './asset.service.js';

describe('AuthService (Scrypt Hashing)', () => {
  it('باید رمز عبور را هش کرده و با صحت اعتبارسنجی کند', () => {
    const rawPass = 'SecureAdmin#2026';
    const hash = hashPassword(rawPass);

    expect(hash).toContain(':');
    expect(verifyPassword(rawPass, hash)).toBe(true);
    expect(verifyPassword('WrongPassword', hash)).toBe(false);
  });
});

describe('AuditService (Diff Engine)', () => {
  it('باید تفاوت مقادیر عادی را به درستی ثبت کند', () => {
    const oldVal = { ip: '192.168.1.1', os: 'Ubuntu' };
    const newVal = { ip: '192.168.1.20', os: 'Ubuntu' };

    const diff = calculateDiff(oldVal, newVal, []);
    expect(diff['ip']).toEqual({ old: '192.168.1.1', new: '192.168.1.20' });
    expect(diff['os']).toBeUndefined(); // تغییری نکرده است
  });

  it('هرگز نباید مقدار خام پسورد را در diff ذخیره کند', () => {
    const oldVal = { root_pass: 'OldPass123' };
    const newVal = { root_pass: 'NewSuperPass456' };

    const diff = calculateDiff(oldVal, newVal, ['root_pass']);
    expect(diff['root_pass']).toBeDefined();
    expect(diff['root_pass'].old).toBe('••••••••');
    expect(diff['root_pass'].new).toBe('••••••••');
    expect(diff['root_pass'].note).toBeDefined();
  });
});

describe('AssetService (Schema & Masking)', () => {
  it('باید کلیدهای فیلدهای محرمانه را از روی اسکیما به درستی تشخیص دهد', () => {
    const schema = [
      { id: '1', name: 'ip', type: 'text' },
      { id: '2', name: 'password', type: 'secret', isSecret: true },
      { id: '3', name: 'api_token', type: 'text', isSecret: true },
    ];

    const secretKeys = getSecretKeysFromSchema(schema);
    expect(secretKeys).toEqual(['password', 'api_token']);
  });

  it('باید فیلدهای محرمانه را در خروجی کلاینت ماسک کند و encryptedValues را حذف نماید', () => {
    const mockAsset = {
      id: 'ast-1',
      title: 'سرور تستی',
      values: { ip: '10.0.0.1' },
      encryptedValues: {
        password: { iv: 'aaa', authTag: 'bbb', ciphertext: 'ccc' },
      },
    };

    const formatted = formatAssetForClient(mockAsset, ['password']);
    expect(formatted.values.ip).toBe('10.0.0.1');
    expect(formatted.values.password).toBe('••••••••');
    expect(formatted.encryptedValues).toBeUndefined();
  });
});
