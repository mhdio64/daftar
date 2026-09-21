import crypto from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * تبدیل بافر باینری به رشته Base32 استاندارد RFC 4648
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
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

/**
 * رمزگشایی رشته Base32 به بافر باینری
 */
export function base32Decode(base32: string): Buffer {
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

  return Buffer.from(output);
}

/**
 * ایجاد بافر ۸ بایتی Big-Endian از شمارنده زمانی
 */
function getCounterBuffer(timeStep: number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(timeStep));
  return buf;
}

/**
 * محاسبه کد ۶ رقمی TOTP با استفاده از کلید Base32 و گام زمانی مشخص (RFC 6238)
 */
export function generateTotpToken(secretBase32: string, timeStep = Math.floor(Date.now() / 1000 / 30)): string {
  const key = base32Decode(secretBase32);
  const counterBuf = getCounterBuffer(timeStep);
  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
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
 * اعتبارسنجی کد ۶ رقمی واردشده با تحمل جابجایی زمانی (Clock Drift Window)
 */
export function verifyTotpToken(token: string, secretBase32: string, window = 1): boolean {
  const cleanToken = token.trim().replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanToken)) return false;

  const currentStep = Math.floor(Date.now() / 1000 / 30);

  for (let i = -window; i <= window; i++) {
    const calculated = generateTotpToken(secretBase32, currentStep + i);
    if (crypto.timingSafeEqual(Buffer.from(cleanToken), Buffer.from(calculated))) {
      return true;
    }
  }

  return false;
}

/**
 * تولید کلید محرمانه تصادفی ۲۰ بایتی (۱۶۰ بیتی) و رشته URI استاندارد otpauth
 */
export function generateTotpSecret(accountName: string, issuer = 'Daftar'): { secret: string; otpauthUrl: string } {
  // ۲۰ بایت تصادفی امن معادل ۳۲ کاراکتر Base32
  const randomBytes = crypto.randomBytes(20);
  const secret = base32Encode(randomBytes);

  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountName);
  const otpauthUrl = `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;

  return { secret, otpauthUrl };
}

/**
 * تولید کدهای بازیابی اضطراری تصادفی یکبار مصرف (مثلا: A3B8-F9C2)
 */
export function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    codes.push(`${part1}-${part2}`);
  }
  return codes;
}
