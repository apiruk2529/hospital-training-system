// API Configuration
const API_URL = window.location.origin + '/api';
let currentUser = null;
let authToken = null;
let activityTypes = [];
let formatTypes = [];
let allRecords = [];
let allUsers = [];

// Initialize App
document.addEventListener('componentsLoaded', () => {
    checkAuth();
    setupEventListeners();
});

// Check Authentication
async function checkAuth() {
    authToken = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');

    if (authToken) {
        if (userData && userData !== 'undefined') {
            try {
                currentUser = JSON.parse(userData);
                showMainApp();
            } catch (e) {
                console.error('Invalid user data, clearing session:', e);
                localStorage.removeItem('userData');
                await fetchUserData(); // Try fetching fresh data
            }
        } else {
            // Token exists but no user data (e.g. Provider-ID redirect)
            await fetchUserData();
        }
    } else {
        showLoginPage();
    }
}

async function fetchUserData() {
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = {
                userId: data.data.user_id,
                username: data.data.username,
                fullName: data.data.full_name,
                email: data.data.email,
                role: data.data.role,
                position: data.data.position,
                department: data.data.department,
                employeeId: data.data.employee_id
            };
            localStorage.setItem('userData', JSON.stringify(currentUser));
            showMainApp();
        } else {
            console.error('Failed to fetch user data');
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            showLoginPage();
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
        localStorage.removeItem('authToken');
        showLoginPage();
    }
}

// Show Pages
function showLoginPage() {
    document.getElementById('loginPage').classList.add('active');
    document.getElementById('mainApp').classList.remove('active');
}

async function showMainApp() {
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('mainApp').classList.add('active');
    document.getElementById('navUserName').textContent = currentUser.fullName;

    // Show/hide admin elements
    if (currentUser.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = '';
        });
        // Load staff list for dropdown
        await loadStaffList();
    }

    loadMetadata();
    showDashboard();
}

// Setup Event Listeners
function setupEventListeners() {
    // Login
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Logout
    document.getElementById('btnLogout').addEventListener('click', handleLogout);

    // Navigation
    document.getElementById('navDashboard').addEventListener('click', () => showSection('dashboard'));
    document.getElementById('navRecords').addEventListener('click', () => showSection('records'));
    document.getElementById('navOnlineTraining').addEventListener('click', () => showSection('onlineTraining'));
    document.getElementById('navMediaLibrary').addEventListener('click', () => showSection('mediaLibrary'));
    document.getElementById('navUsers')?.addEventListener('click', () => showSection('users'));
    document.getElementById('navUsers')?.addEventListener('click', () => showSection('users'));
    // document.getElementById('navProviderApprovals')?.addEventListener('click', () => showSection('providerApprovals'));

    // Modals
    // Modals
    document.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    // Add buttons
    document.getElementById('btnAddRecord').addEventListener('click', () => openRecordModal());
    document.getElementById('btnAddUser')?.addEventListener('click', () => openUserModal());

    // Forms
    document.getElementById('recordForm').addEventListener('submit', handleRecordSubmit);
    document.getElementById('userForm')?.addEventListener('submit', handleUserSubmit);

    // Filters
    document.getElementById('searchInput').addEventListener('input', filterRecords);
    document.getElementById('filterType').addEventListener('change', filterRecords);
    document.getElementById('filterFormat').addEventListener('change', filterRecords);

    // Attachments
    document.getElementById('recordAttachment').addEventListener('change', previewAttachment);
}

// Preview Attachment
function previewAttachment(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('attachmentPreview');
    preview.innerHTML = '';

    if (!file) return;

    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            preview.appendChild(img);
        };
        reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = function (e) {
            const iframe = document.createElement('iframe');
            iframe.src = e.target.result;
            preview.appendChild(iframe);
        };
        reader.readAsDataURL(file);
    } else {
        preview.innerHTML = `<p class="placeholder-text">ไม่สามารถแสดงตัวอย่างไฟล์ประเภทนี้ได้ (${file.name})</p>`;
    }
}

