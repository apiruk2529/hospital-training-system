require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkUser() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'web',
            password: process.env.DB_PASSWORD || 'web11277',
            database: process.env.DB_NAME || 'wph_training_db',
            port: process.env.DB_PORT || 3306
        });

        console.log('Connected to database.');

        const cid = '1709900178451';
        const email = 'apiruk.art@gmail.com';
        const usernamePrefix = 'pid_0718E1DFE2'; // Approximate

        console.log(`Checking for duplicates: CID=${cid}, Email=${email}`);

        const [cidUsers] = await connection.query('SELECT * FROM users WHERE cid = ?', [cid]);
        console.log('Users with this CID:', cidUsers.length);
        if (cidUsers.length > 0) console.log(cidUsers[0]);

        const [emailUsers] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);
        console.log('Users with this Email:', emailUsers.length);
        if (emailUsers.length > 0) console.log(emailUsers[0]);

        const [usersUsers] = await connection.query('SELECT * FROM users WHERE username LIKE ?', [usernamePrefix + '%']);
        console.log('Users with similar Username:', usersUsers.length);
        if (usersUsers.length > 0) console.log(usersUsers[0]);

        await connection.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkUser();
