const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { promisePool: db } = require('../config/database');
const { verifyToken, isAdmin } = require('../middleware/auth');
const iconv = require('iconv-lite');  // Handle charset encoding

// สร้างโฟลเดอร์สำหรับจัดเก็บไฟล์
const uploadDir = path.join(__dirname, '../../uploads/media');
const ensureUploadDir = async () => {
    try {
        await fs.access(uploadDir);
    } catch {
        await fs.mkdir(uploadDir, { recursive: true });
    }
};

// ฟังก์ชัน normalize ชื่อไฟล์ให้รองรับภาษาไทยและอักษรพิเศษ
const normalizeFilename = (filename) => {
    // ตรวจสอบ encoding และแปลงเป็น UTF-8 ถ้าจำเป็น
    try {
        // ถ้าเป็น Buffer จาก Buffer.from() แล้ว แปลงเป็น string
        if (Buffer.isBuffer(filename)) {
            filename = filename.toString('utf8');
        }

        // บันทึก original filename ด้วย UTF-8
        return filename;
    } catch (error) {
        console.warn('Error normalizing filename:', error);
        return filename;
    }
};

// กำหนดการจัดเก็บไฟล์ (File Storage Configuration)
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        await ensureUploadDir();
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // สร้างชื่อไฟล์ที่ไม่ซ้ำกัน: timestamp_random + extension เท่านั้น (ไม่มีชื่อเดิม เพื่อหลีกเลี่ยงปัญหา encoding ไทย)
        const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
    }
});

// กำหนดประเภทไฟล์ที่รองรับ (File Filter)
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        // Images
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        // PDFs
        'application/pdf',
        // Videos
        'video/mp4',
        'video/quicktime',
        'video/x-msvideo',
        'video/webm'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`ประเภทไฟล์ไม่รองรับ: ${file.mimetype}. รองรับเฉพาะ รูปภาพ (JPG, PNG, GIF), PDF, และวิดีโอ (MP4, MOV)`), false);
    }
};

// กำหนดขนาดไฟล์สูงสุด 100MB
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB in bytes
    }
});



// ฟังก์ชันกำหนดประเภทไฟล์
const getFileType = (mimeType) => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('video/')) return 'video';
    return 'other';
};

// ===== API ENDPOINTS =====

