# 🐳 Docker Deployment Guide — WPH Hospital Training System

## สิ่งที่ต้องมีก่อน Deploy

| Tool | Version | ตรวจสอบ |
|------|---------|---------|
| Git | any | `git --version` |
| Docker | 24+ | `docker --version` |
| Docker Compose | v2+ | `docker compose version` |

---

## 🚀 วิธี Deploy (ทำครั้งเดียว)

### ขั้นตอนที่ 1 — Clone โปรเจกต์

```bash
git clone https://github.com/YOUR_USERNAME/hospital-training-system.git
cd hospital-training-system
```

### ขั้นตอนที่ 2 — สร้างไฟล์ .env

```bash
# Linux / macOS
cp .env.docker .env

# Windows PowerShell
Copy-Item .env.docker .env
```

แล้วเปิดไฟล์ `.env` และแก้ค่าเหล่านี้:

```env
DB_ROOT_PASSWORD=รหัสผ่าน root MySQL (เปลี่ยนทันที!)
DB_PASSWORD=รหัสผ่าน user MySQL
JWT_SECRET=ค่าสุ่มที่ยาวและซับซ้อน (สำคัญมาก!)
PROVIDER_ID_REDIRECT_URI=http://IP_เซิร์ฟเวอร์:3000/api/provider-auth/callback
```

### ขั้นตอนที่ 3 — รัน Docker

```bash
docker compose up -d
```

Docker จะทำสิ่งเหล่านี้อัตโนมัติ:
- ✅ ดาวน์โหลด MySQL 8 image
- ✅ Build Node.js app image
- ✅ สร้าง database + tables + seed data
- ✅ เปิด app ที่ port 3000

### ขั้นตอนที่ 4 — ตรวจสอบว่าทำงาน

```bash
# ดู log แบบ real-time
docker compose logs -f

# ตรวจสอบ status
docker compose ps

# ทดสอบ API
curl http://localhost:3000/api/health
```

เปิด browser ไปที่ **http://localhost:3000** (หรือ IP เซิร์ฟเวอร์)

---

## 🔑 Login เริ่มต้น

> ⚠️ **เปลี่ยน password ทันทีหลัง login ครั้งแรก!**

| Field | ค่า |
|-------|-----|
| Username | `admin` |
| Password | `password` |

---

## 📋 คำสั่งที่ใช้บ่อย

```bash
# หยุด containers
docker compose stop

# หยุดและลบ containers (ข้อมูลใน volume ยังอยู่)
docker compose down

# หยุดและลบทุกอย่าง รวม database (ข้อมูลหายหมด!)
docker compose down -v

# Restart app อย่างเดียว
docker compose restart app

# ดู logs เฉพาะ app
docker compose logs -f app

# ดู logs เฉพาะ database
docker compose logs -f db

# เข้าไปใน container
docker compose exec app sh
docker compose exec db mysql -u root -p

# อัปเดตโค้ด (หลัง git pull)
git pull
docker compose up -d --build app
```

---

## 🔄 อัปเดตโค้ด

```bash
git pull
docker compose up -d --build app
```

---

## 📁 Volumes (ข้อมูลที่ถาวร)

| Volume | เก็บอะไร |
|--------|---------|
| `wph_db_data` | ข้อมูล MySQL ทั้งหมด |
| `wph_uploads_data` | ไฟล์ที่ upload เข้าระบบ |

---

## 🔧 Ports

| Service | Port | URL |
|---------|------|-----|
| Web App | 3000 | http://localhost:3000 |
| MySQL | 3306 | localhost:3306 (สำหรับ DB tool) |

ถ้า port 3000 ชน ให้แก้ใน `.env`:
```env
APP_PORT=8080
```

---

## 🛡️ Production Checklist

- [ ] เปลี่ยน `JWT_SECRET` เป็นค่าสุ่ม
- [ ] เปลี่ยน `DB_ROOT_PASSWORD` และ `DB_PASSWORD`
- [ ] เปลี่ยน password admin หลัง login ครั้งแรก
- [ ] ตั้งค่า `CORS_ORIGIN` ให้ตรงกับ domain จริง
- [ ] ตั้งค่า `PROVIDER_ID_REDIRECT_URI` ให้ตรงกับ IP/domain จริง
- [ ] เปิด Firewall เฉพาะ port ที่จำเป็น (3000)
- [ ] ตั้งค่า backup database สม่ำเสมอ
