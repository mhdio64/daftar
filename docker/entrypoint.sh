#!/bin/sh
set -e

echo "⏳ در حال بررسی و همگام‌سازی ساختار دیتابیس..."
if ! npx prisma migrate deploy; then
  echo "⚠️ اجرای migration مستقیم با خطا مواجه شد؛ در حال همگام‌سازی اضطراری با db push..."
  npx prisma db push --skip-generate
fi

echo "✅ ساختار دیتابیس با موفقیت آماده شد."

echo "🌱 در حال بررسی و اعمال داده‌های اولیه سامانه (Seed)..."
npx prisma db seed || true

echo "🚀 در حال راه‌اندازی سرور..."
exec node dist/app.js