// 1. อัปโหลดสื่อ (Upload Media) - Admin Only
router.post('/upload', verifyToken, isAdmin, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาเลือกไฟล์ที่ต้องการอัปโหลด'
            });
        }

        const { title, description, department_id, category, tags } = req.body;

        if (!title) {
            // ลบไฟล์ที่อัปโหลดแล้ว
            await fs.unlink(req.file.path);
            return res.status(400).json({
                success: false,
                message: 'กรุณาระบุชื่อสื่อ'
            });
        }

        const file = req.file;
        const fileType = getFileType(file.mimetype);
        const filePath = `/uploads/media/${file.filename}`;

        // Normalize original filename เพื่อให้ UTF-8 encodings ถูกต้อง
        const originalFilename = normalizeFilename(file.originalname);

        // แปลง tags จาก string เป็น JSON array
        let tagsArray = null;
        if (tags) {
            try {
                tagsArray = JSON.parse(tags);
            } catch (e) {
                tagsArray = tags.split(',').map(tag => tag.trim());
            }
        }

        // บันทึกข้อมูลลงฐานข้อมูล
        const [result] = await db.query(
            `INSERT INTO media 
            (filename, original_filename, file_type, file_size, mime_type, file_path, 
             title, description, department_id, category, tags, uploaded_by) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                file.filename,
                originalFilename,
                fileType,
                file.size,
                file.mimetype,
                filePath,
                title,
                description || null,
                department_id || null,
                category || null,
                tagsArray ? JSON.stringify(tagsArray) : null,
                req.user.userId
            ]
        );

        res.json({
            success: true,
            message: 'อัปโหลดสื่อสำเร็จ',
            data: {
                media_id: result.insertId,
                filename: file.filename,
                original_filename: originalFilename,
                file_type: fileType,
                file_size: file.size,
                title: title
            }
        });

    } catch (error) {
        console.error('Upload error:', error);

        // ลบไฟล์ที่อัปโหลดไว้ ถ้ามี error
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting file:', unlinkError);
            }
        }

        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการอัปโหลดสื่อ',
            error: error.message
        });
    }
});

// 2. ดึงรายการสื่อ (Get Media List) - with Filters
router.get('/', verifyToken, async (req, res) => {
    try {
        const {
            department_id,
            category,
            file_type,
            search,
            limit = 50,
            offset = 0
        } = req.query;

        let query = `
            SELECT m.*, d.department_name, u.full_name as uploaded_by_name, u.username as uploaded_by_username
            FROM media m
            LEFT JOIN departments d ON m.department_id = d.department_id
            LEFT JOIN users u ON m.uploaded_by = u.user_id
            WHERE 1=1`;
        const params = [];

        // Filter by department
        if (department_id) {
            query += ` AND m.department_id = ?`;
            params.push(department_id);
        }

        // Filter by category
        if (category) {
            query += ` AND m.category = ?`;
            params.push(category);
        }

        // Filter by file type
        if (file_type) {
            query += ` AND m.file_type = ?`;
            params.push(file_type);
        }

        // Search by title or description
        if (search) {
            query += ` AND (m.title LIKE ? OR m.description LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        // Order by upload date (newest first)
        query += ` ORDER BY m.upload_date DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [media] = await db.query(query, params);

        // Get total count
        let countQuery = `SELECT COUNT(*) as total FROM media WHERE 1=1`;
        const countParams = [];

        if (department_id) {
            countQuery += ` AND department_id = ?`;
            countParams.push(department_id);
        }
        if (category) {
            countQuery += ` AND category = ?`;
            countParams.push(category);
        }
        if (file_type) {
            countQuery += ` AND file_type = ?`;
            countParams.push(file_type);
        }
        if (search) {
            countQuery += ` AND (title LIKE ? OR description LIKE ?)`;
            countParams.push(`%${search}%`, `%${search}%`);
        }

        const [countResult] = await db.query(countQuery, countParams);
        const total = countResult[0].total;

        res.json({
            success: true,
            data: media,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: (parseInt(offset) + media.length) < total
            }
        });

    } catch (error) {
        console.error('Get media error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสื่อ',
            error: error.message
        });
    }
});

// 7. ดึงรายการแผนก (Get Departments) - MUST BE BEFORE /:id route
router.get('/departments', verifyToken, async (req, res) => {
    try {
        const [departments] = await db.query(
            'SELECT * FROM departments ORDER BY department_name'
        );

        res.json({
            success: true,
            data: departments
        });

    } catch (error) {
        console.error('Get departments error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแผนก',
            error: error.message
        });
    }
});

// 9. ดึงรายการหมวดหมู่ (Get Categories) - MUST BE BEFORE /:id route
router.get('/categories', verifyToken, async (req, res) => {
    try {
        const [categories] = await db.query(
            'SELECT * FROM media_categories ORDER BY category_id'
        );

        res.json({
            success: true,
            data: categories
        });

    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลหมวดหมู่',
            error: error.message
        });
    }
});

// 10. ดึงรายการประเภทไฟล์ (Get Media Types) - MUST BE BEFORE /:id route
router.get('/types', verifyToken, async (req, res) => {
    try {
        const [types] = await db.query(
            'SELECT * FROM media_types ORDER BY type_id'
        );

        res.json({
            success: true,
            data: types
        });

    } catch (error) {
        console.error('Get types error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลประเภทไฟล์',
            error: error.message
        });
    }
});

// 6. ดาวน์โหลดสื่อ (Download Media) - MUST BE BEFORE /:id route
router.get('/download/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        const [media] = await db.query(
            'SELECT * FROM media WHERE media_id = ?',
            [id]
        );

        if (media.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบสื่อที่ระบุ'
            });
        }

        // เพิ่มจำนวนการดาวน์โหลด
        await db.query(
            'UPDATE media SET download_count = download_count + 1 WHERE media_id = ?',
            [id]
        );

        const filePath = path.join(__dirname, '../../', media[0].file_path);
        res.download(filePath, media[0].original_filename);

    } catch (error) {
        console.error('Download media error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดาวน์โหลดสื่อ',
            error: error.message
        });
    }
});

// 3. ดูรายละเอียดสื่อ (Get Media Detail)
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        const [media] = await db.query(
            `SELECT m.*, d.department_name, u.full_name as uploaded_by_name, u.username as uploaded_by_username
             FROM media m
             LEFT JOIN departments d ON m.department_id = d.department_id
             LEFT JOIN users u ON m.uploaded_by = u.user_id
             WHERE m.media_id = ?`,
            [id]
        );

        if (media.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบสื่อที่ระบุ'
            });
        }

        // เพิ่มจำนวนการดู
        await db.query(
            'UPDATE media SET view_count = view_count + 1 WHERE media_id = ?',
            [id]
        );

        res.json({
            success: true,
            data: media[0]
        });

    } catch (error) {
        console.error('Get media detail error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสื่อ',
            error: error.message
        });
    }
});

// 4. แก้ไขข้อมูลสื่อ (Update Media Info) - Admin Only
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, department_id, category, tags } = req.body;

        // ตรวจสอบว่ามีสื่ออยู่หรือไม่
        const [existing] = await db.query(
            'SELECT * FROM media WHERE media_id = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบสื่อที่ระบุ'
            });
        }

        // แปลง tags
        let tagsArray = null;
        if (tags) {
            try {
                tagsArray = JSON.parse(tags);
            } catch (e) {
                tagsArray = tags.split(',').map(tag => tag.trim());
            }
        }

        // อัปเดตข้อมูล
        await db.query(
            `UPDATE media 
            SET title = ?, description = ?, department_id = ?, category = ?, tags = ?
            WHERE media_id = ?`,
            [
                title || existing[0].title,
                description !== undefined ? description : existing[0].description,
                department_id !== undefined ? department_id : existing[0].department_id,
                category || existing[0].category,
                tagsArray ? JSON.stringify(tagsArray) : existing[0].tags,
                id
            ]
        );

        res.json({
            success: true,
            message: 'แก้ไขข้อมูลสื่อสำเร็จ'
        });

    } catch (error) {
        console.error('Update media error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลสื่อ',
            error: error.message
        });
    }
});

// 5. ลบสื่อ (Delete Media) - Admin Only
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // ดึงข้อมูลไฟล์
        const [media] = await db.query(
            'SELECT * FROM media WHERE media_id = ?',
            [id]
        );

        if (media.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบสื่อที่ระบุ'
            });
        }

        // ลบไฟล์จากระบบ
        const filePath = path.join(__dirname, '../../', media[0].file_path);
        try {
            await fs.unlink(filePath);
        } catch (unlinkError) {
            console.error('File delete warning:', unlinkError);
            // ดำเนินการต่อแม้ไฟล์อาจถูกลบไปแล้ว
        }

        // ลบข้อมูลจากฐานข้อมูล
        await db.query('DELETE FROM media WHERE media_id = ?', [id]);

        res.json({
            success: true,
            message: 'ลบสื่อสำเร็จ'
        });

    } catch (error) {
        console.error('Delete media error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการลบสื่อ',
            error: error.message
        });
    }
});

// 8. สถิติการใช้งาน (Get Statistics) - Admin Only
router.get('/stats/overview', verifyToken, isAdmin, async (req, res) => {
    try {
        // นับจำนวนสื่อแยกตามประเภท
        const [typeStats] = await db.query(`
            SELECT 
                file_type,
                COUNT(*) as count,
                SUM(file_size) as total_size
            FROM media
            GROUP BY file_type
        `);

        // นับจำนวนสื่อแยกตามแผนก
        const [deptStats] = await db.query(`
            SELECT 
                d.department_name,
                COUNT(m.media_id) as count
            FROM departments d
            LEFT JOIN media m ON d.department_id = m.department_id
            GROUP BY d.department_id, d.department_name
            ORDER BY count DESC
            LIMIT 10
        `);

        // นับจำนวนสื่อแยกตามหมวดหมู่
        const [categoryStats] = await db.query(`
            SELECT 
                category,
                COUNT(*) as count
            FROM media
            WHERE category IS NOT NULL
            GROUP BY category
            ORDER BY count DESC
        `);

        res.json({
            success: true,
            data: {
                by_type: typeStats,
                by_department: deptStats,
                by_category: categoryStats
            }
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ',
            error: error.message
        });
    }
});

module.exports = router;
