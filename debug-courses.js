const { promisePool } = require('./server/config/database');

(async () => {
    try {
        console.log('Querying courses...');
        const [rows] = await promisePool.query('SELECT * FROM courses');
        console.log('Courses found:', rows.length);
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
})();
