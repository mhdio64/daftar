/**
 * موتور کلاینت احراز هویت دو مرحله‌ای (RFC 6238 TOTP) برای حالت دمو و آفلاین
 * این ماژول امکان فعال‌سازی واقعی و اسکن QR Code با اپلیکیشن‌های
 * Google Authenticator و Microsoft Authenticator را حتی در حالت آفلاین فراهم می‌کند.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

export function base32Decode(base32: string): Uint8Array {
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(output);
}

function getCounterBuffer(timeStep: number): ArrayBuffer {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigUint64(0, BigInt(timeStep), false); // Big-Endian
  return buffer;
}

const getCrypto = () => (typeof window !== 'undefined' ? window.crypto : globalThis.crypto);

/**
 * محاسبه کد ۶ رقمی TOTP با استفاده از Web Crypto API استاندارد مرورگر
 */
export async function generateTotpTokenClient(
  secretBase32: string,
  timeStep = Math.floor(Date.now() / 1000 / 30)
): Promise<string> {
  const keyBytes = base32Decode(secretBase32);
  const counterBuf = getCounterBuffer(timeStep);

  const cryptoKey = await getCrypto().subtle.importKey(
    'raw',
    keyBytes.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await getCrypto().subtle.sign('HMAC', cryptoKey, counterBuf);
  const hmac = new Uint8Array(signature);
  const offset = hmac[hmac.length - 1] & 0x0f;

  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % 1000000;

  return code.toString().padStart(6, '0');
}

/**
 * اعتبارسنجی کد ۶ رقمی با پنجره جابجایی زمانی
 */
export async function verifyTotpTokenClient(
  token: string,
  secretBase32: string,
  windowSteps = 1
): Promise<boolean> {
  const cleanToken = token.trim().replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanToken)) return false;

  const currentStep = Math.floor(Date.now() / 1000 / 30);

  for (let i = -windowSteps; i <= windowSteps; i++) {
    const calculated = await generateTotpTokenClient(secretBase32, currentStep + i);
    if (calculated === cleanToken) {
      return true;
    }
  }

  return false;
}

/**
 * تولید کلید تصادفی ۲۰ بایتی و رشته URI استاندارد
 */
export function generateTotpSecretClient(
  accountName: string,
  issuer = 'Daftar'
): { secret: string; otpauthUrl: string } {
  const randomBytes = new Uint8Array(20);
  getCrypto().getRandomValues(randomBytes);
  const secret = base32Encode(randomBytes);

  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountName);
  const otpauthUrl = `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;

  return { secret, otpauthUrl };
}

/**
 * تولید ۸ کد بازیابی اضطراری تصادفی
 */
export function generateRecoveryCodesClient(count = 8): string[] {
  const codes: string[] = [];
  const chars = '0123456789ABCDEF';

  for (let i = 0; i < count; i++) {
    const bytes = new Uint8Array(4);
    getCrypto().getRandomValues(bytes);
    let code = '';
    for (let j = 0; j < 4; j++) {
      code += chars[bytes[j] >> 4] + chars[bytes[j] & 0x0f];
      if (j === 1) code += '-';
    }
    codes.push(code);
  }

  return codes;
}
