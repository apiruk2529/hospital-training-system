const axios = require('axios');

async function testDepartmentAPI() {
    try {
        // Login first
        const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
            username: 'admin',
            password: 'admin123'
        });

        if (!loginRes.data.success) {
            console.error('Login failed');
            return;
        }

        const token = loginRes.data.token;
        console.log('✅ Login successful');

        // Test departments endpoint
        const deptRes = await axios.get('http://localhost:3000/api/media/departments', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('\n📊 Department API Response:');
        console.log('Success:', deptRes.data.success);
        console.log('Count:', deptRes.data.data?.length || 0);

        if (deptRes.data.data && deptRes.data.data.length > 0) {
            console.log('\n✅ Sample departments:');
            deptRes.data.data.slice(0, 5).forEach(dept => {
                console.log(`  - ${dept.department_name} (ID: ${dept.department_id})`);
            });
        }

    } catch (error) {
        console.error('❌ API Error:', error.response?.data || error.message);
    }
}

testDepartmentAPI();
