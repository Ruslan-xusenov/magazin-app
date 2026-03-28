#!/bin/bash

# ==================================================
# 🏪 Magazin / NextMarket - Production Deployment
# Ushbu skript yangi serverga o'rnatish uchun ishlatiladi
# ==================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_NAME="magazin"
PROJECT_DIR="/home/magazin-production"
APP_PORT="8080" # Boshqa loyihalar bilan to'qnashmasligi uchun portni tekshiring
USER="www-data"
GROUP="www-data"

print_status() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }

echo "========================================="
echo "  Magazin Production setup"
echo "========================================="

# 1. Update system (Faqat ro'yxatni yangilaymiz, boshqa loyihalarga ta'sir qilmaslik uchun upgrade qilmaymiz)
echo ""
echo "1. System paketlar ro'yxati yangilanmoqda..."
apt-get update
print_status "System list updated"

# 2. Dependencies
echo ""
echo "2. Kerakli paketlar o'rnatilmoqda..."

# NodeSource ishlatilganda nodejs paketi npm'ni o'z ichiga oladi, 
# shuning uchun npm'ni alohida yozish konflikt keltirib chiqarishi mumkin.
apt-get install -y \
    golang-go \
    nodejs \
    nginx \
    git \
    certbot \
    python3-certbot-nginx \
    ufw \
    sqlite3

print_status "Packages installed"

# 3. Create directories
echo ""
echo "3. Kataloglar yaratilmoqda..."
mkdir -p $PROJECT_DIR/backend/uploads
mkdir -p $PROJECT_DIR/logs
print_status "Directories created"

# 4. Backend Build
echo ""
echo "4. Go Backend build qilinmoqda..."
cd $PROJECT_DIR/backend
CGO_ENABLED=1 go build -o magazin-server main.go
print_status "Backend built"

# 5. Frontend Build
echo ""
echo "5. Vite Frontend build qilinmoqda..."
cd $PROJECT_DIR/frontend
npm install --legacy-peer-deps
npm run build
print_status "Frontend built (dist/ folder created)"

# 6. Permissions
echo ""
echo "6. Ruxsatlar o'rnatilmoqda..."
chown -R $USER:$GROUP $PROJECT_DIR
chmod -R 755 $PROJECT_DIR
# SQLite database file must be writable by www-data
if [ -f "$PROJECT_DIR/backend/magazin.db" ]; then
    chown $USER:$GROUP "$PROJECT_DIR/backend/magazin.db"
    chmod 664 "$PROJECT_DIR/backend/magazin.db"
fi
print_status "Permissions set"

# 7. Systemd Service
echo ""
echo "7. Systemd xizmati sozlanmoqda..."
cat <<EOF > /etc/systemd/system/magazin.service
[Unit]
Description=Magazin Go Backend
After=network.target

[Service]
User=$USER
Group=$GROUP
WorkingDirectory=$PROJECT_DIR/backend
ExecStart=$PROJECT_DIR/backend/magazin-server
Restart=always
Environment=PORT=$APP_PORT
Environment=DB_PATH=$PROJECT_DIR/backend/magazin.db

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable magazin
systemctl restart magazin
print_status "Systemd service configured (Port: $APP_PORT)"

# 8. Nginx configuration
echo ""
echo "8. Nginx sozlanmoqda..."
cat <<EOF > /etc/nginx/sites-available/magazin
server {
    listen 80;
    server_name nextmarket.uz www.nextmarket.uz;

    location / {
        root $PROJECT_DIR/frontend/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:$APP_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /uploads/ {
        alias $PROJECT_DIR/backend/uploads/;
    }
}
EOF

ln -sf /etc/nginx/sites-available/magazin /etc/nginx/sites-enabled/
# Avvalgi loyihalarga xalaqit bermaslik uchun defaultni o'chirmaymiz (agar server_name to'g'ri bo'lsa shart emas)
# rm -f /etc/nginx/sites-enabled/default 

nginx -t
systemctl reload nginx
print_status "Nginx configured"

# 9. SSL via Certbot (Optional: requires domain pointing)
# print_warning "SSL sertifikat o'rnatilsinmi? (y/n)"
# certbot --nginx -d nextmarket.uz -d www.nextmarket.uz --non-interactive --agree-tos -m admin@nextmarket.uz

# 10. Firewall (Faqat kerakli portlarni ochamiz, xizmatni majburan yoqmaymiz)
echo ""
echo "10. Firewall sozlanmoqda..."
if command -v ufw > /dev/null; then
    ufw allow 80/tcp
    ufw allow 443/tcp
    print_status "Firewall ports allowed"
else
    print_warning "ufw topilmadi, firewall o'tkazib yuborildi"
fi

echo ""
echo "========================================="
echo -e "${GREEN}  O'rnatish yakunlandi!${NC}"
echo "========================================="
print_status "Sayt: http://nextmarket.uz"
