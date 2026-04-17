const axios = require('axios');
const url = 'https://provider.id.th/api/v1/services/profile';

async function probe() {
    console.log(`Testing GET ${url} with dummy token...`);
    try {
        await axios.get(url, {
            headers: { 'Authorization': 'Bearer DUMMY_TOKEN' }
        });
        console.log('✅ Success (Unexpected with dummy token)');
    } catch (e) {
        if (e.response) {
            console.log(`❌ Status: ${e.response.status}`);
            console.log('Response Body:', JSON.stringify(e.response.data, null, 2));
        } else {
            console.log(`❌ Error: ${e.message}`);
        }
    }
}

probe();