// Login Handler
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            authToken = data.data.token;
            currentUser = data.data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('userData', JSON.stringify(currentUser));
            document.dispatchEvent(new CustomEvent('authChanged'));
            showMainApp();
        } else {
            errorDiv.textContent = data.message;
            errorDiv.classList.add('active');
        }
    } catch (error) {
        errorDiv.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
        errorDiv.classList.add('active');
    }
}

// Logout Handler
function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    authToken = null;
    currentUser = null;
    document.dispatchEvent(new CustomEvent('authChanged'));
    showLoginPage();
}

// Load Metadata
async function loadMetadata() {
    try {
        const [typesRes, formatsRes] = await Promise.all([
            fetch(`${API_URL}/training/meta/activity-types`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            }),
            fetch(`${API_URL}/training/meta/format-types`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            })
        ]);

        const typesData = await typesRes.json();
        const formatsData = await formatsRes.json();

        if (typesData.success) activityTypes = typesData.data;
        if (formatsData.success) formatTypes = formatsData.data;

        populateFilters();
        populateFormSelects();
    } catch (error) {
        console.error('Error loading metadata:', error);
    }
}

// Populate Filters
function populateFilters() {
    const typeFilter = document.getElementById('filterType');
    const formatFilter = document.getElementById('filterFormat');

    // Clear existing options except the first one (All)
    while (typeFilter.options.length > 1) {
        typeFilter.remove(1);
    }
    while (formatFilter.options.length > 1) {
        formatFilter.remove(1);
    }

    activityTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.type_id;
        option.textContent = type.type_name_th;
        typeFilter.appendChild(option);
    });

    formatTypes.forEach(format => {
        const option = document.createElement('option');
        option.value = format.format_id;
        option.textContent = format.format_name_th;
        formatFilter.appendChild(option);
    });
}

// Populate Form Selects
function populateFormSelects() {
    const typeSelect = document.getElementById('recordType');
    const formatSelect = document.getElementById('recordFormat');

    typeSelect.innerHTML = '';
    formatSelect.innerHTML = '';

    activityTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.type_id;
        option.textContent = type.type_name_th;
        typeSelect.appendChild(option);
    });

    formatTypes.forEach(format => {
        const option = document.createElement('option');
        option.value = format.format_id;
        option.textContent = format.format_name_th;
        formatSelect.appendChild(option);
    });
}

// Load Staff List for Admin
async function loadStaffList() {
    try {
        const response = await fetch(`${API_URL}/users`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.success) {
            const staffSelect = document.getElementById('recordStaffId');
            staffSelect.innerHTML = '<option value="">-- เลือกเจ้าหน้าที่ --</option>';

            data.data.forEach(user => {
                const option = document.createElement('option');
                option.value = user.user_id;
                option.textContent = `${user.full_name} (${user.employee_id})`;
                staffSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading staff list:', error);
    }
}



// Show Section
function showSection(section) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));

    // Hide all containers first
    const mediaLibContainer = document.getElementById('mediaLibraryContainer');
    const onlineTrainingContainer = document.getElementById('onlineTrainingContainer');
    const courseDetailContainer = document.getElementById('courseDetailContainer');
    const providerApprovalsContainer = document.getElementById('providerApprovalsContainer');

    if (mediaLibContainer) mediaLibContainer.style.display = 'none';
    if (onlineTrainingContainer) onlineTrainingContainer.style.display = 'none';
    if (courseDetailContainer) courseDetailContainer.style.display = 'none';
    if (providerApprovalsContainer) providerApprovalsContainer.style.display = 'none';

    if (section === 'dashboard') {
        document.getElementById('navDashboard').classList.add('active');
        document.getElementById('dashboardSection').classList.add('active');
        showDashboard();
    } else if (section === 'records') {
        document.getElementById('navRecords').classList.add('active');
        document.getElementById('recordsSection').classList.add('active');
        loadRecords();
    } else if (section === 'mediaLibrary') {
        document.getElementById('navMediaLibrary').classList.add('active');
        if (mediaLibContainer) {
            mediaLibContainer.style.display = 'block';
        }
    } else if (section === 'onlineTraining') {
        document.getElementById('navOnlineTraining').classList.add('active');
        if (onlineTrainingContainer) {
            onlineTrainingContainer.style.display = 'block';
            // Also add active class to the nested section
            const nestedSection = onlineTrainingContainer.querySelector('#onlineTrainingSection');
            if (nestedSection) {
                nestedSection.classList.add('active');
            }
            if (typeof loadCourses === 'function') {
                loadCourses();
            }
        }
        // Note: courseDetailContainer will be shown/hidden by online-training.js functions
        // when user clicks to view a course
    } else if (section === 'users') {
        document.getElementById('navUsers').classList.add('active');
        document.getElementById('usersSection').classList.add('active');

        // Initialize tabs
        setupUserTabs();

        // Load default tab (users list)
        loadUsers();

        // Also check pending count to show badge
        if (typeof loadPendingRegistrations === 'function') {
            loadPendingRegistrations(true); // true = count only or background load
        }
    }
}

