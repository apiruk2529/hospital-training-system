require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkSchema() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'web',
            password: process.env.DB_PASSWORD || 'web11277',
            database: process.env.DB_NAME || 'wph_training_db',
            port: process.env.DB_PORT || 3306
        });

        console.log('Connected to database.');
        const [rows] = await connection.query('DESCRIBE users');
        console.log('Columns in users table:');
        rows.forEach(row => {
            console.log(`- ${row.Field} (${row.Type})`);
        });

        const hasPosition = rows.some(r => r.Field === 'position');
        console.log(`\nHas 'position' column: ${hasPosition}`);

        await connection.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkSchema();
