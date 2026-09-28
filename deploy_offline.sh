#!/bin/bash
# ============================================================
# آپدیت آفلاین سامانه دفتر (بدون اینترنت)
# اجرا روی لپتاپ توسعه‌دهنده (که اینترنت دارد)
#
# استفاده:
#   bash deploy_offline.sh <IP_سرور> [نام_کاربری]
#
# مثال:
#   bash deploy_offline.sh 192.168.1.100 admin
# ============================================================
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVER_IP="${1:-}"
SERVER_USER="${2:-root}"
REMOTE_PATH="/opt/daftar"

if [ -z "$SERVER_IP" ]; then
  echo -e "${RED}❌ خطا: آدرس IP سرور را وارد کنید.${NC}"
  echo "   استفاده: bash deploy_offline.sh <IP_سرور> [نام_کاربری]"
  exit 1
fi

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   آپدیت آفلاین دفتر → سرور $SERVER_IP           ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"

# ─────────────────────────────────────────────────
# قدم ۱: آخرین کد از git
# ─────────────────────────────────────────────────
echo -e "\n${YELLOW}🔄 قدم ۱: دریافت آخرین کد از git...${NC}"
git pull
echo -e "${GREEN}✅ کد آپدیت شد.${NC}"

# ─────────────────────────────────────────────────
# قدم ۲: build image ها روی لپتاپ
# ─────────────────────────────────────────────────
echo -e "\n${YELLOW}🔨 قدم ۲: build Docker images (روی لپتاپ)...${NC}"
docker compose build
echo -e "${GREEN}✅ image ها build شدند.${NC}"

# ─────────────────────────────────────────────────
# قدم ۳: بسته‌بندی image ها
# ─────────────────────────────────────────────────
echo -e "\n${YELLOW}📦 قدم ۳: بسته‌بندی image ها در یک فایل...${NC}"
PACKAGE="daftar_update_$(date +%Y%m%d_%H%M%S).tar.gz"
docker save \
  $(docker compose config --images | tr '\n' ' ') \
  | gzip > "/tmp/$PACKAGE"
SIZE=$(du -sh "/tmp/$PACKAGE" | cut -f1)
echo -e "${GREEN}✅ بسته آماده شد: $PACKAGE (حجم: $SIZE)${NC}"

# ─────────────────────────────────────────────────
# قدم ۴: انتقال به سرور
# ─────────────────────────────────────────────────
echo -e "\n${YELLOW}📡 قدم ۴: انتقال فایل‌ها به سرور $SERVER_IP...${NC}"

# انتقال image ها
scp "/tmp/$PACKAGE" "$SERVER_USER@$SERVER_IP:/tmp/"

# انتقال فایل‌های پروژه (بدون node_modules و git)
rsync -avz --progress \
  --exclude=node_modules \
  --exclude=.git \
  --exclude="*.tar.gz" \
  --exclude="*.sql.gz" \
  --exclude=uploads \
  --exclude=backups \
  . "$SERVER_USER@$SERVER_IP:$REMOTE_PATH/"

echo -e "${GREEN}✅ انتقال کامل شد.${NC}"

# ─────────────────────────────────────────────────
# قدم ۵: اجرا روی سرور
# ─────────────────────────────────────────────────
echo -e "\n${YELLOW}🚀 قدم ۵: اعمال آپدیت روی سرور...${NC}"
ssh "$SERVER_USER@$SERVER_IP" bash << EOF
  set -e
  cd $REMOTE_PATH

  # بکاپ قبل از آپدیت
  echo "📦 تهیه بکاپ دیتابیس..."
  docker compose exec -T postgres pg_dump \\
    -U \${POSTGRES_USER:-daftar_user} \\
    \${POSTGRES_DB:-daftar_db} | gzip > "./pre_update_backup_\$(date +%Y%m%d_%H%M%S).sql.gz"

  # load کردن image های جدید
  echo "📥 بارگذاری image های جدید..."
  docker load < /tmp/$PACKAGE
  rm /tmp/$PACKAGE

  # restart با image های جدید (بدون build)
  echo "🔄 restart سرویس‌ها..."
  docker compose up -d

  echo "✅ آپدیت با موفقیت انجام شد!"
  docker compose ps
EOF

# ─────────────────────────────────────────────────
# پاک‌سازی لپتاپ
# ─────────────────────────────────────────────────
rm "/tmp/$PACKAGE"

echo -e "\n${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 آپدیت آفلاین با موفقیت کامل شد!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
