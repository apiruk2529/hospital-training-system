// Quiz Admin Functions

let currentQuizData = {
    courseId: null,
    type: null,
    questions: []
};

// Initialize
document.addEventListener('componentsLoaded', function () {
    // Quiz Form Submit
    const quizForm = document.getElementById('quizForm');
    if (quizForm) {
        quizForm.addEventListener('submit', handleQuizSubmit);
    }
});

// Open Quiz Manager
async function openQuizManager(courseId, type) {
    currentQuizData.courseId = courseId;
    currentQuizData.type = type;
    currentQuizData.questions = [];

    const modal = document.getElementById('quizModal');
    const title = document.getElementById('quizModalTitle');
    const form = document.getElementById('quizForm');

    title.textContent = `จัดการแบบทดสอบ${type === 'pre' ? 'ก่อนเรียน' : 'หลังเรียน'}`;
    form.innerHTML = '<p style="text-align:center;">กำลังโหลดข้อมูล...</p>';
    modal.classList.add('active');

    try {
        const response = await fetch(`${API_URL}/quizzes/course/${courseId}/${type}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.success) {
            if (data.data) {
                // Existing quiz
                currentQuizData.questions = data.data.questions || [];
                renderQuizForm(data.data.passing_score);
            } else {
                // New quiz
                renderQuizForm(60); // Default passing score 60%
            }
        } else {
            alert('ไม่สามารถโหลดข้อมูลแบบทดสอบได้');
            modal.classList.remove('active');
        }
    } catch (error) {
        console.error('Error loading quiz:', error);
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        modal.classList.remove('active');
    }
}

// Render Quiz Form
function renderQuizForm(passingScore = 60) {
    const form = document.getElementById('quizForm');

    let html = `
        <div class="form-group">
            <label for="passingScore">เกณฑ์การผ่าน (%)</label>
            <input type="number" id="passingScore" value="${passingScore}" min="0" max="100" required>
        </div>

        <div id="questionsList">
            <!-- Questions will be rendered here -->
        </div>

        <button type="button" class="btn btn-secondary" onclick="addQuestion()" style="width: 100%; margin-top: 1rem; border-style: dashed;">+ เพิ่มคำถาม</button>

        <div class="form-actions" style="margin-top: 2rem;">
            <button type="button" class="btn btn-secondary modal-close-btn" onclick="closeQuizModal()">ยกเลิก</button>
            <button type="submit" class="btn btn-primary">บันทึกแบบทดสอบ</button>
        </div>
    `;

    form.innerHTML = html;
    renderQuestions();
}

// Render Questions
function renderQuestions() {
    const container = document.getElementById('questionsList');
    container.innerHTML = '';

    currentQuizData.questions.forEach((q, qIndex) => {
        const qDiv = document.createElement('div');
        qDiv.className = 'quiz-card';
        qDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                <h4>คำถามที่ ${qIndex + 1}</h4>
                <button type="button" onclick="removeQuestion(${qIndex})" style="color: red; background: none; border: none; cursor: pointer;">ลบคำถาม</button>
            </div>
            
            <div class="form-group">
                <input type="text" class="question-text" value="${q.question_text || ''}" placeholder="ระบุคำถาม" onchange="updateQuestion(${qIndex}, this.value)" required>
            </div>

            <div class="answers-list">
                ${(q.answers || []).map((a, aIndex) => `
                    <div class="quiz-answer">
                        <input type="radio" name="correct_${qIndex}" ${a.is_correct ? 'checked' : ''} onchange="setCorrectAnswer(${qIndex}, ${aIndex})">
                        <input type="text" value="${a.answer_text || ''}" placeholder="ตัวเลือกที่ ${aIndex + 1}" style="flex: 1; border: none; background: transparent;" onchange="updateAnswer(${qIndex}, ${aIndex}, this.value)" required>
                        <button type="button" onclick="removeAnswer(${qIndex}, ${aIndex})" style="color: #9ca3af; background: none; border: none; cursor: pointer;">&times;</button>
                    </div>
                `).join('')}
            </div>

            <button type="button" class="btn btn-sm btn-outline-primary" onclick="addAnswer(${qIndex})" style="margin-top: 0.5rem;">+ เพิ่มตัวเลือก</button>
        `;
        container.appendChild(qDiv);
    });
}

// Add Question
function addQuestion() {
    currentQuizData.questions.push({
        question_text: '',
        answers: [
            { answer_text: '', is_correct: true },
            { answer_text: '', is_correct: false }
        ]
    });
    renderQuestions();
}

// Remove Question
function removeQuestion(index) {
    if (!confirm('ต้องการลบคำถามนี้?')) return;
    currentQuizData.questions.splice(index, 1);
    renderQuestions();
}

// Update Question Text
function updateQuestion(index, value) {
    currentQuizData.questions[index].question_text = value;
}

// Add Answer
function addAnswer(qIndex) {
    currentQuizData.questions[qIndex].answers.push({
        answer_text: '',
        is_correct: false
    });
    renderQuestions();
}

// Remove Answer
function removeAnswer(qIndex, aIndex) {
    if (currentQuizData.questions[qIndex].answers.length <= 2) {
        alert('ต้องมีอย่างน้อย 2 ตัวเลือก');
        return;
    }
    currentQuizData.questions[qIndex].answers.splice(aIndex, 1);

    // Ensure one is correct
    const hasCorrect = currentQuizData.questions[qIndex].answers.some(a => a.is_correct);
    if (!hasCorrect && currentQuizData.questions[qIndex].answers.length > 0) {
        currentQuizData.questions[qIndex].answers[0].is_correct = true;
    }

    renderQuestions();
}

// Update Answer Text
function updateAnswer(qIndex, aIndex, value) {
    currentQuizData.questions[qIndex].answers[aIndex].answer_text = value;
}

// Set Correct Answer
function setCorrectAnswer(qIndex, aIndex) {
    currentQuizData.questions[qIndex].answers.forEach((a, idx) => {
        a.is_correct = (idx === aIndex);
    });
    // No need to re-render, radio button handles visual state
}

// Close Modal
function closeQuizModal() {
    document.getElementById('quizModal').classList.remove('active');
}

// Handle Submit
async function handleQuizSubmit(e) {
    e.preventDefault();

    const passingScore = document.getElementById('passingScore').value;

    // Validation
    if (currentQuizData.questions.length === 0) {
        alert('กรุณาเพิ่มคำถามอย่างน้อย 1 ข้อ');
        return;
    }

    for (let q of currentQuizData.questions) {
        if (!q.question_text.trim()) {
            alert('กรุณาระบุคำถามให้ครบถ้วน');
            return;
        }
        for (let a of q.answers) {
            if (!a.answer_text.trim()) {
                alert('กรุณาระบุตัวเลือกให้ครบถ้วน');
                return;
            }
        }
    }

    const payload = {
        courseId: currentQuizData.courseId,
        type: currentQuizData.type,
        passingScore: passingScore,
        questions: currentQuizData.questions
    };

    try {
        const response = await fetch(`${API_URL}/quizzes/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            alert('บันทึกแบบทดสอบสำเร็จ');
            closeQuizModal();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error saving quiz:', error);
        alert('เกิดข้อผิดพลาดในการบันทึก');
    }
}
