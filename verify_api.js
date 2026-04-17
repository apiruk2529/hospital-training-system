const axios = require('axios');

async function verifyApi() {
    try {
        // Login
        const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
            username: 'admin',
            password: 'admin123'
        });

        if (!loginRes.data.success) {
            console.error('Login failed:', loginRes.data);
            return;
        }

        const token = loginRes.data.token;
        console.log('Login successful. Token obtained.');

        // Get Departments
        const deptRes = await axios.get('http://localhost:3000/api/media/departments', {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (deptRes.data.success) {
            console.log(`Departments found: ${deptRes.data.data.length}`);
            console.log(deptRes.data.data);
        } else {
            console.error('Get departments failed:', deptRes.data);
        }

    } catch (error) {
        console.error('API Error:', error.response ? error.response.data : error.message);
    }
}

verifyApi();
