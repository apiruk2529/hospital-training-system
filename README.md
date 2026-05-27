# ระบบจัดเก็บคลังข้อมูลสุขภาพ
## โรงพยาบาลวัดเพลง (Wat Phleng Hospital Training System)

ระบบจัดเก็บและจัดการข้อมูลประวัติการอบรมและการประชุมของเจ้าหน้าที่โรงพยาบาลวัดเพลง

---

## ✨ คุณสมบัติหลัก

- 🔐 **ระบบ Authentication** — เข้าสู่ระบบด้วย JWT + MOPH Provider-ID
- 👥 **สิทธิ์การใช้งาน 2 ระดับ**
  - **Admin**: จัดการข้อมูลทั้งหมด, จัดการผู้ใช้
  - **User**: ดูและจัดการประวัติของตนเอง
- 📚 **จัดการข้อมูลการอบรม/การประชุม** — เพิ่ม/แก้ไข/ลบ, ค้นหา, กรองข้อมูล
- 🎓 **หลักสูตรออนไลน์** — วิดีโอ, PDF, แบบทดสอบก่อน-หลังเรียน
- 📁 **คลังสื่อ** — อัปโหลดและจัดการไฟล์ภาพ, PDF, วิดีโอ
- 📊 **Dashboard** — สถิติและภาพรวมการอบรม
- 🎨 **UI/UX สวยงาม** — ออกแบบทันสมัย Responsive

---

## 🛠️ เทคโนโลยีที่ใช้

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 + Express.js |
| Database | MySQL 8.0 |
| Auth | JWT + bcrypt + MOPH Provider-ID OAuth |
| Frontend | HTML5 / CSS3 / Vanilla JavaScript |
| Container | Docker + Docker Compose |

---

## 🚀 วิธีติดตั้ง

เลือกวิธีที่เหมาะกับคุณ:

> 🐳 **แนะนำ**: ใช้ Docker — ง่ายที่สุด ไม่ต้องติดตั้ง MySQL เอง

---

### 🐳 วิธีที่ 1: Docker (แนะนำ)

---

#### 🔧 ติดตั้ง Docker (ทำครั้งแรกครั้งเดียว)

<details>
<summary><b>🪟 Windows / 🍎 macOS</b> — คลิกเพื่อดู</summary>

ดาวน์โหลดและติดตั้ง **Docker Desktop** (รวม Docker Compose ในตัว):

👉 https://www.docker.com/products/docker-desktop/

หลังติดตั้ง เปิด Docker Desktop แล้วรอให้ status เป็น **Running** ก่อนใช้งาน

</details>

<details>
<summary><b>🐧 Linux (Ubuntu / Debian)</b> — คลิกเพื่อดู</summary>

**ขั้นตอนที่ 1 — ติดตั้ง Git**
```bash
sudo apt update
sudo apt install -y git

# ตรวจสอบ
git --version
```

**ขั้นตอนที่ 2 — ลบ Docker เวอร์ชันเก่า (ถ้ามี)**
```bash
sudo apt remove docker docker-engine docker.io containerd runc
```

**ขั้นตอนที่ 3 — เพิ่ม Docker repository**
```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

**ขั้นตอนที่ 4 — ติดตั้ง Docker Engine + Compose**
```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
                   docker-buildx-plugin docker-compose-plugin
```

**ขั้นตอนที่ 5 — เปิด Docker ให้รันตอน boot**
```bash
sudo systemctl enable docker
sudo systemctl start docker
```

**ขั้นตอนที่ 6 — ให้ใช้ Docker ได้โดยไม่ต้องพิมพ์ `sudo`**
```bash
sudo usermod -aG docker $USER
newgrp docker
```

**ตรวจสอบการติดตั้ง**
```bash
docker --version
docker compose version
```

ผลลัพธ์ที่ถูกต้อง:
```
Docker version 27.x.x, build ...
Docker Compose version v2.x.x
```

</details>

<details>
<summary><b>🐧 Linux (CentOS / RHEL / AlmaLinux)</b> — คลิกเพื่อดู</summary>

**ขั้นตอนที่ 1 — ติดตั้ง Git**
```bash
sudo yum install -y git

# ตรวจสอบ
git --version
```

**ขั้นตอนที่ 2 — ลบ Docker เวอร์ชันเก่า (ถ้ามี)**
```bash
sudo yum remove docker docker-client docker-client-latest \
               docker-common docker-latest docker-latest-logrotate \
               docker-logrotate docker-engine
