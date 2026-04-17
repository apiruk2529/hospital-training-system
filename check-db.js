const { promisePool } = require('./server/config/database');

(async () => {
    try {
        console.log('Checking tables...');
        const [rows] = await promisePool.query("SHOW TABLES LIKE 'user_course_progress'");
        console.log('Table user_course_progress exists:', rows.length > 0);

        if (rows.length === 0) {
            console.log('Creating user_course_progress table...');
            await promisePool.query(`
                CREATE TABLE user_course_progress (
                    progress_id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    course_id INT NOT NULL,
                    status ENUM('enrolled', 'in_progress', 'completed') DEFAULT 'enrolled',
                    pre_test_score INT,
                    post_test_score INT,
                    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    completed_at TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
                    UNIQUE KEY unique_user_course (user_id, course_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `);
            console.log('Table created!');
        }

        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
})();
