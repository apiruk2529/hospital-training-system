// Online Training Module - Frontend

// State
let allCourses = [];
let currentCourse = null;
let currentQuiz = null; // For taking quiz
let learningTimer = null;
let accumulatedTime = 0; // In minutes (for current session)
let lastSyncTime = Date.now();

// Initialize when DOM is ready
document.addEventListener('componentsLoaded', function () {
    // Navigation button logic
    // Navigation button logic handled by app.js


    // Initial check
    const container = document.getElementById('onlineTrainingContainer');
    if (container && container.style.display === 'block') {
        loadCourses();
    }

    // Search and Filter functionality
    const searchInput = document.getElementById('courseSearchInput');
    const creatorFilter = document.getElementById('courseCreatorFilter');

    function filterCourses() {
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const selectedCreator = creatorFilter ? creatorFilter.value : '';

        const filteredCourses = allCourses.filter(course => {
            const matchesSearch = course.title.toLowerCase().includes(searchTerm) ||
                (course.description && course.description.toLowerCase().includes(searchTerm));
            const matchesCreator = selectedCreator === '' || (course.created_by_name || 'Admin') === selectedCreator;

            return matchesSearch && matchesCreator;
        });
        displayCourses(filteredCourses);
    }

    if (searchInput) {
        searchInput.addEventListener('input', filterCourses);
    }

    if (creatorFilter) {
        creatorFilter.addEventListener('change', filterCourses);
    }
});

// Helper to populate creator filter
function populateCreatorFilter(courses) {
    const creatorFilter = document.getElementById('courseCreatorFilter');
    if (!creatorFilter) return;

    // Get unique creators
    const creators = [...new Set(courses.map(c => c.created_by_name || 'Admin'))].sort();

    // Save current selection
    const currentSelection = creatorFilter.value;

    // Reset options
    creatorFilter.innerHTML = '<option value="">ผู้สร้างเนื้อหาทั้งหมด</option>';

    creators.forEach(creator => {
        const option = document.createElement('option');
        option.value = creator;
        option.textContent = creator;
        creatorFilter.appendChild(option);
    });

    // Restore selection if possible
    if (creators.includes(currentSelection)) {
        creatorFilter.value = currentSelection;
    }
}

// Handle tab visibility change to pause timer
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopTimer();
    } else {
        // Resume if we are viewing a material
        // For native video, don't auto-resume, let user press play.
        // For others (PDF/YouTube), resume.
        const viewer = document.getElementById('materialViewer');
        const videoPlayer = document.getElementById('courseVideoPlayer');

        if (viewer && viewer.innerHTML !== '' && !videoPlayer) {
            startTimer();
        }
    }
});

