import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// لود متغیرهای محیطی از فایل .env در ریشه پروژه یا پوشه سرور
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // fallback به .env محلی سرور

export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  masterEncryptionKey: Buffer;
  uploadDir: string;
  maxFileSizeBytes: number;
}

function validateEnv(): AppConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const port = parseInt(process.env.PORT || '3000', 10);
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://daftar_user:daftar_secret_password@localhost:5432/daftar_db?schema=public';
  const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret_key_at_least_32_characters_long_12345';
  
  const rawMasterKey = process.env.MASTER_ENCRYPTION_KEY;
  if (!rawMasterKey) {
    throw new Error('❌ متغیر محیطی MASTER_ENCRYPTION_KEY تنظیم نشده است! لطفا یک کلید ۳۲ بایتی هگزادسیمال در فایل .env تعریف کنید.');
  }

  if (rawMasterKey.length !== 64) {
    throw new Error(`❌ طول MASTER_ENCRYPTION_KEY باید دقیقا ۶۴ کاراکتر هگزادسیمال (۳۲ بایت) باشد، طول فعلی: ${rawMasterKey.length}`);
  }

  const masterEncryptionKey = Buffer.from(rawMasterKey, 'hex');
  if (masterEncryptionKey.length !== 32) {
    throw new Error('❌ فرمت هگزادسیمال MASTER_ENCRYPTION_KEY نامعتبر است.');
  }

  const uploadDir = process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');
  const maxFileSizeBytes = parseInt(process.env.MAX_FILE_SIZE_BYTES || '52428800', 10); // ۵۰ مگابایت

  return {
    nodeEnv,
    port,
    databaseUrl,
    jwtSecret,
    masterEncryptionKey,
    uploadDir,
    maxFileSizeBytes,
  };
}

export const env = validateEnv();
