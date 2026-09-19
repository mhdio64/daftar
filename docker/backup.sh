#!/bin/sh
set -e

echo "⏰ سرویس پشتیبان‌گیری خودکار دیتابیس سامانه «دفتر» آغاز شد."

while true; do
  DATE=$(date +%Y%m%d_%H%M%S)
  FILE="/backups/daftar_backup_${DATE}.sql.gz"
  
  echo "[$(date)] شروع فرآیند تهیه نسخه پشتیبان..."
  PGPASSWORD=$POSTGRES_PASSWORD pg_dump -h $POSTGRES_HOST -U $POSTGRES_USER $POSTGRES_DB | gzip > $FILE
  echo "[$(date)] ✅ پشتیبان با موفقیت در $FILE ذخیره شد."
  
  # پاک‌سازی فایل‌های قدیمی‌تر از ۳۰ روز
  find /backups -name "daftar_backup_*.sql.gz" -mtime +30 -delete 2>/dev/null || true
  
  # ۲۴ ساعت تا زمان‌بندی بعدی
  sleep 86400
done
