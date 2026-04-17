const bcrypt = require('bcrypt');
const { promisePool } = require('../config/database');
require('dotenv').config();

async function initDatabase() {
    try {
        console.log('🔄 กำลัง Initialize Database...\n');

        // Hash passwords
        const adminPassword = await bcrypt.hash('admin123', 10);
        const userPassword = await bcrypt.hash('user123', 10);

        console.log('✅ Password hashed successfully');

        // Delete existing default users
        await promisePool.query(`DELETE FROM users WHERE username IN ('admin', 'user001')`);
        console.log('✅ Cleared existing default users');

        // Insert admin user
        await promisePool.query(
            `INSERT INTO users (employee_id, username, password_hash, full_name, email, position, department, role) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            ['WPH-ADMIN', 'admin', adminPassword, 'ผู้ดูแลระบบ', 'admin@wph.go.th', 'ผู้ดูแลระบบ', 'IT', 'admin']
        );
        console.log('✅ Created admin user');

        // Insert test user
        await promisePool.query(
            `INSERT INTO users (employee_id, username, password_hash, full_name, email, position, department, role) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            ['WPH-001', 'user001', userPassword, 'ทดสอบ ผู้ใช้งาน', 'user001@wph.go.th', 'พยาบาลวิชาชีพ', 'แผนกผู้ป่วยใน', 'user']
        );
        console.log('✅ Created test user');

        console.log('\n✨ Database initialized successfully!\n');
        console.log('📝 Default accounts:');
        console.log('   Admin - Username: admin, Password: admin123');
        console.log('   User  - Username: user001, Password: user123\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error initializing database:', error);
        process.exit(1);
    }
}

initDatabase();
