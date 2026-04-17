const express = require('express');
const router = express.Router();
const { promisePool } = require('../config/database');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Get quiz for a course (pre or post)
router.get('/course/:courseId/:type', verifyToken, async (req, res) => {
    try {
        const { courseId, type } = req.params;

        // Get quiz
        const [quizzes] = await promisePool.query(
            'SELECT * FROM quizzes WHERE course_id = ? AND type = ?',
            [courseId, type]
        );

        if (quizzes.length === 0) {
            return res.json({ success: true, data: null });
        }

        const quiz = quizzes[0];

        // Get questions
        const [questions] = await promisePool.query(
            'SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY order_index',
            [quiz.quiz_id]
        );

        // Get answers for each question
        for (let question of questions) {
            const [answers] = await promisePool.query(
                'SELECT answer_id, answer_text, is_correct FROM quiz_answers WHERE question_id = ?',
                [question.question_id]
            );

            // If not admin, hide correct answers
            if (req.user.role !== 'admin') {
                answers.forEach(ans => delete ans.is_correct);
            }

            question.answers = answers;
        }

        quiz.questions = questions;

        res.json({ success: true, data: quiz });

    } catch (error) {
        console.error('Get quiz error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแบบทดสอบ' });
    }
});

// Submit quiz answers
router.post('/submit', verifyToken, async (req, res) => {
    try {
        const { courseId, quizType, answers } = req.body;

        // Validate course enrollment
        const [enrolled] = await promisePool.query(
            'SELECT * FROM user_course_progress WHERE user_id = ? AND course_id = ?',
            [req.user.userId, courseId]
        );

        if (enrolled.length === 0) {
            return res.status(403).json({ success: false, message: 'ยังไม่ได้ลงทะเบียนหลักสูตรนี้' });
        }

        // For post-test, validate learning time requirement
        if (quizType === 'post') {
            const [courseData] = await promisePool.query(
                'SELECT required_learning_minutes FROM courses WHERE course_id = ?',
                [courseId]
            );

            if (courseData.length > 0) {
                const requiredMinutes = courseData[0].required_learning_minutes || 60;
                const learningMinutes = enrolled[0].learning_time_minutes || 0;

                if (learningMinutes < requiredMinutes) {
                    return res.status(403).json({
                        success: false,
                        message: `กรุณาเรียนให้ครบตามเวลาที่กำหนด (${requiredMinutes} นาที) ก่อนทำแบบทดสอบหลังเรียน คุณเรียนไปแล้ว ${Math.floor(learningMinutes)} นาที`,
                        data: {
                            required: requiredMinutes,
                            current: learningMinutes
                        }
                    });
                }
            }
        }

        // Get quiz
        const [quizzes] = await promisePool.query(
            'SELECT * FROM quizzes WHERE course_id = ? AND type = ?',
            [courseId, quizType]
        );

        if (quizzes.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบแบบทดสอบ' });
        }

        const quiz = quizzes[0];

        // Calculate score
        let correctCount = 0;
        let totalQuestions = 0;

        for (let questionId in answers) {
            const selectedAnswerId = answers[questionId];

            const [answerCheck] = await promisePool.query(
                'SELECT is_correct FROM quiz_answers WHERE answer_id = ?',
                [selectedAnswerId]
            );

            if (answerCheck.length > 0 && answerCheck[0].is_correct) {
                correctCount++;
            }
            totalQuestions++;
        }

        const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
        const passed = score >= quiz.passing_score;

        // Update progress
        const updateField = quizType === 'pre' ? 'pre_test_score' : 'post_test_score';
        const newStatus = quizType === 'post' && passed ? 'completed' : 'in_progress';

        await promisePool.query(
            `UPDATE user_course_progress SET ${updateField} = ?, status = ? WHERE user_id = ? AND course_id = ?`,
            [score, newStatus, req.user.userId, courseId]
        );

        // If post-test passed, set completed_at
        if (quizType === 'post' && passed) {
            await promisePool.query(
                'UPDATE user_course_progress SET completed_at = NOW() WHERE user_id = ? AND course_id = ?',
                [req.user.userId, courseId]
            );
        }

        res.json({
            success: true,
            message: passed ? 'ผ่านการทดสอบ!' : 'ไม่ผ่านการทดสอบ',
            data: {
                score,
                passed,
                correctCount,
                totalQuestions,
                passingScore: quiz.passing_score
            }
        });

    } catch (error) {
        console.error('Submit quiz error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการส่งคำตอบ' });
    }
});

// Create/Update quiz (Admin only)
router.post('/create', verifyToken, isAdmin, async (req, res) => {
    try {
        const { courseId, type, passingScore, questions } = req.body;

        // Check if quiz exists
        const [existing] = await promisePool.query(
            'SELECT quiz_id FROM quizzes WHERE course_id = ? AND type = ?',
            [courseId, type]
        );

        let quizId;

        if (existing.length > 0) {
            // Update existing quiz
            quizId = existing[0].quiz_id;
            await promisePool.query(
                'UPDATE quizzes SET passing_score = ? WHERE quiz_id = ?',
                [passingScore, quizId]
            );

            // Delete old questions (cascade will delete answers)
            await promisePool.query('DELETE FROM quiz_questions WHERE quiz_id = ?', [quizId]);
        } else {
            // Create new quiz
            const [result] = await promisePool.query(
                'INSERT INTO quizzes (course_id, type, passing_score) VALUES (?, ?, ?)',
                [courseId, type, passingScore]
            );

            if (!result || !result.insertId) {
                throw new Error('Failed to create quiz - no insertId returned');
            }

            quizId = result.insertId;
        }

        // Insert questions and answers
        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];

            const [qResult] = await promisePool.query(
                'INSERT INTO quiz_questions (quiz_id, question_text, order_index) VALUES (?, ?, ?)',
                [quizId, question.question_text, i]
            );

            if (!qResult || !qResult.insertId) {
                throw new Error('Failed to create question - no insertId returned');
            }

            const questionId = qResult.insertId;

            // Insert answers
            for (let answer of question.answers) {
                await promisePool.query(
                    'INSERT INTO quiz_answers (question_id, answer_text, is_correct) VALUES (?, ?, ?)',
                    [questionId, answer.answer_text, answer.is_correct || false]
                );
            }
        }

        res.json({ success: true, message: 'บันทึกแบบทดสอบสำเร็จ' });

    } catch (error) {
        console.error('Create quiz error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกแบบทดสอบ' });
    }
});

// Delete quiz (Admin only)
router.delete('/:quizId', verifyToken, isAdmin, async (req, res) => {
    try {
        await promisePool.query('DELETE FROM quizzes WHERE quiz_id = ?', [req.params.quizId]);
        res.json({ success: true, message: 'ลบแบบทดสอบสำเร็จ' });
    } catch (error) {
        console.error('Delete quiz error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบแบบทดสอบ' });
    }
});

module.exports = router;
