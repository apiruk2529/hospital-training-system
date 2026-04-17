const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: './.env' });

async function resetPasswords() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        // Hash passwords
        const adminHash = await bcrypt.hash('admin123', 10);
        const userHash = await bcrypt.hash('user123', 10);

        // Update admin
        await db.query('UPDATE users SET password_hash = ? WHERE username = ?', [adminHash, 'admin']);
        console.log('Updated admin password to: admin123');

        // Update user001
        await db.query('UPDATE users SET password_hash = ? WHERE username = ?', [userHash, 'user001']);
        console.log('Updated user001 password to: user123');

    } catch (error) {
        console.error('Error resetting passwords:', error);
    } finally {
        await db.end();
    }
}

resetPasswords();
