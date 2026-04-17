const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { promisePool } = require('../config/database');

// Get certificate for completed course
router.get('/:courseId', verifyToken, async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const userId = req.user.userId;

        // Get user progress
        const [progress] = await promisePool.query(
            'SELECT * FROM user_course_progress WHERE user_id = ? AND course_id = ?',
            [userId, courseId]
        );

        if (progress.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ยังไม่ได้ลงทะเบียนหลักสูตรนี้'
            });
        }

        const userProgress = progress[0];

        // Check if course is completed
        if (!userProgress.completed_at || userProgress.status !== 'completed') {
            return res.status(403).json({
                success: false,
                message: 'ยังไม่ได้จบหลักสูตรนี้'
            });
        }

        // Get course details
        const [courses] = await promisePool.query(
            'SELECT title, description FROM courses WHERE course_id = ?',
            [courseId]
        );

        if (courses.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบหลักสูตร'
            });
        }

        const course = courses[0];

        // Get user details
        const [users] = await promisePool.query(
            'SELECT full_name, employee_id FROM users WHERE user_id = ?',
            [userId]
        );

        const user = users[0];

        // Return certificate data
        res.json({
            success: true,
            data: {
                userName: user.full_name,
                employeeId: user.employee_id,
                courseTitle: course.title,
                courseDescription: course.description,
                completedDate: userProgress.completed_at,
                postTestScore: userProgress.post_test_score,
                learningTime: Math.floor(userProgress.learning_time_minutes || 0)
            }
        });

    } catch (error) {
        console.error('Get certificate error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลใบรับรอง'
        });
    }
});

module.exports = router;
