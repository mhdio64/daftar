#!/bin/sh
set -e

echo "⏳ در حال اجرای migration های Prisma..."
npx prisma migrate deploy

echo "✅ Migration با موفقیت انجام شد."
echo "🚀 در حال راه‌اندازی سرور..."
exec node dist/app.js