// Sync before unload
window.addEventListener('beforeunload', () => {
    if (learningTimer) {
        const now = Date.now();
        const diff = (now - lastSyncTime) / 1000 / 60;
        if (diff > 0.1) {
            // Use navigator.sendBeacon for reliable sending on unload if possible, 
            // but fetch with keepalive is also good.
            // Since we have a syncProgress function using fetch, let's try to use it but we can't await.
            // We'll construct a fire-and-forget fetch with keepalive: true
            const data = JSON.stringify({
                courseId: currentCourse.course_id,
                timeSpent: diff
            });

            fetch(`${API_URL}/progress/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: data,
                keepalive: true
            });
        }
    }
});

// Load Courses
async function loadCourses() {
    console.log('Loading courses...');
    const container = document.getElementById('coursesGrid');
    if (container) {
        container.innerHTML = '<p style="text-align:center;">กำลังโหลดข้อมูล...</p>';
    }

    try {
        const response = await fetch(`${API_URL}/courses`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();
        console.log('Courses data:', data);

        if (data.success) {
            allCourses = data.data;
            populateCreatorFilter(allCourses);
            displayCourses(allCourses);
        } else {
            console.error('Failed to load courses:', data.message);
            if (container) container.innerHTML = `<p style="color:red; text-align:center;">เกิดข้อผิดพลาด: ${data.message}</p>`;
        }
    } catch (error) {
        console.error('Error loading courses:', error);
        if (container) container.innerHTML = `<p style="color:red; text-align:center;">ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้</p>`;
    }
}

// Display Courses
function displayCourses(courses) {
    const container = document.getElementById('coursesGrid');

    if (!container) {
        console.error('Courses container not found!');
        return;
    }

    if (!courses || courses.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #6b7280;">ยังไม่มีหลักสูตร</p>';
        return;
    }

    container.innerHTML = courses.map(course => `
        <div class="course-card">
            <div class="course-image">
                ${course.cover_image ?
            `<img src="/uploads/${course.cover_image}" alt="${course.title}">` :
            '<div class="course-placeholder">🎓</div>'}
            </div>
            <div class="course-content">
                <h3>${course.title}</h3>
                <p>${course.description || ''}</p>
                <div class="course-meta">
                    <span>👨‍🏫 ${course.created_by_name || 'Admin'}</span>
                    <span>👥 ${course.enrolled_count || 0} คน</span>
                </div>
            </div>
            <div class="course-actions">
                ${currentUser && currentUser.role === 'admin' ? `
                    <button class="btn btn-sm btn-primary btn-edit-course" data-id="${course.course_id}">แก้ไข</button>
                    <button class="btn btn-sm btn-info btn-quiz-pre" data-id="${course.course_id}">แบบทดสอบก่อนเรียน</button>
                    <button class="btn btn-sm btn-info btn-quiz-post" data-id="${course.course_id}">แบบทดสอบหลังเรียน</button>
                    <button class="btn btn-sm btn-danger btn-delete-course" data-id="${course.course_id}">ลบ</button>
                    <button class="btn btn-sm btn-secondary btn-view-course" data-id="${course.course_id}">ดูตัวอย่าง</button>
                ` : `
                    <button class="btn btn-sm btn-primary btn-view-course" data-id="${course.course_id}">เข้าสู่บทเรียน</button>
                `}
            </div>
        </div>
    `).join('');

    // Add event listeners
    container.querySelectorAll('.btn-view-course').forEach(btn => {
        btn.addEventListener('click', () => viewCourse(btn.dataset.id));
    });

    container.querySelectorAll('.btn-edit-course').forEach(btn => {
        btn.addEventListener('click', () => editCourse(btn.dataset.id));
    });

    container.querySelectorAll('.btn-delete-course').forEach(btn => {
        btn.addEventListener('click', () => deleteCourse(btn.dataset.id));
    });

    // Admin Quiz Management: provide explicit Pre and Post buttons
    container.querySelectorAll('.btn-quiz-pre').forEach(btn => {
        btn.addEventListener('click', () => openQuizManager(btn.dataset.id, 'pre'));
    });
    container.querySelectorAll('.btn-quiz-post').forEach(btn => {
        btn.addEventListener('click', () => openQuizManager(btn.dataset.id, 'post'));
    });
}

// Show Quiz Options (Admin)
function showQuizOptions(courseId) {
    // Simple prompt for now, can be improved to a modal
    const choice = prompt('พิมพ์ "pre" เพื่อจัดการแบบทดสอบก่อนเรียน หรือ "post" เพื่อจัดการแบบทดสอบหลังเรียน');
    if (choice === 'pre' || choice === 'post') {
        openQuizManager(courseId, choice);
    } else if (choice) {
        alert('กรุณาพิมพ์ "pre" หรือ "post" เท่านั้น');
    }
}

// View Course  
async function viewCourse(courseId) {
    console.log('viewCourse called with courseId:', courseId);
    try {
        const response = await fetch(`${API_URL}/courses/${courseId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();
        console.log('Course data received:', data);

        if (data.success) {
            currentCourse = data.data;
            console.log('currentCourse set:', currentCourse);
            showCourseDetail();
        } else {
            console.error('Failed to load course:', data.message);
        }
    } catch (error) {
        console.error('Error loading course:', error);
    }
}

// Show Course Detail
function showCourseDetail() {
    console.log('showCourseDetail called');
    const onlineContainer = document.getElementById('onlineTrainingContainer');
    const detailContainer = document.getElementById('courseDetailContainer');
    
    console.log('onlineTrainingContainer found:', !!onlineContainer);
    console.log('courseDetailContainer found:', !!detailContainer);
    
    if (onlineContainer) {
        onlineContainer.style.display = 'none';
        console.log('onlineTrainingContainer hidden');
    }
    if (detailContainer) {
        detailContainer.style.display = 'block';
        console.log('courseDetailContainer displayed');
    }
    
    // Add active class to the section inside for CSS visibility
    const courseDetailSection = document.getElementById('courseDetailSection');
    if (courseDetailSection) {
        courseDetailSection.classList.add('active');
        console.log('courseDetailSection active class added');
    }

    document.getElementById('courseDetailTitle').textContent = currentCourse.title;
    document.getElementById('courseDetailDescription').textContent = currentCourse.description || '';

    // Check Enrollment - Allow admin and users to enroll
    const isAdmin = currentUser && currentUser.role === 'admin';
    const isEnrolled = currentCourse.userProgress !== null && currentCourse.userProgress !== undefined;
    const enrollBtn = document.getElementById('courseEnrollBtn');
    const contentDiv = document.getElementById('courseContent');
    const viewer = document.getElementById('materialViewer');

    // Reset viewer and timer
    viewer.innerHTML = '';
    stopTimer();

    if (isEnrolled) {
        enrollBtn.style.display = 'none';
        contentDiv.style.display = 'block';
        renderMaterials();
        renderQuizButtons(); // Show Quiz Buttons

        // Update Progress Bar
        updateProgressBar();

        // Show Certificate Button if completed
        const certBtn = document.getElementById('certificateBtn');
        if (currentCourse.userProgress && currentCourse.userProgress.status === 'completed') {
            certBtn.style.display = 'block';
        } else {
            certBtn.style.display = 'none';
        }

    } else {
        enrollBtn.style.display = 'block';
        contentDiv.style.display = 'none';

        // Show enrollment message - Update button text instead of div text
        const enrollButtonElement = document.getElementById('enrollButton');
        if (enrollButtonElement) {
            if (isAdmin) {
                enrollButtonElement.textContent = 'ลงทะเบียนเรียน (Admin)';
            } else {
                enrollButtonElement.textContent = 'ลงทะเบียนเรียน';
            }
        }
    }
}

// Render Quiz Buttons
function renderQuizButtons() {
    const quizSection = document.getElementById('courseQuizzes');
    if (!quizSection) {
        // Create section if not exists
        const container = document.getElementById('courseContent');
        const div = document.createElement('div');
        div.id = 'courseQuizzes';
        div.className = 'quizzes-section';
        container.appendChild(div);
    }

    const container = document.getElementById('courseQuizzes');
    let html = '<h3>แบบทดสอบ</h3><div style="display: flex; gap: 1rem;">';

    // Check Quizzes
    const preTest = currentCourse.quizzes ? currentCourse.quizzes.find(q => q.type === 'pre') : null;
    const postTest = currentCourse.quizzes ? currentCourse.quizzes.find(q => q.type === 'post') : null;

    // Pre-test
    if (preTest) {
        const score = currentCourse.userProgress ? currentCourse.userProgress.pre_test_score : null;
        html += `
            <div class="quiz-card" style="flex: 1;">
                <h4>แบบทดสอบก่อนเรียน</h4>
                ${score !== null ? `<p>คะแนนของคุณ: ${score}%</p>` : ''}
                <button class="btn btn-sm btn-primary" onclick="startQuiz('pre')">
                    ${score !== null ? 'ทำแบบทดสอบอีกครั้ง' : 'เริ่มทำแบบทดสอบ'}
                </button>
            </div>
        `;
    }

    // Post-test
    if (postTest) {
        const score = currentCourse.userProgress ? currentCourse.userProgress.post_test_score : null;
        const passed = currentCourse.userProgress && currentCourse.userProgress.status === 'completed';

        // Check learning time - ensure proper type conversion
        const learningTime = parseFloat(currentCourse.userProgress ? currentCourse.userProgress.learning_time_minutes : 0) || 0;
        const requiredTime = parseFloat(currentCourse.required_learning_minutes) || 60;
        const canTakePostTest = learningTime >= requiredTime;

        let btnClass = 'btn btn-sm btn-primary btn-quiz-post-action';
        let btnAttr = '';
        let btnTitle = '';

        if (!canTakePostTest) {
            btnClass = 'btn btn-sm btn-disabled btn-quiz-post-action';
            btnAttr = 'disabled';
            btnTitle = `ต้องเรียนให้ครบ ${requiredTime} นาทีก่อน (เหลืออีก ${Math.ceil(requiredTime - learningTime)} นาที)`;
        }

        html += `
            <div class="quiz-card" style="flex: 1;">
                <h4>แบบทดสอบหลังเรียน</h4>
                ${score !== null ? `<p>คะแนนของคุณ: ${score}% (${passed ? 'ผ่าน' : 'ไม่ผ่าน'})</p>` : ''}
                <button class="${btnClass}" ${btnAttr} title="${btnTitle}" onclick="startQuiz('post')">
                    ${score !== null ? 'ทำแบบทดสอบอีกครั้ง' : 'เริ่มทำแบบทดสอบ'}
                </button>
                ${!canTakePostTest ? `<p style="font-size: 0.8rem; color: #ef4444; margin-top: 0.5rem;">* ต้องเรียนครบ ${requiredTime} นาที</p>` : ''}
            </div>
        `;
    }

    html += '</div>';
    container.innerHTML = html;
}

// Render Materials
function renderMaterials() {
    const materialsList = document.getElementById('courseMaterialsList');

    if (currentCourse.materials && currentCourse.materials.length > 0) {
        materialsList.innerHTML = currentCourse.materials.map((mat, idx) => `
            <div class="material-item" onclick="viewMaterial(${idx})">
                <span class="material-icon">${mat.type === 'video' ? '🎥' : '📄'}</span>
                <div class="material-info">
                    <span class="material-title">${mat.title}</span>
                    <span class="material-type">${mat.type === 'video' ? 'วิดีโอ' : 'เอกสาร'}</span>
                </div>
                <button class="btn btn-sm btn-outline-primary">เปิดดู</button>
            </div>
        `).join('');
    } else {
        materialsList.innerHTML = '<p style="color: #6b7280; font-style: italic;">ยังไม่มีสื่อการเรียนรู้</p>';
    }
}

// Back to Courses
function backToCourses() {
    stopTimer();
    const courseDetailSection = document.getElementById('courseDetailSection');
    if (courseDetailSection) {
        courseDetailSection.classList.remove('active');
    }
    document.getElementById('courseDetailContainer').style.display = 'none';
    document.getElementById('onlineTrainingContainer').style.display = 'block';
    // Stop any playing video
    document.getElementById('materialViewer').innerHTML = '';
}

// Enroll in Course
async function enrollCourse() {
    try {
        const response = await fetch(`${API_URL}/courses/${currentCourse.course_id}/enroll`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.success) {
            alert('ลงทะเบียนสำเร็จ! เริ่มเรียนได้เลยครับ');
            // Refresh course data to update progress status
            viewCourse(currentCourse.course_id);
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error enrolling:', error);
        alert('เกิดข้อผิดพลาดในการลงทะเบียน');
    }
}

// View Material
function viewMaterial(index) {
    const material = currentCourse.materials[index];
    const viewer = document.getElementById('materialViewer');

    // Highlight active item
    document.querySelectorAll('.material-item').forEach((el, idx) => {
        if (idx === index) el.classList.add('active');
        else el.classList.remove('active');
    });

    if (material.type === 'video') {
        const videoId = getYouTubeID(material.content_url);

        if (videoId) {
            const embedUrl = `https://www.youtube.com/embed/${videoId}`;

            viewer.innerHTML = `
                <div class="video-container">
                    <iframe 
                        src="${embedUrl}" 
                        title="${material.title}"
                        width="100%" 
                        height="600"
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowfullscreen="allowfullscreen"
                        loading="lazy">
                    </iframe>
                </div>
                <h3 style="margin-top: 1rem;">${material.title}</h3>
            `;
        } else {
            // Assume it's an uploaded MP4 file
            const fileUrl = material.content_url.startsWith('http') ?
                material.content_url :
                `/uploads/${material.content_url}`;

            viewer.innerHTML = `
                <div class="video-container">
                    <video id="courseVideoPlayer" controls width="100%" height="600" style="background: #000;">
                        <source src="${fileUrl}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                </div>
                <h3 style="margin-top: 1rem;">${material.title}</h3>
            `;

            // Add event listeners for native video
            const videoPlayer = document.getElementById('courseVideoPlayer');
            if (videoPlayer) {
                videoPlayer.addEventListener('play', () => startTimer());
                videoPlayer.addEventListener('pause', () => stopTimer());
                videoPlayer.addEventListener('ended', () => stopTimer());
            }
        }
    } else if (material.type === 'pdf') {
        // Use Google Docs Viewer for PDF or native iframe if hosted locally
        const fileUrl = material.content_url.startsWith('http') ?
            material.content_url :
            `/uploads/${material.content_url}`; // Assuming backend saves files to /uploads

        viewer.innerHTML = `
            <div class="pdf-container" style="height: 600px;">
                <iframe src="${fileUrl}" width="100%" height="100%" style="border: none;"></iframe>
            </div>
            <h3 style="margin-top: 1rem;">${material.title}</h3>
        `;
    }

    // Scroll to viewer
    viewer.scrollIntoView({ behavior: 'smooth' });

    // Start Timer (only if not a native video, or if it's a PDF/YouTube which we can't track easily yet)
    // For native video, we wait for 'play' event.
    if (material.type !== 'video' || getYouTubeID(material.content_url)) {
        startTimer();
    }
}

// Helper: Get YouTube ID
// Helper: Get YouTube ID
function getYouTubeID(url) {
    if (!url) return null;

    // Check if it's a file path (simple check)
    if (url.match(/\.(mp4|mov|avi)$/i)) return null;

    // Try multiple regex patterns to match different YouTube URL formats
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
        /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    ];

    for (let pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1] && match[1].length >= 11) {
            return match[1];
        }
    }

    return null;
}

// Start Quiz (User)
async function startQuiz(type) {
    stopTimer(); // Stop learning timer when taking quiz

    const modal = document.getElementById('quizModal');
    const title = document.getElementById('quizModalTitle');
    const form = document.getElementById('quizForm');

    title.textContent = type === 'pre' ? 'แบบทดสอบก่อนเรียน' : 'แบบทดสอบหลังเรียน';
    form.innerHTML = '<p style="text-align:center;">กำลังโหลดข้อสอบ...</p>';
    modal.classList.add('active');

    try {
        const response = await fetch(`${API_URL}/quizzes/course/${currentCourse.course_id}/${type}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.success && data.data) {
            currentQuiz = data.data;
            renderUserQuiz(form);

            // Attach submit handler to the quiz form so answers are submitted via form submit
            const quizFormElement = document.getElementById('quizForm');
            if (quizFormElement) {
                const submitHandler = (e) => {
                    e.preventDefault();
                    submitUserQuiz();
                };
                quizFormElement.addEventListener('submit', submitHandler, { once: true });
            }
        } else {
            form.innerHTML = '<p style="text-align:center; color:red;">ไม่พบข้อสอบ</p>';
        }
    } catch (error) {
        console.error('Error loading quiz:', error);
        form.innerHTML = '<p style="text-align:center; color:red;">เกิดข้อผิดพลาดในการโหลดข้อสอบ</p>';
    }
}

// Render User Quiz
function renderUserQuiz(container) {
    let html = `<div class="quiz-questions">`;

    currentQuiz.questions.forEach((q, index) => {
        html += `
            <div class="quiz-question">
                <p>${index + 1}. ${q.question_text}</p>
                <div class="quiz-answers">
                    ${q.answers.map(a => `
                        <label class="quiz-answer">
                            <input type="radio" name="q_${q.question_id}" value="${a.answer_id}" required>
                            <span>${a.answer_text}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    });

    html += `
        </div>
        <div class="form-actions" style="margin-top: 2rem; display:flex; gap:0.75rem; justify-content:flex-end;">
            <button type="button" class="btn btn-secondary modal-close-btn" onclick="document.getElementById('quizModal').classList.remove('active')">ยกเลิก</button>
            <button type="submit" class="btn btn-primary">ส่งคำตอบ</button>
        </div>
    `;

    // Render into the provided form container (which is the existing #quizForm)
    container.innerHTML = html;
}

// Submit User Quiz
async function submitUserQuiz() {
    const answers = {};
    let allAnswered = true;

    currentQuiz.questions.forEach(q => {
        const selected = document.querySelector(`input[name="q_${q.question_id}"]:checked`);
        if (selected) {
            answers[q.question_id] = parseInt(selected.value);
        } else {
            allAnswered = false;
        }
    });

    if (!allAnswered) {
        alert('กรุณาตอบคำถามให้ครบทุกข้อ');
        return;
    }

    if (!confirm('ยืนยันการส่งคำตอบ?')) return;

    try {
        const response = await fetch(`${API_URL}/quizzes/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                courseId: currentCourse.course_id,
                quizType: currentQuiz.type,
                answers: answers
            })
        });

        const data = await response.json();

        if (data.success) {
            const result = data.data;
            alert(`ส่งคำตอบเรียบร้อย!\n\nคะแนนของคุณ: ${result.score}%\nผลการทดสอบ: ${result.passed ? 'ผ่าน' : 'ไม่ผ่าน'}`);
            document.getElementById('quizModal').classList.remove('active');
            viewCourse(currentCourse.course_id); // Refresh to update progress
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error submitting quiz:', error);
        alert('เกิดข้อผิดพลาดในการส่งคำตอบ');
    }
}

// Timer Functions
function startTimer() {
    if (learningTimer) {
        return; // Already running
    }

    lastSyncTime = Date.now();
    learningTimer = setInterval(() => {
        const now = Date.now();
        const diff = (now - lastSyncTime) / 1000 / 60; // Minutes

        if (diff >= 0.5) { // Sync every 30 seconds (0.5 mins)
            syncProgress(diff);
            lastSyncTime = now;
        }
    }, 5000); // Check every 5 seconds
}

function stopTimer() {
    if (learningTimer) {
        clearInterval(learningTimer);
        learningTimer = null;

        // Sync remaining time
        const now = Date.now();
        const diff = (now - lastSyncTime) / 1000 / 60;
        if (diff > 0.1) { // Only sync if > 6 seconds
            syncProgress(diff);
        }
    }
}

async function syncProgress(minutes) {
    if (!currentCourse || !currentUser) return;

    try {
        const response = await fetch(`${API_URL}/progress/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                courseId: currentCourse.course_id,
                timeSpent: minutes
            })
        });

        const data = await response.json();

        if (data.success) {
            // Update UI locally with proper type conversion
            if (currentCourse.userProgress) {
                const currentTime = parseFloat(currentCourse.userProgress.learning_time_minutes) || 0;
                const newTime = currentTime + minutes;
                currentCourse.userProgress.learning_time_minutes = newTime;
                updateProgressBar();
            }
        } else {
            // Sync failed silently
        }

    } catch (error) {
        // Error syncing progress - fail silently
    }
}

// Update Progress Bar
function updateProgressBar() {
    if (!currentCourse || !currentCourse.userProgress) return;

    // Ensure values are properly converted to numbers
    const learningTime = parseFloat(currentCourse.userProgress.learning_time_minutes) || 0;
    const requiredTime = parseFloat(currentCourse.required_learning_minutes) || 60;

    // Calculate percentage (max 100%)
    const percentage = Math.min(100, (learningTime / requiredTime) * 100);

    const progressBar = document.getElementById('learningProgressBar');
    const progressText = document.getElementById('learningProgressText');

    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
        // Change color when complete
        if (percentage >= 100) {
            progressBar.style.background = 'linear-gradient(90deg, #10b981, #059669)'; // Green
        } else {
            progressBar.style.background = 'linear-gradient(90deg, #3b82f6, #2563eb)'; // Blue
        }
    }

    if (progressText) {
        progressText.innerHTML = `เวลาเรียน: <strong>${Math.floor(learningTime)}</strong> / ${requiredTime} นาที (${Math.floor(percentage)}%)`;
    }

    // Update Post-Test Button state if it exists
    const postTestBtn = document.querySelector('.btn-quiz-post-action');
    if (postTestBtn) {
        if (learningTime >= requiredTime) {
            postTestBtn.disabled = false;
            postTestBtn.title = 'เริ่มทำแบบทดสอบ';
            postTestBtn.classList.remove('btn-disabled');
            postTestBtn.classList.add('btn-primary');
        } else {
            postTestBtn.disabled = true;
            postTestBtn.title = `ต้องเรียนให้ครบ ${requiredTime} นาทีก่อน (เหลืออีก ${Math.ceil(requiredTime - learningTime)} นาที)`;
            postTestBtn.classList.add('btn-disabled');
            postTestBtn.classList.remove('btn-primary');
        }
    }
}

// View Certificate
async function viewCertificate() {
    try {
        const response = await fetch(`${API_URL}/certificates/${currentCourse.course_id}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.success) {
            const certData = data.data;
            const modal = document.getElementById('certificateModal');
            const preview = document.getElementById('certificatePreview');

            // Generate Certificate HTML
            preview.innerHTML = `
                <div style="width: 100%; padding: 40px; border: 10px solid #111827; background: #fff; color: #111827; font-family: 'Sarabun', sans-serif; position: relative;">
                    <div style="text-align: center;">
                        <div style="font-size: 60px; margin-bottom: 20px;">🏥</div>
                        <h1 style="font-size: 32px; font-weight: bold; margin-bottom: 10px; color: #1f2937;">โรงพยาบาลวัดเพลง</h1>
                        <h2 style="font-size: 24px; font-weight: normal; margin-bottom: 40px; color: #4b5563;">ใบรับรองการผ่านการอบรม</h2>
                        
                        <p style="font-size: 18px; margin-bottom: 10px;">ขอมอบใบรับรองนี้ให้ไว้เพื่อแสดงว่า</p>
                        <h3 class="cert-user-name" style="font-size: 28px; font-weight: bold; margin-bottom: 20px; color: #2563eb;">${certData.userName}</h3>
                        
                        <p style="font-size: 18px; margin-bottom: 10px;">ได้ผ่านการอบรมหลักสูตร</p>
                        <h3 class="cert-course-title" style="font-size: 24px; font-weight: bold; margin-bottom: 30px;">${certData.courseTitle}</h3>
                        
                        <div style="display: flex; justify-content: center; gap: 40px; margin-bottom: 40px;">
                            <div>
                                <p style="font-size: 14px; color: #6b7280;">วันที่สำเร็จการศึกษา</p>
                                <p class="cert-completed-date" style="font-size: 18px; font-weight: 600;">${new Date(certData.completedDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            </div>
                            <div>
                                <p style="font-size: 14px; color: #6b7280;">คะแนนสอบหลังเรียน</p>
                                <p style="font-size: 18px; font-weight: 600;">${certData.postTestScore}%</p>
                            </div>
                            <div>
                                <p style="font-size: 14px; color: #6b7280;">เวลาเรียนสะสม</p>
                                <p style="font-size: 18px; font-weight: 600;">${certData.learningTime} นาที</p>
                            </div>
                        </div>
                        
                        <div style="margin-top: 60px; display: flex; justify-content: space-between; align-items: end; padding: 0 40px;">
                            <div style="text-align: center;">
                                <div style="margin-bottom: 10px;">
                                    <img src="/img/signature.png" alt="Signature" style="height: 60px; object-fit: contain;">
                                </div>
                                <div style="width: 150px; border-bottom: 1px solid #9ca3af; margin-bottom: 10px; margin-left: auto; margin-right: auto;"></div>
                                <p style="font-size: 14px;">ผู้อำนวยการโรงพยาบาล</p>
                            </div>
                            <div style="text-align: right;">
                                <p style="font-size: 12px; color: #9ca3af;">Certificate ID: ${currentCourse.course_id}-${certData.employeeId}-${new Date(certData.completedDate).getTime()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            modal.classList.add('active');
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error loading certificate:', error);
        alert('ไม่สามารถโหลดใบรับรองได้');
    }
}

// Print Certificate
function printCertificate() {
    const content = document.getElementById('certificatePreview').innerHTML;
    const printWindow = window.open('', '', 'height=600,width=800');

    printWindow.document.write('<html><head><title>Print Certificate</title>');
    printWindow.document.write('<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">');
    printWindow.document.write(`
        <style>
            @page { size: A4 landscape; margin: 0; }
            body { 
                font-family: "Sarabun", sans-serif; 
                margin: 0; 
                padding: 0; 
                width: 100%;
                height: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
                background: #fff;
                -webkit-print-color-adjust: exact;
            }
            /* Ensure the content div fits nicely */
            body > div {
                box-sizing: border-box;
                width: 297mm;
                height: 209mm; /* Slightly less than 210mm to prevent extra page */
                margin: 0 auto;
                background: white;
                border: 10px solid #111827 !important;
                padding: 30px !important; /* Reduced padding */
                display: flex;
                flex-direction: column;
                justify-content: space-between; /* Push footer to bottom */
            }
            /* Hide browser default headers/footers if possible */
            @media print {
                body { -webkit-print-color-adjust: exact; }
            }
        </style>
    `);
    printWindow.document.write('</head><body>');

    // We need to modify the content slightly for the print view to ensure flex works
    // The original content has a wrapper div with inline styles. We want to override or replace that.
    // Since we are writing raw HTML, we can wrap the inner content in our styled div.

    // Extract inner HTML from the preview div, excluding the outer wrapper if possible, 
    // OR just write the content and let our CSS handle the outer div if the preview ID points to the wrapper.
    // The preview.innerHTML includes the outer div: <div style="width: 100%; ...">...</div>

    // Let's strip the outer div's inline style in the print window or just use the inner content.
    // Actually, the preview.innerHTML IS the outer div.
    // Let's rewrite the content structure for print to be safer.

    const certData = {
        userName: document.querySelector('.cert-user-name').textContent,
        courseTitle: document.querySelector('.cert-course-title').textContent,
        completedDate: document.querySelector('.cert-completed-date').textContent,
    };

    // simpler approach: write the content but add a style to override the inline styles of the first div
    printWindow.document.write(`
        <style>
            @media print {
                @page { size: A4 landscape; margin: 0; }
                body { margin: 0; padding: 0; display: block !important; }
                body > div {
                    width: 297mm !important;
                    height: 200mm !important;
                    padding: 20px !important;
                    border: 10px solid #111827 !important;
                    box-sizing: border-box;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: space-between !important;
                    position: absolute;
                    top: 0;
                    left: 0;
                    margin: 0 !important;
                    page-break-after: avoid;
                }
            }
            /* Screen styles */
            body > div {
                width: 280mm;
                height: 160mm;
                padding: 20px;
                border: 10px solid #111827;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                margin: auto;
            }
        </style>
    `);
    printWindow.document.write(content);
    printWindow.document.write('</body></html>');

    printWindow.document.close();
    printWindow.focus();

    // Wait for fonts/images to load
    setTimeout(() => {
        printWindow.print();
        printWindow.close(); // Keep window open for user to review
    }, 1000);
}
