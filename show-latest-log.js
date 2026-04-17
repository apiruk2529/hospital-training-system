require('dotenv').config();
const mysql = require('mysql2/promise');

async function showLog() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'web',
            password: process.env.DB_PASSWORD || 'web11277',
            database: process.env.DB_NAME || 'wph_training_db',
            port: process.env.DB_PORT || 3306
        });

        const [rows] = await connection.query(
            'SELECT oauth_data, created_at FROM provider_registrations ORDER BY registration_id DESC LIMIT 1'
        );

        if (rows.length > 0) {
            console.log(`Latest Registration: ${rows[0].created_at}`);
            const data = rows[0].oauth_data;
            if (typeof data === 'string') {
                try {
                    const json = JSON.parse(data);
                    console.log('Full Profile Data (raw_api_data):');
                    console.log(JSON.stringify(json.raw_api_data || json, null, 2));
                } catch (e) {
                    console.log('Raw Data (Parse Error):', data);
                }
            } else {
                console.log('Full Profile Data:', JSON.stringify(data, null, 2));
            }
        } else {
            console.log('No registrations found.');
        }

        await connection.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

showLog();
