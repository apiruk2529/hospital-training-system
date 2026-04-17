const { promisePool } = require('../config/database');
require('dotenv').config();

async function setupMediaMetadata() {
    try {
        console.log('🔄 Setting up Media Metadata Tables...\n');

        // Create media_categories table
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS media_categories (
                category_id INT AUTO_INCREMENT PRIMARY KEY,
                category_name VARCHAR(100) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Created media_categories table');

        // Create media_types table
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS media_types (
                type_id INT AUTO_INCREMENT PRIMARY KEY,
                type_code VARCHAR(50) NOT NULL UNIQUE,
                type_name VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Created media_types table');

        // Initial Categories
        const categories = [
            'คู่มือการทำงาน',
            'คู่มือการใช้งาน',
            'สื่อการสอน',
            'วิดีโอสอนงาน',
            'วิดีโอสาธิต',
            'วิดีโอสื่อความรู้ผู้รับบริการ',
            'เอกสารวิชาการ',
            'โปสเตอร์',
            'แบบฟอร์ม',
            'ประกาศ',
            'อื่น ๆ'
        ];

        // Insert Categories
        for (const category of categories) {
            await promisePool.query(
                'INSERT IGNORE INTO media_categories (category_name) VALUES (?)',
                [category]
            );
        }
        console.log('✅ Populated media_categories');

        // Initial Types
        const types = [
            { code: 'image', name: 'รูปภาพ' },
            { code: 'pdf', name: 'PDF' },
            { code: 'video', name: 'วิดีโอ' }
        ];

        // Insert Types
        for (const type of types) {
            await promisePool.query(
                'INSERT IGNORE INTO media_types (type_code, type_name) VALUES (?, ?)',
                [type.code, type.name]
            );
        }
        console.log('✅ Populated media_types');

        console.log('\n✨ Media Metadata setup completed successfully!\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error setting up media metadata:', error);
        process.exit(1);
    }
}

setupMediaMetadata();
