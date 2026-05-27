/**
 * Fix: user_id AUTO_INCREMENT out of range
 * 
 * The error HA_ERR_AUTOINC_ERANGE means the AUTO_INCREMENT counter
 * has exceeded the INT max value (2,147,483,647).
 * 
 * This script:
 * 1. Shows the current AUTO_INCREMENT value and MAX user_id
 * 2. Changes user_id column from INT to BIGINT (future-proof)
 * 3. Resets AUTO_INCREMENT to MAX(user_id) + 1
 */

const { promisePool } = require('./server/config/database');
require('dotenv').config();

async function fixAutoIncrement() {
    try {
        console.log('🔍 Checking users table AUTO_INCREMENT status...\n');

        // Check current AUTO_INCREMENT value
        const [autoInc] = await promisePool.query(`
            SELECT AUTO_INCREMENT 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE() AND table_name = 'users'
        `);
        console.log('AUTO_INCREMENT value:', autoInc[0]?.AUTO_INCREMENT);

        // Check max user_id
        const [maxId] = await promisePool.query('SELECT MAX(user_id) AS max_id, COUNT(*) AS total FROM users');
        console.log('MAX user_id:', maxId[0]?.max_id);
        console.log('Total users:', maxId[0]?.total);

        // Check column type
        const [colInfo] = await promisePool.query(`
            SELECT COLUMN_TYPE, EXTRA
            FROM information_schema.COLUMNS
            WHERE table_schema = DATABASE() 
              AND table_name = 'users' 
              AND column_name = 'user_id'
        `);
        console.log('Column type:', colInfo[0]?.COLUMN_TYPE, '|', colInfo[0]?.EXTRA);

        console.log('\n🔧 Applying fix: Changing user_id from INT to BIGINT...');
        await promisePool.query(`
            ALTER TABLE users MODIFY COLUMN user_id BIGINT AUTO_INCREMENT
        `);
        console.log('✅ user_id column changed to BIGINT');

        // Reset AUTO_INCREMENT to a safe value
        const nextId = (maxId[0]?.max_id || 0) + 1;
        await promisePool.query(`ALTER TABLE users AUTO_INCREMENT = ?`, [nextId]);
        console.log(`✅ AUTO_INCREMENT reset to ${nextId}`);

        // Verify fix
        const [verify] = await promisePool.query(`
            SELECT AUTO_INCREMENT 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE() AND table_name = 'users'
        `);
        console.log('\n✨ Fix complete! New AUTO_INCREMENT value:', verify[0]?.AUTO_INCREMENT);
        console.log('\nYou can now create users without the range error.');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

fixAutoIncrement();
