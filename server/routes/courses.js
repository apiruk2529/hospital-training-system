const express = require('express');
const router = express.Router();
const { promisePool } = require('../config/database');
const { verifyToken, isAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Get all courses
router.get('/', verifyToken, async (req, res) => {
    try {
        const [courses] = await promisePool.query(`
            SELECT c.*, u.full_name as created_by_name,
            (SELECT COUNT(*) FROM user_course_progress WHERE course_id = c.course_id) as enrolled_count
            FROM courses c
            LEFT JOIN users u ON c.created_by = u.user_id
            ORDER BY c.created_at DESC
        `);

        // If user is not admin, check enrollment status
        if (req.user.role !== 'admin') {
            const [progress] = await promisePool.query(
                'SELECT course_id, status FROM user_course_progress WHERE user_id = ?',
                [req.user.userId]
            );

            const progressMap = new Map(progress.map(p => [p.course_id, p.status]));

            courses.forEach(course => {
                course.user_status = progressMap.get(course.course_id) || 'not_enrolled';
            });
        }

        res.json({ success: true, data: courses });
    } catch (error) {
        console.error('Get courses error:', error);
        console.error('Error stack:', error.stack);
        console.error('Error message:', error.message);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลหลักสูตร',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get course details
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const [courses] = await promisePool.query(
            'SELECT c.*, u.full_name as created_by_name FROM courses c LEFT JOIN users u ON c.created_by = u.user_id WHERE c.course_id = ?',
            [req.params.id]
        );

        if (courses.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบหลักสูตร' });
        }

        const course = courses[0];

        // Get materials
        const [materials] = await promisePool.query(
            'SELECT * FROM course_materials WHERE course_id = ? ORDER BY order_index',
            [req.params.id]
        );

        // Get quizzes
        const [quizzes] = await promisePool.query(
            'SELECT quiz_id, type, passing_score FROM quizzes WHERE course_id = ?',
            [req.params.id]
        );

        // Get user progress (for all users, including admin)
        const [progress] = await promisePool.query(
            'SELECT * FROM user_course_progress WHERE user_id = ? AND course_id = ?',
            [req.user.userId, req.params.id]
        );

        const userProgress = progress.length > 0 ? progress[0] : null;

        res.json({
            success: true,
            data: {
                ...course,
                materials,
                quizzes,
                userProgress,
                required_learning_minutes: course.required_learning_minutes || 60
            }
        });

    } catch (error) {
        console.error('Get course detail error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลหลักสูตร' });
    }
});

// Create course (Admin only)
router.post('/', verifyToken, isAdmin, upload.single('cover_image'), async (req, res) => {
    try {
        const { title, description, required_learning_minutes } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อหลักสูตร' });
        }

        const coverImage = req.file ? req.file.filename : null;
        const learningMinutes = required_learning_minutes ? parseInt(required_learning_minutes) : 60;

        const [result] = await promisePool.query(
            'INSERT INTO courses (title, description, cover_image, created_by, required_learning_minutes) VALUES (?, ?, ?, ?, ?)',
            [title, description, coverImage, req.user.userId, learningMinutes]
        );

        if (!result || !result.insertId) {
            console.error('Insert failed - no insertId returned:', result);
            return res.status(500).json({ success: false, message: 'ไม่สามารถบันทึกหลักสูตรได้' });
        }

        res.json({
            success: true,
            message: 'สร้างหลักสูตรสำเร็จ',
            data: {
                courseId: result.insertId
            }
        });

    } catch (error) {
        console.error('Create course error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้างหลักสูตร: ' + error.message });
    }
});

// Update course (Admin only)
router.put('/:id', verifyToken, isAdmin, upload.single('cover_image'), async (req, res) => {
    try {
        const { title, description, required_learning_minutes } = req.body;
        let updateQuery = 'UPDATE courses SET title = ?, description = ?';
        let params = [title, description];

        if (required_learning_minutes !== undefined) {
            updateQuery += ', required_learning_minutes = ?';
            params.push(parseInt(required_learning_minutes));
        }

        if (req.file) {
            updateQuery += ', cover_image = ?';
            params.push(req.file.filename);
        }

        updateQuery += ' WHERE course_id = ?';
        params.push(req.params.id);

        await promisePool.query(updateQuery, params);

        res.json({ success: true, message: 'อัปเดตหลักสูตรสำเร็จ' });

    } catch (error) {
        console.error('Update course error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตหลักสูตร' });
    }
});

// Delete course (Admin only)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        await promisePool.query('DELETE FROM courses WHERE course_id = ?', [req.params.id]);
        res.json({ success: true, message: 'ลบหลักสูตรสำเร็จ' });
    } catch (error) {
        console.error('Delete course error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบหลักสูตร' });
    }
});

// Enroll in course
router.post('/:id/enroll', verifyToken, async (req, res) => {
    try {
        // Check if already enrolled
        const [existing] = await promisePool.query(
            'SELECT * FROM user_course_progress WHERE user_id = ? AND course_id = ?',
            [req.user.userId, req.params.id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'ลงทะเบียนเรียนหลักสูตรนี้แล้ว' });
        }

        await promisePool.query(
            'INSERT INTO user_course_progress (user_id, course_id, status) VALUES (?, ?, "enrolled")',
            [req.user.userId, req.params.id]
        );

        res.json({ success: true, message: 'ลงทะเบียนเรียนสำเร็จ' });

    } catch (error) {
        console.error('Enroll course error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลงทะเบียน' });
    }
});

// Unenroll from course
router.post('/:id/unenroll', verifyToken, async (req, res) => {
    try {
        const [result] = await promisePool.query(
            'DELETE FROM user_course_progress WHERE user_id = ? AND course_id = ?',
            [req.user.userId, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบการลงทะเบียน' });
        }

        res.json({ success: true, message: 'ยกเลิกการลงทะเบียนสำเร็จ' });

    } catch (error) {
        console.error('Unenroll course error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการยกเลิกการลงทะเบียน' });
    }
});

// Add material (Admin only)
router.post('/:id/materials', verifyToken, isAdmin, upload.single('file'), async (req, res) => {
    try {
        const { title, type, content_url, order_index } = req.body;
        let finalUrl = content_url;

        // If file uploaded, use filename
        if (req.file) {
            finalUrl = req.file.filename;
        }

        await promisePool.query(
            'INSERT INTO course_materials (course_id, title, type, content_url, order_index) VALUES (?, ?, ?, ?, ?)',
            [req.params.id, title, type, finalUrl, order_index || 0]
        );

        res.json({ success: true, message: 'เพิ่มสื่อการเรียนรู้สำเร็จ' });

    } catch (error) {
        console.error('Add material error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเพิ่มสื่อการเรียนรู้' });
    }
});

// Delete material (Admin only)
router.delete('/materials/:materialId', verifyToken, isAdmin, async (req, res) => {
    try {
        await promisePool.query('DELETE FROM course_materials WHERE material_id = ?', [req.params.materialId]);
        res.json({ success: true, message: 'ลบสื่อการเรียนรู้สำเร็จ' });
    } catch (error) {
        console.error('Delete material error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบสื่อการเรียนรู้' });
    }
});

module.exports = router;
