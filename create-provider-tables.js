const mysql = require('mysql2/promise');
require('dotenv').config();

async function createMissingTables() {
    let connection;

    try {
        console.log('🔄 Creating missing Provider-ID tables...\n');

        // Connect to database
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'web',
            password: process.env.DB_PASSWORD || 'web11277',
            database: process.env.DB_NAME || 'wph_training_db',
            multipleStatements: true
        });

        console.log('✅ Connected to database\n');

        // Create provider_registrations table
        console.log('📄 Creating provider_registrations table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS provider_registrations (
                registration_id INT AUTO_INCREMENT PRIMARY KEY,
                provider_id VARCHAR(100) NOT NULL COMMENT 'Provider-ID from OAuth',
                cid VARCHAR(13) NOT NULL COMMENT 'Citizen ID',
                full_name VARCHAR(100) NOT NULL COMMENT 'Full name from Provider-ID',
                email VARCHAR(100) NOT NULL COMMENT 'Email from Provider-ID',
                position VARCHAR(100) COMMENT 'Position/Title',
                hospital VARCHAR(200) COMMENT 'Hospital name',
                oauth_data TEXT COMMENT 'Complete OAuth response data (JSON format)',
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                approved_by INT COMMENT 'Admin who processed the registration',
                approved_at TIMESTAMP NULL COMMENT 'Processing timestamp',
                rejection_reason TEXT COMMENT 'Reason for rejection',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL,
                INDEX idx_provider_id (provider_id),
                INDEX idx_status (status),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ provider_registrations table created\n');

        // Create views
        console.log('📄 Creating views...');

        // Drop views if exist (to recreate them)
        await connection.query('DROP VIEW IF EXISTS v_pending_registrations');
        await connection.query('DROP VIEW IF EXISTS v_provider_id_users');

        // Create v_pending_registrations view
        await connection.query(`
            CREATE VIEW v_pending_registrations AS
            SELECT 
                pr.registration_id,
                pr.provider_id,
                pr.cid,
                pr.full_name,
                pr.email,
                pr.position,
                pr.hospital,
                pr.status,
                pr.created_at,
                pr.rejection_reason,
                approver.full_name as approved_by_name,
                pr.approved_at
            FROM provider_registrations pr
            LEFT JOIN users approver ON pr.approved_by = approver.user_id
            WHERE pr.status = 'pending'
            ORDER BY pr.created_at DESC
        `);
        console.log('✅ v_pending_registrations view created');

        // Create v_provider_id_users view
        await connection.query(`
            CREATE VIEW v_provider_id_users AS
            SELECT 
                u.user_id,
                u.employee_id,
                u.username,
                u.full_name,
                u.email,
                u.cid,
                u.position,
                u.hospital,
                u.provider_id,
                u.approval_status,
                u.is_active,
                approver.full_name as approved_by_name,
                u.approved_at,
                u.created_at
            FROM users u
            LEFT JOIN users approver ON u.approved_by = approver.user_id
            WHERE u.auth_method = 'provider_id'
            ORDER BY u.created_at DESC
        `);
        console.log('✅ v_provider_id_users view created\n');

        console.log('🎉 Migration completed successfully!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('\n💡 Error details:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

createMissingTables();