```

**ขั้นตอนที่ 3 — เพิ่ม Docker repository**
```bash
sudo yum install -y yum-utils
sudo yum-config-manager \
  --add-repo https://download.docker.com/linux/centos/docker-ce.repo
```

**ขั้นตอนที่ 4 — ติดตั้ง Docker Engine + Compose**
```bash
sudo yum install -y docker-ce docker-ce-cli containerd.io \
                   docker-buildx-plugin docker-compose-plugin
```

**ขั้นตอนที่ 5 — เปิด Docker ให้รันตอน boot**
```bash
sudo systemctl enable docker
sudo systemctl start docker
```

**ขั้นตอนที่ 6 — ให้ใช้ Docker ได้โดยไม่ต้องพิมพ์ `sudo`**
```bash
sudo usermod -aG docker $USER
newgrp docker
```

**ตรวจสอบ**
```bash
docker --version
docker compose version
```


</details>

---

#### 🚀 Deploy โปรเจกต์

#### สิ่งที่ต้องมี
- Docker (ติดตั้งแล้วตามด้านบน)
- Git

#### ขั้นตอน

**1. Clone โปรเจกต์**
```bash
git clone https://github.com/apiruk2529/hospital-training-system.git
cd hospital-training-system
```

**2. สร้างไฟล์ `.env`**

```bash
# Windows PowerShell
Copy-Item .env.docker .env

# Linux / macOS
cp .env.docker .env
```

เปิดไฟล์ `.env` แล้วแก้ค่าเหล่านี้ก่อน deploy:

```env
DB_ROOT_PASSWORD=รหัสผ่าน root MySQL ที่ต้องการ
DB_PASSWORD=รหัสผ่าน user MySQL ที่ต้องการ
JWT_SECRET=ค่าสุ่มที่ยาวและซับซ้อน (สำคัญมาก!)
```

**3. รัน Docker**
```bash
docker compose up -d
```

Docker จะทำทุกอย่างอัตโนมัติ:
- ✅ ดาวน์โหลด MySQL 8 image
- ✅ Build Node.js app image
- ✅ สร้าง database + tables + seed data
- ✅ เปิด app ที่ port 3000

**4. เปิดเบราว์เซอร์**

```
http://localhost:3000
```

---

#### 📋 คำสั่ง Docker ที่ใช้บ่อย

```bash
# ดู log แบบ real-time
docker compose logs -f

# ดู status ทุก service
docker compose ps

# หยุด containers (ข้อมูลยังอยู่)
docker compose stop

# เริ่มใหม่
docker compose start

# หยุดและลบ containers (ข้อมูลใน volume ยังอยู่)
docker compose down

# อัปเดตโค้ด (หลัง git pull)
git pull
docker compose up -d --build app

# เข้าไปใน container
docker compose exec app sh
docker compose exec db mysql -u root -p
```

---

### 💻 วิธีที่ 2: ติดตั้งแบบ Manual

#### สิ่งที่ต้องมี
- Node.js 18+
- MySQL 8.0
- npm

#### ขั้นตอน

**1. Clone โปรเจกต์**
```bash
git clone https://github.com/apiruk2529/hospital-training-system.git
cd hospital-training-system
```

**2. ติดตั้ง Dependencies**
```bash
npm install
```

**3. สร้างฐานข้อมูล MySQL**
```bash
mysql -u root -p < database/init/01_init.sql
```

**4. สร้างไฟล์ `.env`**
```bash
# Windows
Copy-Item .env.example .env

# Linux / macOS
cp .env.example .env
```

แก้ไขไฟล์ `.env`:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=รหัสผ่าน MySQL ของคุณ
DB_NAME=wph_training_db
JWT_SECRET=ค่าสุ่มที่ยาวและซับซ้อน
```

**5. รันเซิร์ฟเวอร์**

Development:
```bash
npm run dev
```

Production:
```bash
npm start
```

เปิดเบราว์เซอร์ที่: `http://localhost:3000`

---

## 👤 บัญชีเริ่มต้น

> ⚠️ **เปลี่ยนรหัสผ่านทันทีหลัง login ครั้งแรก!**

| วิธีติดตั้ง | Username | Password |
|------------|----------|----------|
| Docker | `admin` | `password` |
| Manual | `admin` | `admin123` |

---

## 📁 โครงสร้างโปรเจกต์

