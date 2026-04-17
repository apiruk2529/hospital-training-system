# ระบบจัดเก็บข้อมูลการอบรมและการประชุม
## โรงพยาบาลวัดเพลง (Wat Phleng Hospital Training System)

ระบบจัดเก็บและจัดการข้อมูลประวัติการอบรมและการประชุมของเจ้าหน้าที่โรงพยาบาลวัดเพลง

## ✨ คุณสมบัติหลัก

- 🔐 **ระบบ Authentication** - เข้าสู่ระบบด้วย JWT
- 👥 **สิทธิ์การใช้งาน 2 ระดับ**
  - **Admin**: จัดการข้อมูลทั้งหมด, จัดการผู้ใช้
  - **User**: ดูและจัดการประวัติของตนเอง
- 📚 **จัดการข้อมูลการอบรม/การประชุม**
  - เพิ่ม/แก้ไข/ลบข้อมูล
  - ค้นหาและกรองข้อมูล
  - บันทึกรายละเอียดครบถ้วน
- 📊 **Dashboard** - แสดงสถิติและภาพรวม
- 🎨 **UI/UX สวยงาม** - ออกแบบทันสมัย responsive

## 🛠️ เทคโนโลยีที่ใช้

### Backend
- Node.js + Express.js
- MySQL Database
- JWT Authentication
- bcrypt (Password Hashing)

### Frontend
- HTML5
- CSS3 (Modern Design)
- Vanilla JavaScript
- Responsive Design

## 📋 ข้อกำหนดระบบ

- Node.js 14+ 
- MySQL 5.7+
- npm หรือ yarn

## 🚀 การติดตั้ง

### 1. Clone โปรเจค
```bash
cd hospital-training-system
```

### 2. ติดตั้ง Dependencies
```bash
npm install
```

### 3. ตั้งค่า Database

สร้างฐานข้อมูล MySQL:
```bash
mysql -u root -p < database/schema.sql
```

หรือเข้า MySQL แล้วรัน:
```sql
source database/schema.sql
```

### 4. ตั้งค่า Environment Variables

คัดลอกไฟล์ `.env.example` เป็น `.env`:
```bash
copy .env.example .env
```

แก้ไขไฟล์ `.env`:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=wph_training_db
JWT_SECRET=your_secret_key_here
```

### 5. รันเซิร์ฟเวอร์

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

เปิดเบราว์เซอร์ที่: `http://localhost:3000`

## 👤 บัญชีเริ่มต้น

### Admin Account
- **Username**: `admin`
- **Password**: `admin123`

### User Account (ทดสอบ)
- **Username**: `user001`
- **Password**: `user123`

⚠️ **สำคัญ**: เปลี่ยนรหัสผ่านทันทีหลังติดตั้ง!

## 📁 โครงสร้างโปรเจค

```
hospital-training-system/
├── database/
│   └── schema.sql              # Database schema
├── server/
│   ├── config/
│   │   └── database.js         # Database connection
│   ├── middleware/
│   │   └── auth.js             # Authentication middleware
│   ├── routes/
│   │   ├── auth.js             # Authentication routes
│   │   ├── users.js            # User management routes
│   │   └── training.js         # Training records routes
│   └── server.js               # Main server file
├── public/
│   ├── css/
│   │   └── style.css           # Styles
│   ├── js/
│   │   └── app.js              # Frontend JavaScript
│   └── index.html              # Main HTML
├── .env.example                # Environment variables template
├── package.json                # Dependencies
└── README.md                   # This file
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - เข้าสู่ระบบ
- `GET /api/auth/me` - ข้อมูลผู้ใช้ปัจจุบัน
- `POST /api/auth/change-password` - เปลี่ยนรหัสผ่าน

### Training Records
- `GET /api/training` - ดึงข้อมูลการอบรมทั้งหมด
- `GET /api/training/:id` - ดึงข้อมูลการอบรมตาม ID
- `POST /api/training` - สร้างข้อมูลการอบรมใหม่
- `PUT /api/training/:id` - แก้ไขข้อมูลการอบรม
- `DELETE /api/training/:id` - ลบข้อมูลการอบรม
- `GET /api/training/meta/activity-types` - ดึงประเภทกิจกรรม
- `GET /api/training/meta/format-types` - ดึงรูปแบบการจัด

### Users (Admin Only)
- `GET /api/users` - ดึงข้อมูลผู้ใช้ทั้งหมด
- `GET /api/users/:id` - ดึงข้อมูลผู้ใช้ตาม ID
- `POST /api/users` - สร้างผู้ใช้ใหม่
- `PUT /api/users/:id` - แก้ไขข้อมูลผู้ใช้
- `DELETE /api/users/:id` - ลบผู้ใช้

## 🔒 Security Features

- JWT Token Authentication
- Password Hashing (bcrypt)
- SQL Injection Protection
- XSS Protection (Helmet.js)
- Rate Limiting
- CORS Configuration

## 📝 การใช้งาน

### สำหรับ Admin
1. เข้าสู่ระบบด้วยบัญชี Admin
2. จัดการผู้ใช้งานในเมนู "จัดการผู้ใช้"
3. ดูข้อมูลการอบรมของทุกคน
4. เพิ่ม/แก้ไข/ลบข้อมูลการอบรมได้ทั้งหมด

### สำหรับ User
1. เข้าสู่ระบบด้วยบัญชีของตนเอง
2. ดูประวัติการอบรมของตนเอง
3. เพิ่ม/แก้ไข/ลบข้อมูลการอบรมของตนเอง

## 🐛 Troubleshooting

### ไม่สามารถเชื่อมต่อ Database
- ตรวจสอบว่า MySQL Server ทำงานอยู่
- ตรวจสอบ username/password ในไฟล์ `.env`
- ตรวจสอบว่าได้สร้างฐานข้อมูลแล้ว

### Login ไม่ได้
- ตรวจสอบว่าได้รัน schema.sql แล้ว
- ตรวจสอบ JWT_SECRET ในไฟล์ `.env`

## 📞 ติดต่อ

โรงพยาบาลวัดเพลง  
แผนก IT  
Email: admin@wph.go.th

## 📄 License

MIT License - ใช้งานได้อย่างอิสระ

---

พัฒนาโดย: WPH IT Department  
Version: 1.0.0  
Last Updated: 2025
