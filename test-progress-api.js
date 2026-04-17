const API_URL = 'http://localhost:3000/api';

async function runTests() {
    try {
        console.log('🚀 Starting Verification Tests...\n');

        // 1. Login
        console.log('1. Logging in...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });
        const loginData = await loginRes.json();

        if (!loginData.success) {
            throw new Error('Login failed: ' + loginData.message);
        }
        const token = loginData.token;
        console.log('✅ Login successful\n');

        // 2. Create Test Course
        console.log('2. Creating Test Course...');
        // We need a unique title to avoid duplicates if run multiple times
        const courseTitle = `Test Course ${Date.now()}`;
        const createRes = await fetch(`${API_URL}/courses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: courseTitle,
                description: 'For testing timer',
                required_learning_minutes: 5
            })
        });
        const createData = await createRes.json();
        if (!createData.success) throw new Error('Create course failed: ' + createData.message);
        const courseId = createData.data.courseId;
        console.log(`✅ Course created (ID: ${courseId})\n`);

        // 3. Enroll
        console.log('3. Enrolling...');
        const enrollRes = await fetch(`${API_URL}/courses/${courseId}/enroll`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const enrollData = await enrollRes.json();
        if (!enrollData.success) throw new Error('Enroll failed: ' + enrollData.message);
        console.log('✅ Enrolled successfully\n');

        // 4. Test Valid Update
        console.log('4. Testing Valid Progress Update (1 min)...');
        const updateRes1 = await fetch(`${API_URL}/progress/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ courseId, timeSpent: 1 })
        });
        const updateData1 = await updateRes1.json();
        if (!updateData1.success) throw new Error('Update failed: ' + updateData1.message);
        console.log('✅ Update successful\n');

        // 5. Verify Persistence
        console.log('5. Verifying Persistence...');
        const getRes = await fetch(`${API_URL}/courses/${courseId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const getData = await getRes.json();
        const progress = getData.data.userProgress;
        if (progress.learning_time_minutes != 1) {
            throw new Error(`Expected 1 minute, got ${progress.learning_time_minutes}`);
        }
        console.log(`✅ Persistence verified (Time: ${progress.learning_time_minutes} mins)\n`);

        // 6. Test Invalid Update (Negative)
        console.log('6. Testing Invalid Update (Negative)...');
        const updateRes2 = await fetch(`${API_URL}/progress/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ courseId, timeSpent: -5 })
        });
        if (updateRes2.status === 400) {
            console.log('✅ Rejected negative time as expected\n');
        } else {
            console.error('❌ Failed to reject negative time');
        }

        // 7. Test Invalid Update (Excessive)
        console.log('7. Testing Excessive Update (> 5 mins)...');
        const updateRes3 = await fetch(`${API_URL}/progress/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ courseId, timeSpent: 10 })
        });
        if (updateRes3.status === 400) {
            console.log('✅ Rejected excessive time as expected\n');
        } else {
            console.error('❌ Failed to reject excessive time');
        }

        // Cleanup
        console.log('Cleaning up...');
        await fetch(`${API_URL}/courses/${courseId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('✅ Cleanup done');

    } catch (error) {
        console.error('❌ Test Failed:', error.message);
    }
}

runTests();
