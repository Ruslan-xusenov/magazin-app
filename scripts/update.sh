#!/bin/bash

# ==================================================
# 🔄 Magazin / NextMarket - Avtomatik Yangilash
# GitHub'dan yangilanishlarni olish va qayta build qilish
# ==================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="/home/magazin-production"

print_status() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }

echo ""
echo "🚀 Magazin yangilanmoqda..."
cd $PROJECT_DIR

# 1. Pull from Git
echo "1. GitHub'dan yangilanishlarni olish..."
git fetch origin main
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    print_status "Yangilanish yo'q. Server so'nggi versiyada."
    exit 0
fi

git pull origin main

# 2. Check changed files
CHANGED_FILES=$(git diff --name-only "$LOCAL" "$REMOTE")

BACKEND_CHANGED=false
FRONTEND_CHANGED=false

if echo "$CHANGED_FILES" | grep -q "^backend/"; then BACKEND_CHANGED=true; fi
if echo "$CHANGED_FILES" | grep -q "^frontend/"; then FRONTEND_CHANGED=true; fi

# 3. Update Backend
if [ "$BACKEND_CHANGED" = true ]; then
    echo "2. Backend yangilanmoqda..."
    cd $PROJECT_DIR/backend
    CGO_ENABLED=1 go build -o magazin-server main.go
    systemctl restart magazin
    print_status "Backend yangilandi va qayta ishga tushdi"
else
    echo "2. Backend o'zgarmagan - o'tkazildi"
fi

# 4. Update Frontend
if [ "$FRONTEND_CHANGED" = true ]; then
    echo "3. Frontend yangilanmoqda..."
    cd $PROJECT_DIR/frontend
    npm install --legacy-peer-deps
    npm run build
    systemctl restart nginx
    print_status "Frontend yangilandi (Vite build tayyor)"
else
    echo "3. Frontend o'zgarmagan - o'tkazildi"
fi

echo ""
echo -e "${GREEN}✅ Yangilanish muvaffaqiyatli yakunlandi!${NC}"
date
