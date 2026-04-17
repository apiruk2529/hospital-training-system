const express = require('express');
const router = express.Router();
const { promisePool } = require('../config/database');
const { verifyToken, isAdmin, isOwnerOrAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Get all training records (Admin sees all, User sees only their own)
router.get('/', verifyToken, async (req, res) => {
    try {
        let query = `
            SELECT 
                tr.record_id,
                tr.title,
                tr.description,
                tr.start_date,
                tr.end_date,
                tr.hours,
                tr.organization,
                tr.location,
                tr.certificate_number,
                u.user_id,
                u.employee_id,
                u.full_name,
                u.email,
                u.position,
                u.department,
                tr.activity_type_id,
                tr.format_type_id,
                at.type_name_th as activity_type,
                ft.format_name_th as format_type,
                tr.created_at,
                tr.updated_at
            FROM training_records tr
            INNER JOIN users u ON tr.user_id = u.user_id
            INNER JOIN activity_types at ON tr.activity_type_id = at.type_id
            INNER JOIN format_types ft ON tr.format_type_id = ft.format_id
        `;

        let params = [];

        // If not admin, only show user's own records
        if (req.user.role !== 'admin') {
            query += ' WHERE tr.user_id = ?';
            params.push(req.user.userId);
        }

        query += ' ORDER BY tr.start_date DESC';

        const [records] = await promisePool.query(query, params);

        res.json({
            success: true,
            data: records
        });

    } catch (error) {
        console.error('Get training records error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการอบรม'
        });
    }
});

// Get training record by ID
router.get('/:recordId', verifyToken, async (req, res) => {
    try {
        const [records] = await promisePool.query(
            `SELECT 
                tr.*,
                u.employee_id,
                u.full_name,
                u.email,
                u.position,
                u.department,
                at.type_name_th as activity_type,
                ft.format_name_th as format_type
            FROM training_records tr
            INNER JOIN users u ON tr.user_id = u.user_id
            INNER JOIN activity_types at ON tr.activity_type_id = at.type_id
            INNER JOIN format_types ft ON tr.format_type_id = ft.format_id
            WHERE tr.record_id = ?`,
            [req.params.recordId]
        );

        if (records.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบข้อมูลการอบรม'
            });
        }

        const record = records[0];

        // Check permission
        if (req.user.role !== 'admin' && record.user_id !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้'
            });
        }

        // Get attachments
        const [attachments] = await promisePool.query(
            'SELECT * FROM attachments WHERE record_id = ?',
            [req.params.recordId]
        );

        res.json({
            success: true,
            data: {
                ...record,
                attachments
            }
        });

    } catch (error) {
        console.error('Get training record error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการอบรม'
        });
    }
});

// Create new training record
router.post('/', verifyToken, upload.single('attachment'), async (req, res) => {
    try {
        const {
            user_id,
            title,
            description,
            activity_type_id,
            format_type_id,
            organization,
            start_date,
            end_date,
            hours,
            location,
            certificate_number
        } = req.body;

        // Validate required fields
        if (!title || !activity_type_id || !format_type_id || !start_date || !end_date || !hours) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน'
            });
        }

        // Determine target user_id
        // Default to current user's ID if not specified
        let targetUserId = user_id || req.user.userId;

        // If not admin, can only create for self (override any user_id sent)
        if (req.user.role !== 'admin') {
            targetUserId = req.user.userId;
        }

        // Insert training record
        const [result] = await promisePool.query(
            `INSERT INTO training_records 
             (user_id, title, description, activity_type_id, format_type_id, organization, 
              start_date, end_date, hours, location, certificate_number, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [targetUserId, title, description, activity_type_id, format_type_id, organization,
                start_date, end_date, hours, location, certificate_number, req.user.userId]
        );

        const recordId = result.insertId;

        // Handle attachment
        if (req.file) {
            await promisePool.query(
                `INSERT INTO attachments (record_id, file_name, file_path, file_type, file_size, uploaded_by)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [recordId, req.file.filename, req.file.path, req.file.mimetype, req.file.size, req.user.userId]
            );
        }

        res.status(201).json({
            success: true,
            message: 'บันทึกข้อมูลการอบรมสำเร็จ',
            data: {
                recordId: recordId
            }
        });

    } catch (error) {
        console.error('Create training record error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลการอบรม'
        });
    }
});

