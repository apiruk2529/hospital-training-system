const { promisePool } = require('./server/config/database');

(async () => {
    try {
        console.log('Querying users...');
        const [rows] = await promisePool.query('SELECT user_id, username, full_name FROM users');
        console.log('Users found:', rows);
        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
})();
