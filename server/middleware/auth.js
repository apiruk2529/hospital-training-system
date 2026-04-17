const jwt = require('jsonwebtoken');
require('dotenv').config();

// Verify JWT Token
const verifyToken = (req, res, next) => {
    let token = req.headers['authorization']?.split(' ')[1]; // Bearer TOKEN

    // If no header token, check query string (for downloads)
    if (!token && req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(403).json({
            success: false,
            message: 'ไม่พบ Token กรุณาเข้าสู่ระบบ'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Token ไม่ถูกต้องหรือหมดอายุ'
        });
    }
};

// Check if user is Admin
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'ไม่มีสิทธิ์เข้าถึง (Admin เท่านั้น)'
        });
    }
};

// Check if user is accessing their own data or is admin
const isOwnerOrAdmin = (req, res, next) => {
    const requestedUserId = parseInt(req.params.userId || req.body.user_id);

    if (req.user.role === 'admin' || req.user.userId === requestedUserId) {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้'
        });
    }
};

module.exports = {
    verifyToken,
    isAdmin,
    isOwnerOrAdmin
};
