require('dotenv').config();
const axios = require('axios');

const targetUrl = 'https://moph.id.th/api/v1/token';

async function testTarget() {
    console.log(`\nTesting: ${targetUrl} (Form Data)`);
    try {
        await axios.post(targetUrl, new URLSearchParams({
            grant_type: 'authorization_code',
            code: 'TEST_CODE',
            redirect_uri: 'http://localhost:3000/api/provider-auth/callback',
            client_id: 'TEST_ID',
            client_secret: 'TEST_SECRET'
        }).toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
    } catch (error) {
        if (error.response) {
            console.log(`Response Status: ${error.response.status}`);
            console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Connection Error:', error.message);
        }
    }

    console.log(`\nTesting: ${targetUrl} (JSON Body)`);
    try {
        await axios.post(targetUrl, {
            grant_type: 'authorization_code',
            code: 'TEST_CODE',
            redirect_uri: 'http://localhost:3000/api/provider-auth/callback',
            client_id: 'TEST_ID',
            client_secret: 'TEST_SECRET'
        }, {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        if (error.response) {
            console.log(`Response Status: ${error.response.status}`);
            console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Connection Error:', error.message);
        }
    }
}

testTarget();
