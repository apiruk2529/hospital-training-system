const express = require('express'); // Force restart - departments fix
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware (CSP disabled for development)
app.use(helmet({
    contentSecurityPolicy: false,
    frameguard: {
        action: 'SAMEORIGIN'
    }
}));

// Allow YouTube embedding
app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);

// CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/provider-auth', require('./routes/provider-auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/training', require('./routes/training'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/quizzes', require('./routes/quizzes'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/media', require('./routes/media'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'WPH Training System API is running',
        timestamp: new Date().toISOString()
    });
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'เกิดข้อผิดพลาด'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`WPH Training System running on http://localhost:${PORT}`);
});

module.exports = app;
