const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { promisePool } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
require('dotenv').config();

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอก Username และ Password'
            });
        }

        // Get user from database
        const [users] = await promisePool.query(
            'SELECT user_id, username, password_hash, full_name, email, role, is_active FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            // Log failed attempt
            await promisePool.query(
                'INSERT INTO login_logs (username, status, ip_address) VALUES (?, ?, ?)',
                [username, 'failed', req.ip]
            );

            return res.status(401).json({
                success: false,
                message: 'Username หรือ Password ไม่ถูกต้อง'
            });
        }

        const user = users[0];

        // Check if user is active
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'บัญชีผู้ใช้ถูกระงับ กรุณาติดต่อผู้ดูแลระบบ'
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            // Log failed attempt
            await promisePool.query(
                'INSERT INTO login_logs (user_id, username, status, ip_address) VALUES (?, ?, ?, ?)',
                [user.user_id, username, 'failed', req.ip]
            );

            return res.status(401).json({
                success: false,
                message: 'Username หรือ Password ไม่ถูกต้อง'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user.user_id,
                username: user.username,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        // Log successful login
        await promisePool.query(
            'INSERT INTO login_logs (user_id, username, status, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
            [user.user_id, username, 'success', req.ip, req.headers['user-agent']]
        );

        res.json({
            success: true,
            message: 'เข้าสู่ระบบสำเร็จ',
            data: {
                token,
                user: {
                    userId: user.user_id,
                    username: user.username,
                    fullName: user.full_name,
                    email: user.email,
                    role: user.role
                }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
        });
    }
});

// Get current user info
router.get('/me', verifyToken, async (req, res) => {
    try {
        const [users] = await promisePool.query(
            `SELECT user_id, employee_id, username, full_name, email, position, department, role 
             FROM users WHERE user_id = ?`,
            [req.user.userId]
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
        console.error('Get user info error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้'
        });
    }
});

// Change password
router.post('/change-password', verifyToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร'
            });
        }

        // Get current password hash
        const [users] = await promisePool.query(
            'SELECT password_hash FROM users WHERE user_id = ?',
            [req.user.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบข้อมูลผู้ใช้'
            });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, users[0].password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง'
            });
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // Update password
        await promisePool.query(
            'UPDATE users SET password_hash = ? WHERE user_id = ?',
            [newPasswordHash, req.user.userId]
        );

        res.json({
            success: true,
            message: 'เปลี่ยนรหัสผ่านสำเร็จ'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน'
        });
    }
});

module.exports = router;
