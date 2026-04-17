const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function checkUsers() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const [rows] = await db.query('SELECT username, role FROM users');
    console.log(rows);
    await db.end();
}

checkUsers().catch(console.error);