// Update training record
router.put('/:recordId', verifyToken, upload.single('attachment'), async (req, res) => {
    try {
        // Check if record exists and get owner
        const [records] = await promisePool.query(
            'SELECT user_id FROM training_records WHERE record_id = ?',
            [req.params.recordId]
        );

        if (records.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบข้อมูลการอบรม'
            });
        }

        // Check permission
        if (req.user.role !== 'admin' && records[0].user_id !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'ไม่มีสิทธิ์แก้ไขข้อมูลนี้'
            });
        }

        const {
            title,
            description,
            activity_type_id,
            format_type_id,
            organization,
            start_date,
            end_date,
            hours,
            location,
            certificate_number
        } = req.body;

        // Update record
        await promisePool.query(
            `UPDATE training_records SET 
             title = COALESCE(?, title),
             description = COALESCE(?, description),
             activity_type_id = COALESCE(?, activity_type_id),
             format_type_id = COALESCE(?, format_type_id),
             organization = COALESCE(?, organization),
             start_date = COALESCE(?, start_date),
             end_date = COALESCE(?, end_date),
             hours = COALESCE(?, hours),
             location = COALESCE(?, location),
             certificate_number = COALESCE(?, certificate_number),
             updated_by = ?
             WHERE record_id = ?`,
            [title, description, activity_type_id, format_type_id, organization,
                start_date, end_date, hours, location, certificate_number,
                req.user.userId, req.params.recordId]
        );

        // Handle attachment
        if (req.file) {
            await promisePool.query(
                `INSERT INTO attachments (record_id, file_name, file_path, file_type, file_size, uploaded_by)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [req.params.recordId, req.file.filename, req.file.path, req.file.mimetype, req.file.size, req.user.userId]
            );
        }

        res.json({
            success: true,
            message: 'อัปเดตข้อมูลการอบรมสำเร็จ'
        });

    } catch (error) {
        console.error('Update training record error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลการอบรม'
        });
    }
});

// Delete training record
router.delete('/:recordId', verifyToken, async (req, res) => {
    try {
        // Check if record exists and get owner
        const [records] = await promisePool.query(
            'SELECT user_id FROM training_records WHERE record_id = ?',
            [req.params.recordId]
        );

        if (records.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบข้อมูลการอบรม'
            });
        }

        // Check permission
        if (req.user.role !== 'admin' && records[0].user_id !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'ไม่มีสิทธิ์ลบข้อมูลนี้'
            });
        }

        // Delete record (cascade will delete attachments)
        await promisePool.query(
            'DELETE FROM training_records WHERE record_id = ?',
            [req.params.recordId]
        );

        res.json({
            success: true,
            message: 'ลบข้อมูลการอบรมสำเร็จ'
        });

    } catch (error) {
        console.error('Delete training record error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการลบข้อมูลการอบรม'
        });
    }
});

// Get activity types
router.get('/meta/activity-types', verifyToken, async (req, res) => {
    try {
        const [types] = await promisePool.query('SELECT * FROM activity_types ORDER BY type_name');
        res.json({ success: true, data: types });
    } catch (error) {
        console.error('Get activity types error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// Get format types
router.get('/meta/format-types', verifyToken, async (req, res) => {
    try {
        const [types] = await promisePool.query('SELECT * FROM format_types ORDER BY format_name');
        res.json({ success: true, data: types });
    } catch (error) {
        console.error('Get format types error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

module.exports = router;
