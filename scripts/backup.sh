#!/bin/bash

# ==================================================
# 💾 Magazin / NextMarket - Backup Skripti
# Ma'lumotlar bazasi va yuklangan fayllarni arxivlash
# Cron: 0 2 * * * /home/magazin-production/scripts/backup.sh
# ==================================================

set -e

# Configuration
PROJECT_DIR="/home/magazin-production"
BACKUP_DIR="/home/magazin-backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================="
echo "  Magazin Backup - $DATE"
echo "========================================="

# Create backup directory
mkdir -p "$BACKUP_DIR/database"
mkdir -p "$BACKUP_DIR/uploads"
mkdir -p "$BACKUP_DIR/logs"

# 1. Database Backup (SQLite)
# Chunks for SQLite: copying the file is the best for small SQLite DBs,
# but using `sqlite3 .dump` is safer for consistent backups.
echo -e "${YELLOW}Bazani arxivlash...${NC}"
sqlite3 "$PROJECT_DIR/backend/magazin.db" ".dump" | gzip > "$BACKUP_DIR/database/db_$DATE.sql.gz"
echo -e "${GREEN}✓ Ma'lumotlar bazasi backupi tayyor${NC}"

# 2. Uploads Backup
echo -e "${YELLOW}Yuklangan fayllarni arxivlash...${NC}"
tar -czf "$BACKUP_DIR/uploads/uploads_$DATE.tar.gz" -C "$PROJECT_DIR/backend" uploads/
echo -e "${GREEN}✓ Yuklangan fayllar backupi tayyor${NC}"

# 3. Logs Backup
echo -e "${YELLOW}Loglarni arxivlash...${NC}"
tar -czf "$BACKUP_DIR/logs/logs_$DATE.tar.gz" -C "$PROJECT_DIR" logs/
echo -e "${GREEN}✓ Loglar backupi tayyor${NC}"

# 4. Remove old backups
echo -e "${YELLOW}$RETENTION_DAYS kundan qari bo'lgan backup'larni o'chirish...${NC}"
find "$BACKUP_DIR/database" -name "*.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR/uploads" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR/logs" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
echo -e "${GREEN}✓ Eski backuplar o'chirildi${NC}"

# 5. Backup summary
BACKUP_SIZE=$(du -sh $BACKUP_DIR | cut -f1)
echo ""
echo "========================================="
echo -e "${GREEN}Zaxira nusxalash (Backup) tugadi!${NC}"
echo "========================================="
echo "Sana: $DATE"
echo "Joylashuv: $BACKUP_DIR"
echo "Umumiy hajm: $BACKUP_SIZE"
echo "Saqlash muddati: $RETENTION_DAYS kun"
echo ""