```
hospital-training-system/
├── 🐳 Docker Files
│   ├── Dockerfile                  # Build Node.js image
│   ├── docker-compose.yml          # App + MySQL services
│   ├── .dockerignore               # ไม่ copy ไฟล์ที่ไม่จำเป็น
│   └── .env.docker                 # Template config สำหรับ Docker
│
├── 🗄️ database/
│   ├── init/
│   │   └── 01_init.sql             # Schema + migrations + seed (Docker)
│   ├── schema.sql                  # Schema เดิม (Manual)
│   ├── media_library_migration.sql
│   └── provider_id_migration.sql
│
├── 🖥️ server/
│   ├── config/
│   │   └── database.js             # Database connection
│   ├── middleware/
│   │   └── auth.js                 # Authentication middleware
│   ├── routes/
│   │   ├── auth.js                 # Authentication
│   │   ├── users.js                # User management
│   │   ├── training.js             # Training records
│   │   ├── courses.js              # Online courses
│   │   ├── media.js                # Media library
│   │   └── provider-auth.js        # MOPH Provider-ID OAuth
│   └── server.js                   # Entry point
│
├── 🌐 public/                      # Frontend (HTML/CSS/JS)
│   ├── components/
│   ├── css/
│   ├── js/
│   └── index.html
│
├── 📦 uploads/                     # ไฟล์ที่ upload (สร้างอัตโนมัติ)
├── .env.example                    # Template config สำหรับ Manual
├── .env.docker                     # Template config สำหรับ Docker
├── package.json
└── README.md
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| POST | `/api/auth/login` | เข้าสู่ระบบ |
| GET | `/api/auth/me` | ข้อมูลผู้ใช้ปัจจุบัน |
| POST | `/api/auth/change-password` | เปลี่ยนรหัสผ่าน |

### Training Records
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/api/training` | ดึงข้อมูลการอบรมทั้งหมด |
| POST | `/api/training` | สร้างข้อมูลการอบรมใหม่ |
| PUT | `/api/training/:id` | แก้ไขข้อมูลการอบรม |
| DELETE | `/api/training/:id` | ลบข้อมูลการอบรม |

### Users (Admin Only)
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/api/users` | ดึงข้อมูลผู้ใช้ทั้งหมด |
| POST | `/api/users` | สร้างผู้ใช้ใหม่ |
| PUT | `/api/users/:id` | แก้ไขข้อมูลผู้ใช้ |
| DELETE | `/api/users/:id` | ลบผู้ใช้ |

### Health Check
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/api/health` | ตรวจสอบสถานะ server |

---

## 🔒 Security Features

- JWT Token Authentication
- Password Hashing (bcrypt)
- SQL Injection Protection (Parameterized queries)
- XSS Protection (Helmet.js)
- Rate Limiting (100 req / 15 min)
- CORS Configuration

---

## 🐛 Troubleshooting

### 🐳 Docker

| ปัญหา | วิธีแก้ |
|-------|---------|
| App ไม่เปิด port 3000 | ตรวจสอบ `docker compose ps` ว่า status เป็น `healthy` |
| Database ยังไม่พร้อม | รอ 30-60 วินาทีหลัง `docker compose up -d` แล้ว refresh |
| Port 3000 ถูกใช้งานอยู่ | แก้ `APP_PORT=8080` ใน `.env` แล้วรัน `docker compose up -d` ใหม่ |
| ต้องการ reset ข้อมูลทั้งหมด | `docker compose down -v` แล้ว `docker compose up -d` ใหม่ |

```bash
# ดู error log
docker compose logs app
docker compose logs db
```

### 💻 Manual

| ปัญหา | วิธีแก้ |
|-------|---------|
| เชื่อมต่อ Database ไม่ได้ | ตรวจสอบว่า MySQL Server ทำงานอยู่ และค่าใน `.env` ถูกต้อง |
| Login ไม่ได้ | ตรวจสอบว่าได้รัน `01_init.sql` แล้ว และ `JWT_SECRET` ถูกตั้งค่า |
| ภาษาไทยแสดงผิด | ตรวจสอบ charset ของ MySQL ว่าเป็น `utf8mb4` |

---

## 📞 ติดต่อ

**โรงพยาบาลวัดเพลง**  
แผนก IT  
Email: admin@wph.go.th

## 📄 License

MIT License — ใช้งานได้อย่างอิสระ

---

พัฒนาโดย: WPH IT Department  
Version: 1.1.0  
Last Updated: 2026
