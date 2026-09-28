#!/bin/sh
set -e

echo "⏰ سرویس پشتیبان‌گیری خودکار دیتابیس سامانه «دفتر» آغاز شد."
echo "📦 سیاست نگهداری: ۷ نسخه آخر (یک هفته)"

while true; do
  DATE=$(date +%Y%m%d_%H%M%S)
  FILE="/backups/daftar_backup_${DATE}.sql.gz"

  echo "[$(date)] شروع فرآیند تهیه نسخه پشتیبان..."
  PGPASSWORD=$POSTGRES_PASSWORD pg_dump -h $POSTGRES_HOST -U $POSTGRES_USER $POSTGRES_DB | gzip > $FILE
  echo "[$(date)] ✅ پشتیبان با موفقیت در $FILE ذخیره شد."

  # نمایش حجم فایل
  SIZE=$(du -sh "$FILE" | cut -f1)
  echo "[$(date)] 📁 حجم فایل: $SIZE"

  # نگه داشتن فقط ۷ نسخه آخر — حذف قدیمی‌ترها برای جلوگیری از پر شدن دیسک
  ls -t /backups/daftar_backup_*.sql.gz 2>/dev/null | tail -n +8 | xargs rm -f 2>/dev/null || true
  TOTAL=$(ls /backups/daftar_backup_*.sql.gz 2>/dev/null | wc -l)
  echo "[$(date)] 🗂️ تعداد نسخه‌های نگهداری‌شده: $TOTAL/7"

  # ۲۴ ساعت تا زمان‌بندی بعدی
  sleep 86400
done
