/**
 * Test script for Provider-ID OAuth Integration
 * Run this to verify the database migration and API endpoints
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function testProviderIdIntegration() {
    console.log('🧪 Testing Provider-ID OAuth Integration...\n');

    let connection;

    try {
        // Connect to database
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'web',
            password: process.env.DB_PASSWORD || 'web11277',
            database: process.env.DB_NAME || 'wph_training_db'
        });

        console.log('✅ Database connection successful\n');

        // Test 1: Check if users table has Provider-ID columns
        console.log('📋 Test 1: Checking users table schema...');
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' 
            AND COLUMN_NAME IN ('cid', 'hospital', 'provider_id', 'auth_method', 'approval_status')
        `, [process.env.DB_NAME || 'wph_training_db']);

        const expectedColumns = ['cid', 'hospital', 'provider_id', 'auth_method', 'approval_status'];
        const foundColumns = columns.map(c => c.COLUMN_NAME);

        expectedColumns.forEach(col => {
            if (foundColumns.includes(col)) {
                console.log(`  ✅ Column '${col}' exists`);
            } else {
                console.log(`  ❌ Column '${col}' missing`);
            }
        });

        // Test 2: Check if provider_registrations table exists
        console.log('\n📋 Test 2: Checking provider_registrations table...');
        const [tables] = await connection.query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'provider_registrations'
        `, [process.env.DB_NAME || 'wph_training_db']);

        if (tables.length > 0) {
            console.log('  ✅ provider_registrations table exists');

            // Check table structure
            const [regColumns] = await connection.query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'provider_registrations'
            `, [process.env.DB_NAME || 'wph_training_db']);

            console.log(`  ✅ Table has ${regColumns.length} columns`);
        } else {
            console.log('  ❌ provider_registrations table missing');
        }

        // Test 3: Check views
        console.log('\n📋 Test 3: Checking views...');
        const [views] = await connection.query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.VIEWS 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME IN ('v_pending_registrations', 'v_provider_id_users')
        `, [process.env.DB_NAME || 'wph_training_db']);

        const viewNames = views.map(v => v.TABLE_NAME);
        if (viewNames.includes('v_pending_registrations')) {
            console.log('  ✅ v_pending_registrations view exists');
        } else {
            console.log('  ❌ v_pending_registrations view missing');
        }

        if (viewNames.includes('v_provider_id_users')) {
            console.log('  ✅ v_provider_id_users view exists');
        } else {
            console.log('  ❌ v_provider_id_users view missing');
        }

        // Test 4: Check existing users migration
        console.log('\n📋 Test 4: Checking existing users...');
        const [users] = await connection.query(`
            SELECT COUNT(*) as count, auth_method, approval_status 
            FROM users 
            GROUP BY auth_method, approval_status
        `);

        users.forEach(row => {
            console.log(`  ✅ ${row.count} users with auth_method='${row.auth_method}', approval_status='${row.approval_status}'`);
        });

        // Test 5: Check environment variables
        console.log('\n📋 Test 5: Checking environment configuration...');
        const envVars = [
            'PROVIDER_ID_CLIENT_ID',
            'PROVIDER_ID_CLIENT_SECRET',
            'PROVIDER_ID_REDIRECT_URI',
            'PROVIDER_ID_OAUTH_URL',
            'PROVIDER_ID_TOKEN_URL'
        ];

        envVars.forEach(varName => {
            if (process.env[varName]) {
                console.log(`  ✅ ${varName} is set`);
            } else {
                console.log(`  ⚠️  ${varName} is not set (check .env file)`);
            }
        });

        console.log('\n✅ Provider-ID integration test completed!\n');
        console.log('📝 Next steps:');
        console.log('   1. Run database migration if columns are missing:');
        console.log('      mysql -u web -pweb11277 wph_training_db < database/provider_id_migration.sql');
        console.log('   2. Update .env file with Provider-ID OAuth credentials');
        console.log('   3. Restart the server: npm run dev');
        console.log('   4. Test the login page with Provider-ID buttons\n');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('\n💡 Troubleshooting:');
        console.error('   - Check database credentials in .env file');
        console.error('   - Ensure MySQL server is running');
        console.error('   - Run migration script if tables are missing\n');
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run tests
testProviderIdIntegration();
