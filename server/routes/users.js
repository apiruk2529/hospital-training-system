const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { promisePool } = require('../config/database');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Get all users (Admin only)
router.get('/', verifyToken, isAdmin, async (req, res) => {
    try {
        const [users] = await promisePool.query(
            `SELECT user_id, employee_id, username, full_name, email, position, department, role, is_active, created_at 
             FROM users ORDER BY created_at DESC`
        );

        res.json({
            success: true,
            data: users
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้'
        });
    }
});

// Get user by ID (Admin only)
router.get('/:userId', verifyToken, isAdmin, async (req, res) => {
    try {
        const [users] = await promisePool.query(
            `SELECT user_id, employee_id, username, full_name, email, position, department, role, is_active, created_at 
             FROM users WHERE user_id = ?`,
            [req.params.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบข้อมูลผู้ใช้'
            });
        }

        res.json({
            success: true,
            data: users[0]
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้'
        });
    }
});

// Create new user (Admin only)
router.post('/', verifyToken, isAdmin, async (req, res) => {
    try {
        const { employee_id, username, password, full_name, email, position, department, role } = req.body;

        // Validate required fields
        if (!employee_id || !username || !password || !full_name || !email) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน'
            });
        }

        // Check if username or employee_id already exists
        const [existing] = await promisePool.query(
            'SELECT user_id FROM users WHERE username = ? OR employee_id = ?',
            [username, employee_id]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Username หรือรหัสพนักงานนี้มีอยู่ในระบบแล้ว'
            });
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Insert new user
        const [result] = await promisePool.query(
            `INSERT INTO users (employee_id, username, password_hash, full_name, email, position, department, role) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [employee_id, username, password_hash, full_name, email, position, department, role || 'user']
        );

        res.status(201).json({
            success: true,
            message: 'สร้างผู้ใช้งานสำเร็จ',
            data: {
                userId: result.insertId
            }
        });

    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการสร้างผู้ใช้งาน'
        });
    }
});

// Update user (Admin only)
router.put('/:userId', verifyToken, isAdmin, async (req, res) => {

    try {
        const { employee_id, username, full_name, email, position, department, role, is_active, password } = req.body;

        // Check if user exists
        const [users] = await promisePool.query(
            'SELECT user_id FROM users WHERE user_id = ?',
            [req.params.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบข้อมูลผู้ใช้'
            });
        }

        let password_hash = null;
        if (password && password.trim() !== '') {
            password_hash = await bcrypt.hash(password, 10);
        }

        // Update user
        let updateQuery = `UPDATE users SET 
             employee_id = COALESCE(?, employee_id),
             username = COALESCE(?, username),
             full_name = COALESCE(?, full_name),
             email = COALESCE(?, email),
             position = COALESCE(?, position),
             department = COALESCE(?, department),
             role = COALESCE(?, role),
             is_active = COALESCE(?, is_active)`;

        const params = [employee_id, username, full_name, email, position, department, role, is_active];

        if (password_hash) {
            updateQuery += `, password_hash = ?`;
            params.push(password_hash);
        }

        updateQuery += ` WHERE user_id = ?`;
        params.push(req.params.userId);

        await promisePool.query(updateQuery, params);

        res.json({
            success: true,
            message: 'อัปเดตข้อมูลผู้ใช้สำเร็จ'
        });

    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลผู้ใช้'
        });
    }
});

// Delete user (Admin only)
router.delete('/:userId', verifyToken, isAdmin, async (req, res) => {
    try {
        // Check if user exists
        const [users] = await promisePool.query(
            'SELECT user_id FROM users WHERE user_id = ?',
            [req.params.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบข้อมูลผู้ใช้'
            });
        }

        // Prevent deleting self
        if (parseInt(req.params.userId) === req.user.userId) {
            return res.status(400).json({
                success: false,
                message: 'ไม่สามารถลบบัญชีของตนเองได้'
            });
        }

        // Delete user (cascade will delete related records)
        await promisePool.query(
            'DELETE FROM users WHERE user_id = ?',
            [req.params.userId]
        );

        res.json({
            success: true,
            message: 'ลบผู้ใช้งานสำเร็จ'
        });

    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการลบผู้ใช้งาน'
        });
    }
});

module.exports = router;