// Dashboard
async function showDashboard() {
    try {
        const response = await fetch(`${API_URL}/training`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.success) {
            const records = data.data;
            const currentYear = new Date().getFullYear();

            // Calculate stats
            const totalRecords = records.length;
            const totalHours = records.reduce((sum, r) => sum + parseFloat(r.hours || 0), 0);
            const thisYearRecords = records.filter(r =>
                new Date(r.start_date).getFullYear() === currentYear
            ).length;

            document.getElementById('totalRecords').textContent = totalRecords;
            document.getElementById('totalHours').textContent = totalHours.toFixed(1);
            document.getElementById('thisYear').textContent = thisYearRecords;

            // Load total users if admin
            if (currentUser.role === 'admin') {
                const usersRes = await fetch(`${API_URL}/users`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                const usersData = await usersRes.json();
                if (usersData.success) {
                    document.getElementById('totalUsers').textContent = usersData.data.length;
                }
            }

            // Show recent records
            displayRecentRecords(records.slice(0, 5));
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Display Recent Records
function displayRecentRecords(records) {
    const container = document.getElementById('recentRecordsList');

    if (records.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">ยังไม่มีข้อมูล</p>';
        return;
    }

    container.innerHTML = records.map(record => `
        <div class="record-item">
            <div class="record-header">
                <div class="record-title">${record.title}</div>
                <div class="record-badges">
                    <span class="badge badge-primary">${record.activity_type}</span>
                    <span class="badge badge-success">${record.format_type}</span>
                </div>
            </div>
            <div class="record-meta">
                <span>📅 ${formatDate(record.start_date)} - ${formatDate(record.end_date)}</span>
                <span>⏱️ ${record.hours} ชั่วโมง</span>
                ${record.organization ? `<span>🏢 ${record.organization}</span>` : ''}
            </div>
        </div>
    `).join('');
}

// Load Records
async function loadRecords() {
    try {
        const response = await fetch(`${API_URL}/training`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.success) {
            allRecords = data.data;
            displayRecords(allRecords);
        }
    } catch (error) {
        console.error('Error loading records:', error);
    }
}

// Display Records Table
function displayRecords(records) {
    const container = document.getElementById('recordsTable');

    if (records.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-secondary);">ไม่พบข้อมูล</p>';
        return;
    }

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>หัวข้อ</th>
                    <th>ประเภท</th>
                    <th>วันที่</th>
                    <th>ชั่วโมง</th>
                    <th>รูปแบบ</th>
                    ${currentUser.role === 'admin' ? '<th>เจ้าหน้าที่</th>' : ''}
                    <th>จัดการ</th>
                </tr>
            </thead>
            <tbody>
                ${records.map(record => `
                    <tr>
                        <td><strong>${record.title}</strong></td>
                        <td>${record.activity_type}</td>
                        <td>${formatDate(record.start_date)} - ${formatDate(record.end_date)}</td>
                        <td>${record.hours}</td>
                        <td><span class="badge badge-success">${record.format_type}</span></td>
                        ${currentUser.role === 'admin' ? `<td>${record.full_name}</td>` : ''}
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-sm btn-primary btn-edit-record" data-record-id="${record.record_id}">แก้ไข</button>
                                <button class="btn btn-sm btn-danger btn-delete-record" data-record-id="${record.record_id}">ลบ</button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    // Add event listeners to buttons
    container.querySelectorAll('.btn-edit-record').forEach(btn => {
        btn.addEventListener('click', () => {
            const recordId = btn.getAttribute('data-record-id');
            editRecord(parseInt(recordId));
        });
    });

    container.querySelectorAll('.btn-delete-record').forEach(btn => {
        btn.addEventListener('click', () => {
            const recordId = btn.getAttribute('data-record-id');
            deleteRecord(parseInt(recordId));
        });
    });
}

// Filter Records
function filterRecords() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const typeFilter = document.getElementById('filterType').value;
    const formatFilter = document.getElementById('filterFormat').value;

    let filtered = allRecords.filter(record => {
        const matchesSearch = record.title.toLowerCase().includes(searchTerm) ||
            (record.description && record.description.toLowerCase().includes(searchTerm));
        const matchesType = !typeFilter || record.activity_type_id == typeFilter;
        const matchesFormat = !formatFilter || record.format_type_id == formatFilter;

        return matchesSearch && matchesType && matchesFormat;
    });

    displayRecords(filtered);
}

// Open Record Modal
function openRecordModal(recordId = null) {
    const modal = document.getElementById('recordModal');
    const form = document.getElementById('recordForm');
    const title = document.getElementById('recordModalTitle');
    const staffRow = document.getElementById('staffSelectionRow');
    const staffSelect = document.getElementById('recordStaffId');
    const preview = document.getElementById('attachmentPreview');

    form.reset();
    preview.innerHTML = '';

    // Show/hide staff selection for admin
    if (currentUser.role === 'admin') {
        staffRow.style.display = '';
        staffSelect.setAttribute('required', 'required');
    } else {
        staffRow.style.display = 'none';
        staffSelect.removeAttribute('required');
    }

    if (recordId) {
        title.textContent = 'แก้ไขรายการ';
        loadRecordData(recordId);
    } else {
        title.textContent = 'เพิ่มรายการใหม่';
        document.getElementById('recordId').value = '';
    }

    modal.classList.add('active');
}

// Load Record Data for Edit
async function loadRecordData(recordId) {
    try {
        const response = await fetch(`${API_URL}/training/${recordId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.success) {
            const record = data.data;
            document.getElementById('recordId').value = record.record_id;
            document.getElementById('recordTitle').value = record.title;
            document.getElementById('recordType').value = record.activity_type_id;
            document.getElementById('recordFormat').value = record.format_type_id;

            // Convert date to YYYY-MM-DD format for input type="date"
            document.getElementById('recordStartDate').value = formatDateForInput(record.start_date);
            document.getElementById('recordEndDate').value = formatDateForInput(record.end_date);

            document.getElementById('recordHours').value = record.hours;
            document.getElementById('recordOrganization').value = record.organization || '';
            document.getElementById('recordLocation').value = record.location || '';
            document.getElementById('recordDescription').value = record.description || '';
            document.getElementById('recordCertificate').value = record.certificate_number || '';

            // Set staff selection for admin
            if (currentUser.role === 'admin') {
                document.getElementById('recordStaffId').value = String(record.user_id);
            }

            // Show attachments
            const preview = document.getElementById('attachmentPreview');
            preview.innerHTML = '';
            if (record.attachments && record.attachments.length > 0) {
                record.attachments.forEach(att => {
                    const fileUrl = `${window.location.origin}/uploads/${att.file_name}`;

                    if (att.file_type.startsWith('image/')) {
                        const img = document.createElement('img');
                        img.src = fileUrl;
                        preview.appendChild(img);
                    } else if (att.file_type === 'application/pdf') {
                        const iframe = document.createElement('iframe');
                        iframe.src = fileUrl;
                        preview.appendChild(iframe);
                    } else {
                        const link = document.createElement('a');
                        link.href = fileUrl;
                        link.textContent = `ดาวน์โหลด ${att.file_name}`;
                        link.target = '_blank';
                        preview.appendChild(link);
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error loading record:', error);
    }
}

// Handle Record Submit
// Handle Record Submit
async function handleRecordSubmit(e) {
    e.preventDefault();

    const recordId = document.getElementById('recordId').value;
    const formData = new FormData();

    formData.append('title', document.getElementById('recordTitle').value);
    formData.append('activity_type_id', document.getElementById('recordType').value);
    formData.append('format_type_id', document.getElementById('recordFormat').value);
    formData.append('start_date', document.getElementById('recordStartDate').value);
    formData.append('end_date', document.getElementById('recordEndDate').value);
    formData.append('hours', document.getElementById('recordHours').value);
    formData.append('organization', document.getElementById('recordOrganization').value);
    formData.append('location', document.getElementById('recordLocation').value);
    formData.append('description', document.getElementById('recordDescription').value);
    formData.append('certificate_number', document.getElementById('recordCertificate').value);

    // Add user_id if admin selected a staff member
    if (currentUser.role === 'admin') {
        const staffId = document.getElementById('recordStaffId').value;
        if (staffId) {
            formData.append('user_id', staffId);
        }
    }

    // Add attachment
    const attachmentInput = document.getElementById('recordAttachment');
    if (attachmentInput.files.length > 0) {
        formData.append('attachment', attachmentInput.files[0]);
    }

    try {
        const url = recordId ? `${API_URL}/training/${recordId}` : `${API_URL}/training`;
        const method = recordId ? 'PUT' : 'POST';

        // Note: Content-Type header should not be set manually when using FormData
        // fetch will automatically set it with the boundary
        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            closeModals();
            loadRecords();
            showDashboard();
            alert(data.message);
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error saving record:', error);
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
}

// Edit Record
function editRecord(recordId) {
    openRecordModal(recordId);
}

// Delete Record
async function deleteRecord(recordId) {
    if (!confirm('คุณต้องการลบรายการนี้หรือไม่?')) return;

    try {
        const response = await fetch(`${API_URL}/training/${recordId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.success) {
            loadRecords();
            showDashboard();
            alert(data.message);
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error deleting record:', error);
        alert('เกิดข้อผิดพลาดในการลบข้อมูล');
    }
}

// Load Users (Admin)
async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/users`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.success) {
            allUsers = data.data;
            displayUsers(allUsers);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Display Users Table
function displayUsers(users) {
    const container = document.getElementById('usersTable');

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>รหัสพนักงาน</th>
                    <th>ชื่อ-นามสกุล</th>
                    <th>อีเมล</th>
                    <th>ตำแหน่ง</th>
                    <th>แผนก</th>
                    <th>สิทธิ์</th>
                    <th>จัดการ</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr>
                        <td>${user.employee_id}</td>
                        <td><strong>${user.full_name}</strong></td>
                        <td>${user.email}</td>
                        <td>${user.position || '-'}</td>
                        <td>${user.department || '-'}</td>
                        <td><span class="badge ${user.role === 'admin' ? 'badge-primary' : 'badge-success'}">${user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้ทั่วไป'}</span></td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-sm btn-primary btn-edit-user" data-user-id="${user.user_id}">แก้ไข</button>
                                <button class="btn btn-sm btn-danger btn-delete-user" data-user-id="${user.user_id}">ลบ</button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    // Add event listeners to buttons
    container.querySelectorAll('.btn-edit-user').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = btn.getAttribute('data-user-id');
            editUser(parseInt(userId));
        });
    });

    container.querySelectorAll('.btn-delete-user').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = btn.getAttribute('data-user-id');
            deleteUser(parseInt(userId));
        });
    });
}

// Open User Modal
function openUserModal(userId = null) {
    const modal = document.getElementById('userModal');
    const form = document.getElementById('userForm');
    const title = document.getElementById('userModalTitle');
    const passwordGroup = document.getElementById('passwordGroup');
    const passwordInput = document.getElementById('userPassword');

    form.reset();

    if (userId) {
        title.textContent = 'แก้ไขผู้ใช้';
        passwordGroup.style.display = ''; // Show password field
        document.querySelector('label[for="userPassword"]').textContent = 'รหัสผ่าน (เว้นว่างถ้ารหัสเดิม)';
        passwordInput.removeAttribute('required');
        passwordInput.value = ''; // Clear value
        loadUserData(userId);
    } else {
        title.textContent = 'เพิ่มผู้ใช้ใหม่';
        passwordGroup.style.display = '';
        document.querySelector('label[for="userPassword"]').textContent = 'รหัสผ่าน *';
        passwordInput.setAttribute('required', 'required');
        passwordInput.value = '';
        document.getElementById('userId').value = '';
    }

    modal.classList.add('active');
}

// Load User Data
async function loadUserData(userId) {
    try {
        const response = await fetch(`${API_URL}/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.success) {
            const user = data.data;
            document.getElementById('userId').value = user.user_id;
            document.getElementById('userEmployeeId').value = user.employee_id;
            document.getElementById('userUsername').value = user.username;
            document.getElementById('userFullName').value = user.full_name;
            document.getElementById('userEmail').value = user.email;
            document.getElementById('userPosition').value = user.position || '';
            document.getElementById('userDepartment').value = user.department || '';
            document.getElementById('userRole').value = user.role;
        }
    } catch (error) {
        console.error('Error loading user:', error);
    }
}

// Setup User Tabs
function setupUserTabs() {
    const tabBtns = document.querySelectorAll('.user-tabs .tab-btn');

    tabBtns.forEach(btn => {
        // Remove old listeners to prevent duplicates (though replace is safer)
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', () => {
            // Deactivate all
            document.querySelectorAll('.user-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            // Activate current
            newBtn.classList.add('active');
            const tabId = newBtn.getAttribute('data-tab');

            if (tabId === 'users-list') {
                document.getElementById('usersListTab').classList.add('active');
                if (typeof loadUsers === 'function') loadUsers();
            } else if (tabId === 'pending-approvals') {
                document.getElementById('pendingApprovalsTab').classList.add('active');
                if (typeof loadPendingRegistrations === 'function') {
                    loadPendingRegistrations();
                }
            }
        });
    });
}

// Handle User Submit
async function handleUserSubmit(e) {
    e.preventDefault();

    const userId = document.getElementById('userId').value;
    const userDataPayload = {
        employee_id: document.getElementById('userEmployeeId').value,
        username: document.getElementById('userUsername').value,
        full_name: document.getElementById('userFullName').value,
        email: document.getElementById('userEmail').value,
        position: document.getElementById('userPosition').value,
        department: document.getElementById('userDepartment').value,
        role: document.getElementById('userRole').value,
        password: document.getElementById('userPassword').value // Will be empty if not changed
    };

    try {
        const url = userId ? `${API_URL}/users/${userId}` : `${API_URL}/users`;
        const method = userId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(userDataPayload)
        });

        const responseData = await response.json();

        if (responseData.success) {
            closeModals();
            loadUsers();
            alert(responseData.message);
        } else {
            alert(responseData.message);
        }
    } catch (error) {
        console.error('Error saving user:', error);
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
}

// Edit User
function editUser(userId) {
    openUserModal(userId);
}

// Delete User
async function deleteUser(userId) {
    if (!confirm('คุณต้องการลบผู้ใช้นี้หรือไม่?')) return;

    try {
        const response = await fetch(`${API_URL}/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.success) {
            loadUsers();
            alert(data.message);
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('เกิดข้อผิดพลาดในการลบผู้ใช้');
    }
}

// Close Modals
function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

// Utility Functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Format date for input type="date" (YYYY-MM-DD)
function formatDateForInput(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
