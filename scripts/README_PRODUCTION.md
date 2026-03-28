# 🚀 Magazin (NextMarket) Production Automation Scripts

Ushbu katalogda loyihani production serverda o'rnatish, yangilash va zaxira nusxasini olish uchun ishlatiladigan skriptlar mavjud.

## 1. Dastlabki o'rnatish (`deploy.sh`)
Ushbu skript yangi serverda (Ubuntu/Debian) loyiha uchun kerakli barcha paketlarni o'rnatadi, backend va frontendni build qiladi va Nginx hamda Systemd xizmatini sozlaydi.

**Ishlatish:**
1. Serverga loyihani yuklang (masalan, `/home/magazin-production`).
2. Skriptga ruxsat bering: `chmod +x scripts/deploy.sh`
3. Root foydalanuvchisi sifatida ishga tushiring: `sudo ./scripts/deploy.sh`

## 2. Loyihani yangilash (`update.sh`)
Loyihada o'zgarish bo'lganda (GitHub'ga push qilgandan so'ng), serverni avtomatik yangilash uchun.

**Ishlatish:**
1. `chmod +x scripts/update.sh`
2. `sudo ./scripts/update.sh`

*Bu skript faqat o'zgargan qismlarni (backend yoki frontend) taniy oladi va faqat kerakli qismni qayta build qiladi.*

## 3. Zaxira nusxa (Backup) (`backup.sh`)
Ma'lumotlar bazasi va yuklangan rasmlarni har kuni saqlab borish uchun.

**Ishlatish:**
1. `chmod +x scripts/backup.sh`
2. `./scripts/backup.sh`

**Cron (Avtomatlashtirish):**
Har kuni kechasi soat 02:00 da avtomatik ishlashi uchun cron'ga qo'shing:
`0 2 * * * /home/magazin-production/scripts/backup.sh`

---
> [!IMPORTANT]  
> Skriptlardagi `PROJECT_DIR` va `DOMAIN` o'zgaruvchilarini o'zingizning serveringizga moslab o'zgartirishni unutmang.
