const express = require('express');
const router = express.Router();
const { promisePool } = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// Update learning time
router.post('/update', verifyToken, async (req, res) => {
    try {
        const { courseId, timeSpent } = req.body; // timeSpent in minutes (can be float)

        if (!courseId || timeSpent === undefined) {
            return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
        }

        // Check if enrolled
        const [progress] = await promisePool.query(
            'SELECT * FROM user_course_progress WHERE user_id = ? AND course_id = ?',
            [req.user.userId, courseId]
        );

        if (progress.length === 0) {
            return res.status(404).json({ success: false, message: 'ยังไม่ได้ลงทะเบียนเรียน' });
        }

        // Update time (accumulate)
        // We receive the *additional* time spent since last sync, or the total time?
        // Better to receive "additional time" to add to existing.
        // OR receive "total time" from client? Client might lose state.
        // Let's assume client sends "additional time" (delta).

        // However, robust way is: Client tracks total time for *current session* and sends delta.
        // Let's stick to: Client sends "increment" (e.g. 0.5 mins).

        // Validate timeSpent
        const minutes = parseFloat(timeSpent);
        if (isNaN(minutes) || minutes <= 0) {
            return res.status(400).json({ success: false, message: 'เวลาเรียนไม่ถูกต้อง' });
        }

        // Prevent unrealistic updates (e.g. > 5 minutes at once)
        // Client syncs every 30s-1m, so 5m is a safe upper bound for lag/batching
        if (minutes > 5) {
            console.warn(`Suspicious time update from user ${req.user.userId}: ${minutes} minutes`);
            // We could reject it, or cap it. Let's cap it at 5 minutes to be safe but forgiving.
            // minutes = 5; 
            // For now, let's just reject to catch bugs in frontend
            return res.status(400).json({ success: false, message: 'ข้อมูลเวลาเรียนผิดปกติ (เกิน 5 นาที)' });
        }

        await promisePool.query(
            'UPDATE user_course_progress SET learning_time_minutes = learning_time_minutes + ? WHERE user_id = ? AND course_id = ?',
            [minutes, req.user.userId, courseId]
        );

        res.json({ success: true, message: 'บันทึกเวลาเรียนสำเร็จ' });

    } catch (error) {
        console.error('Update progress error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกเวลาเรียน' });
    }
});

// Get current progress (time)
router.get('/:courseId', verifyToken, async (req, res) => {
    try {
        const [progress] = await promisePool.query(
            'SELECT learning_time_minutes FROM user_course_progress WHERE user_id = ? AND course_id = ?',
            [req.user.userId, req.params.courseId]
        );

        if (progress.length === 0) {
            return res.json({ success: true, data: { learning_time_minutes: 0 } });
        }

        res.json({ success: true, data: progress[0] });

    } catch (error) {
        console.error('Get progress error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
});

module.exports = router;
