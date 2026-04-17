const { promisePool } = require('./server/config/database');

async function checkDatabaseState() {
    try {
        console.log('Checking database tables...\n');

        // Check user_course_progress table structure
        const [columns] = await promisePool.query('DESCRIBE user_course_progress');
        console.log('user_course_progress columns:');
        columns.forEach(col => {
            console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULLABLE'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
        });

        // Check if learning_time_minutes column exists
        const hasLearningTime = columns.some(col => col.Field === 'learning_time_minutes');
        if (hasLearningTime) {
            console.log('\n✅ learning_time_minutes column exists!');
        } else {
            console.log('\n❌ learning_time_minutes column MISSING!');
            console.log('   Running migration...');
            
            try {
                await promisePool.query('ALTER TABLE user_course_progress ADD COLUMN learning_time_minutes DECIMAL(10,2) DEFAULT 0');
                console.log('✅ Migration successful!');
            } catch (error) {
                console.log('❌ Migration failed:', error.message);
            }
        }

        // Check courses table
        const [courseColumns] = await promisePool.query('DESCRIBE courses');
        console.log('\ncourses columns:');
        courseColumns.forEach(col => {
            console.log(`  - ${col.Field}: ${col.Type}`);
        });

        // Test insert to see if it works
        console.log('\nTesting course creation...');
        const [result] = await promisePool.query(
            'INSERT INTO courses (title, description, created_by) VALUES (?, ?, ?)',
            ['Test Course', 'Test Description', 1]
        );
        
        if (result.insertId) {
            console.log(`✅ Insert successful! Course ID: ${result.insertId}`);
            
            // Clean up test record
            await promisePool.query('DELETE FROM courses WHERE course_id = ?', [result.insertId]);
            console.log('✅ Test record cleaned up');
        } else {
            console.log('❌ Insert result is undefined!');
            console.log('Result:', result);
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        process.exit(0);
    }
}

checkDatabaseState();
