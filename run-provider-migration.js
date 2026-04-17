/**
 * Run Provider-ID Database Migration
 * This script applies the database schema changes for Provider-ID OAuth
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function runMigration() {
    console.log('🔄 Running Provider-ID Database Migration...\n');

    let connection;

    try {
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

        // Read migration file
        const migrationPath = path.join(__dirname, 'database', 'provider_id_migration.sql');
        const migrationSQL = await fs.readFile(migrationPath, 'utf8');

        console.log('📄 Executing migration script...\n');

        // Execute migration
        await connection.query(migrationSQL);

        console.log('✅ Migration completed successfully!\n');

        // Verify migration
        console.log('🔍 Verifying migration...\n');

        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' 
            AND COLUMN_NAME IN ('cid', 'hospital', 'provider_id', 'auth_method', 'approval_status')
        `, [process.env.DB_NAME || 'wph_training_db']);

        console.log(`✅ Added ${columns.length} new columns to users table`);

        const [tables] = await connection.query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'provider_registrations'
        `, [process.env.DB_NAME || 'wph_training_db']);

        if (tables.length > 0) {
            console.log('✅ Created provider_registrations table');
        }

        console.log('\n✅ Database migration completed successfully!\n');
        console.log('📝 Next steps:');
        console.log('   1. Update .env file with Provider-ID OAuth credentials');
        console.log('   2. Restart the server if running');
        console.log('   3. Test the Provider-ID login/registration flow\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('\n💡 Error details:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run migration
runMigration();
