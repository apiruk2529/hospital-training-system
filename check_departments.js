const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function checkDepartments() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        // Check if departments table exists
        const [tables] = await db.query("SHOW TABLES LIKE 'departments'");
        console.log('Departments table exists:', tables.length > 0);

        if (tables.length > 0) {
            // Get department data
            const [departments] = await db.query('SELECT * FROM departments');
            console.log(`Found ${departments.length} departments:`);
            console.log(departments);
        } else {
            console.log('Departments table does not exist. Creating it...');

            // Create departments table
            await db.query(`
                CREATE TABLE IF NOT EXISTS departments (
                    department_id INT PRIMARY KEY AUTO_INCREMENT,
                    department_name VARCHAR(100) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Insert sample departments
            await db.query(`
                INSERT INTO departments (department_name) VALUES
                ('แผนกอายุรกรรม'),
                ('แผนกศัลยกรรม'),
                ('แผนกกุมารเวชกรรม'),
                ('แผนกสูติ-นรีเวชกรรม'),
                ('แผนกออร์โธปิดิกส์'),
                ('แผนกจักษุวิทยา'),
                ('แผนกโสต ศอ นาสิก'),
                ('แผนกทันตกรรม'),
                ('แผนกรังสีวิทยา'),
                ('แผนกพยาธิวิทยา'),
                ('แผนกเภสัชกรรม'),
                ('แผนกการพยาบาล'),
                ('แผนกบริหาร')
            `);

            console.log('Created departments table and inserted sample data');

            // Show inserted data
            const [newDepts] = await db.query('SELECT * FROM departments');
            console.log(`Inserted ${newDepts.length} departments`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await db.end();
    }
}

checkDepartments();
