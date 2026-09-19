# 🚀 سند ۰۶: استقرار، نگهداری و زیرساخت (Deployment & Operations)

---

## ۱. استقرار با داکر کامپوز (Docker Compose Architecture)

تمامی سرویس‌های مورد نیاز سامانه «دفتر» در قالب یک فایل `docker-compose.yml` یکپارچه و به صورت کانتینری در شبکه محلی بالا می‌آیند. هیچ وابستگی جانبی به اینترنت در زمان اجرای برنامه در سرور وجود ندارد.

```yaml
version: '3.8'

services:
  # وب‌سرور معکوس و مدیریت خودکار HTTPS
  caddy:
    image: caddy:2-alpine
    container_name: daftar_caddy
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
      - client_dist:/usr/share/caddy:ro
    depends_on:
      - server

  # برنامه بک‌اند API
  server:
    build:
      context: ./server
      dockerfile: ../docker/Dockerfile.server
    container_name: daftar_server
    restart: always
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public
      - MASTER_ENCRYPTION_KEY=${MASTER_ENCRYPTION_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - UPLOAD_DIR=/app/uploads
    volumes:
      - uploads_data:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy

  # پایگاه‌داده اصلی
  postgres:
    image: postgres:16-alpine
    container_name: daftar_postgres
    restart: always
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 5

  # سرویس بکاپ‌گیری خودکار روزانه
  backup:
    image: postgres:16-alpine
    container_name: daftar_backup
    restart: always
    volumes:
      - ./docker/backup.sh:/backup.sh:ro
      - backups_data:/backups
    environment:
      - POSTGRES_HOST=postgres
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    entrypoint: ["/bin/sh", "/backup.sh"]
    depends_on:
      - postgres

volumes:
  postgres_data:
  uploads_data:
  backups_data:
  caddy_data:
  caddy_config:
  client_dist:
```

---

## ۲. متغیرهای محیطی و کلید اصلی رمزنگاری (`.env.example`)

برای راه‌اندازی، فایل `.env` باید در ریشه پروژه قرار داشته باشد:

```env
# پایگاه‌داده
POSTGRES_USER=daftar_admin
POSTGRES_PASSWORD=strong_postgres_password_here
POSTGRES_DB=daftar_db

# توکن امنیتی نشست کاربران
JWT_SECRET=super_secret_jwt_key_at_least_32_characters_long

# کلید اصلی رمزنگاری متقارن AES-256 (باید دقیقا ۶۴ کاراکتر هگزادسیمال = ۳۲ بایت باشد)
# نحوه تولید: دستور `openssl rand -hex 32` را در ترمینال اجرا کنید
MASTER_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# حداکثر حجم فایل‌های آپلود شده به بایت (۵۰ مگابایت)
MAX_FILE_SIZE_BYTES=52428800
```

> [!CAUTION]
> **نکته بسیار حیاتی درباره `MASTER_ENCRYPTION_KEY`:**
> اگر این کلید گم یا بازنویسی شود، تمامی رمزهای عبور ذخیره شده در پایگاه‌داده برای همیشه غیرقابل بازیابی خواهند شد! این کلید باید در یک مکان فیزیکی امن (مانند گاوصندوق یا فلش رمزگذاری شده آفلاین) نگهداری شود.

---

## ۳. تنظیمات وب‌سرور و HTTPS برای شبکه محلی (`docker/Caddyfile`)

تنظیمات Caddy برای تولید خودکار گواهی امنیتی داخلی:

```caddy
# به جای 192.168.1.100 می‌توانید آی‌پی سرور یا دامنه داخلی مانند vault.local را قرار دهید
:443 {
    tls internal

    # فایل‌های استاتیک برنامه فرانت‌اند (React SPA)
    root * /usr/share/caddy
    file_server
    try_files {path} /index.html

    # مسیرهای API به بک‌اند هدایت می‌شوند
    handle /api/* {
        reverse_proxy server:3000
    }

    # امنیت و هدرهای امنیتی
    header {
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
```

---

## ۴. استراتژی پشتیبان‌گیری و بازیابی اضطراری (Backup & Disaster Recovery)

### ۴.۱. اسکریپت بکاپ خودکار (`docker/backup.sh`)
کانتینر بکاپ هر ۲۴ ساعت یک بار به صورت فشرده با فرمت استاندارد `pg_dump` بکاپ می‌گیرد و بکاپ‌های قدیمی‌تر از ۳۰ روز را به صورت خودکار پاک می‌کند:
```bash
#!/bin/sh
while true; do
  DATE=$(date +%Y%m%d_%H%M%S)
  FILE="/backups/daftar_backup_${DATE}.sql.gz"
  echo "[$(date)] شروع تهیه نسخه پشتیبان..."
  PGPASSWORD=$POSTGRES_PASSWORD pg_dump -h $POSTGRES_HOST -U $POSTGRES_USER $POSTGRES_DB | gzip > $FILE
  echo "[$(date)] بکاپ با موفقیت در $FILE ذخیره شد."
  
  # حذف بکاپ‌های قدیمی‌تر از ۳۰ روز
  find /backups -name "daftar_backup_*.sql.gz" -mtime +30 -delete
  
  # انتظار به مدت ۲۴ ساعت
  sleep 86400
done
```

### ۴.۲. دستور بازیابی دیتابیس در صورت نیاز:
```bash
gunzip < /backups/daftar_backup_YYYYMMDD_HHMMSS.sql.gz | docker exec -i daftar_postgres psql -U daftar_admin -d daftar_db
```

---

## ۵. چک‌لیست سخت‌سازی امنیتی در شبکه محلی (Hardening Checklist)

- [ ] تغییر پسوردهای پیش‌فرض PostgreSQL و ایجاد کلید تصادفی ۶۴ کاراکتری برای `MASTER_ENCRYPTION_KEY`.
- [ ] محدود کردن دسترسی پورت‌های دیتابیس (پورت ۵۴۳۲ فقط داخل شبکه داخلی داکر باز است و نباید روی پورت‌های فیزیکی سرور Expose شود).
- [ ] تست اتصال به سامانه از طریق آدرس `https://<IP-Server>` و پذیرش گواهی خودامضا در مرورگر کلاینت‌ها.
- [ ] نگهداری یک نسخه پشتیبان آفلاین از فایل `.env`.
