// Media Library JavaScript
// คลังสื่อข้อมูลสุขภาพ

(function () {
    const API_BASE = '/api';
    let currentUser = null;
    let allMedia = [];
    let currentMediaId = null;
    let selectedFile = null;

    // Initialize
    document.addEventListener('componentsLoaded', async () => {
        await checkAuth();
        // Only load data if user is authenticated
        if (currentUser) {
            await Promise.all([
                loadDepartments(),
                loadCategories(),
                loadMediaTypes(),
                loadMedia()
            ]);
        }
        initializeEventListeners();
    });

    // Listen for auth changes (login/logout)
    document.addEventListener('authChanged', async () => {
        await checkAuth();
        // Reload data when user logs in
        if (currentUser) {
            await Promise.all([
                loadDepartments(),
                loadCategories(),
                loadMediaTypes(),
                loadMedia()
            ]);
        }
    });

    // Check Authentication
    async function checkAuth() {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');

        if (userData && userData !== 'undefined') {
            try {
                currentUser = JSON.parse(userData);
                updateUIForUser();
            } catch (e) {
                console.error('Invalid user data in media library:', e);
                localStorage.removeItem('userData');
                // Proceed to try fetching from API if token exists
                if (token) {
                    await fetchUser(token);
                } else {
                    currentUser = null;
                    updateUIForUser();
                }
            }
        } else if (token) {
            await fetchUser(token);
        } else {
            currentUser = null;
            updateUIForUser();
        }
    }

    async function fetchUser(token) {
        try {
            const response = await fetch(`${API_BASE}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                currentUser = data.user;
                localStorage.setItem('userData', JSON.stringify(currentUser));
                updateUIForUser();
            } else {
                currentUser = null;
                updateUIForUser();
            }
        } catch (error) {
            console.error('Auth error:', error);
            currentUser = null;
            updateUIForUser();
        }
    }

    function updateUIForUser() {
        const btnUpload = document.getElementById('btnUploadMedia');
        const btnStats = document.getElementById('btnMediaStats');

        if (currentUser && currentUser.role === 'admin') {
            if (btnUpload) btnUpload.style.display = 'inline-flex';
            if (btnStats) btnStats.style.display = 'inline-flex';
        } else {
            if (btnUpload) btnUpload.style.display = 'none';
            if (btnStats) btnStats.style.display = 'none';
        }
    }

    // Load Departments
    async function loadDepartments() {
        try {
            const token = localStorage.getItem('authToken');
            console.log('Loading departments with token:', token ? 'exists' : 'missing');

            const response = await fetch(`${API_BASE}/media/departments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log('Department API response status:', response.status);
            const data = await response.json();
            console.log('Department API data:', data);

            if (data.success) {
                console.log(`Populating ${data.data.length} departments`);
                populateDepartmentSelects(data.data);
            } else {
                console.error('Department API returned success=false:', data.message);
            }
        } catch (error) {
            console.error('Load departments error:', error);
        }
    }

    function populateDepartmentSelects(departments) {
        const filterSelect = document.getElementById('filterDepartment');
        const formSelect = document.getElementById('mediaDepartment');
        const editSelect = document.getElementById('editMediaDepartment');

        if (filterSelect) {
            // Clear existing options (keep first one)
            while (filterSelect.options.length > 1) filterSelect.remove(1);
            departments.forEach(dept => filterSelect.add(new Option(dept.department_name, dept.department_id)));
        }

        if (formSelect) {
            while (formSelect.options.length > 1) formSelect.remove(1);
            departments.forEach(dept => formSelect.add(new Option(dept.department_name, dept.department_id)));
        }

        if (editSelect) {
            while (editSelect.options.length > 1) editSelect.remove(1);
            departments.forEach(dept => editSelect.add(new Option(dept.department_name, dept.department_id)));
        }
    }

    // Load Categories
    async function loadCategories() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE}/media/categories`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    populateCategorySelects(data.data);
                }
            }
        } catch (error) {
            console.error('Load categories error:', error);
        }
    }

    function populateCategorySelects(categories) {
        const filterSelect = document.getElementById('filterCategory');
        const formSelect = document.getElementById('mediaCategory');
        const editSelect = document.getElementById('editMediaCategory');

        if (filterSelect) {
            while (filterSelect.options.length > 1) filterSelect.remove(1);
            categories.forEach(cat => filterSelect.add(new Option(cat.category_name, cat.category_name)));
        }

        if (formSelect) {
            while (formSelect.options.length > 1) formSelect.remove(1);
            categories.forEach(cat => formSelect.add(new Option(cat.category_name, cat.category_name)));
        }

        if (editSelect) {
            while (editSelect.options.length > 1) editSelect.remove(1);
            categories.forEach(cat => editSelect.add(new Option(cat.category_name, cat.category_name)));
        }
    }

    // Load Media Types
    async function loadMediaTypes() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE}/media/types`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    populateTypeSelects(data.data);
                }
            }
        } catch (error) {
            console.error('Load types error:', error);
        }
    }

    function populateTypeSelects(types) {
        const filterSelect = document.getElementById('filterType');

        if (filterSelect) {
            while (filterSelect.options.length > 1) filterSelect.remove(1);
            types.forEach(type => filterSelect.add(new Option(type.type_name, type.type_code)));
        }
    }

    // Load Media
    async function loadMedia() {
        showLoading();
        try {
            const token = localStorage.getItem('authToken');
            const params = new URLSearchParams();

            // Apply filters
            const search = document.getElementById('searchMedia')?.value;
            const deptId = document.getElementById('filterDepartment')?.value;
            const category = document.getElementById('filterCategory')?.value;
            const fileType = document.getElementById('filterType')?.value;

            if (search) params.append('search', search);
            if (deptId) params.append('department_id', deptId);
            if (category) params.append('category', category);
            if (fileType) params.append('file_type', fileType);

            const response = await fetch(`${API_BASE}/media?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (data.success) {
                allMedia = data.data;
                renderMediaGrid(allMedia);
                updateMediaCount(allMedia.length);
            }
        } catch (error) {
            console.error('Load media error:', error);
            // Don't show alert on load error to avoid spamming
        } finally {
            hideLoading();
        }
    }

    // Render Media Grid
    function renderMediaGrid(mediaList) {
        const grid = document.getElementById('mediaGrid');
        const emptyState = document.getElementById('emptyState');

        if (!grid || !emptyState) return;

        if (mediaList.length === 0) {
            grid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        grid.style.display = 'grid';
        emptyState.style.display = 'none';
        grid.innerHTML = '';

        mediaList.forEach(media => {
            const card = createMediaCard(media);
            grid.appendChild(card);
        });
    }

    // Create Media Card
    function createMediaCard(media) {
        const card = document.createElement('div');
        card.className = 'media-card';
        card.onclick = () => openPreview(media.media_id);

        const thumbnail = createThumbnail(media);
        const body = createCardBody(media);

        card.appendChild(thumbnail);
        card.appendChild(body);

        return card;
    }

    function createThumbnail(media) {
        const div = document.createElement('div');
        div.className = 'media-thumbnail';

        // Badge
        const badge = document.createElement('span');
        badge.className = `media-badge ${media.file_type}`;
        badge.textContent = getFileTypeLabel(media.file_type);
        div.appendChild(badge);

        // Image or icon
        if (media.file_type === 'image') {
            const img = document.createElement('img');
            img.src = media.file_path;
            img.alt = media.title;
            div.appendChild(img);
        } else {
            const icon = document.createElement('span');
            icon.className = 'file-icon';
            icon.textContent = getFileIcon(media.file_type);
            div.appendChild(icon);
        }

        return div;
    }

    function createCardBody(media) {
        const div = document.createElement('div');
        div.className = 'media-card-body';

        const title = document.createElement('h3');
        title.className = 'media-title';
        title.textContent = media.title;
        div.appendChild(title);

        if (media.description) {
            const desc = document.createElement('p');
            desc.className = 'media-description';
            desc.textContent = media.description;
            div.appendChild(desc);
        }

        const meta = document.createElement('div');
        meta.className = 'media-meta';

        if (media.department_name) {
            const deptTag = document.createElement('span');
            deptTag.className = 'media-tag';
            deptTag.textContent = `🏥 ${media.department_name}`;
            meta.appendChild(deptTag);
        }

        if (media.category) {
            const catTag = document.createElement('span');
            catTag.className = 'media-tag';
            catTag.textContent = `📁 ${media.category}`;
            meta.appendChild(catTag);
        }

        div.appendChild(meta);

        const stats = document.createElement('div');
        stats.className = 'media-stats';
        stats.innerHTML = `
            <span>👁️ ${media.view_count || 0}</span>
            <span>⬇️ ${media.download_count || 0}</span>
            <span>💾 ${formatFileSize(media.file_size)}</span>
        `;
        div.appendChild(stats);

        return div;
    }

    // Helper Functions
    function getFileTypeLabel(type) {
        const labels = {
            'image': 'รูปภาพ',
            'pdf': 'PDF',
            'video': 'วิดีโอ'
        };
        return labels[type] || type;
    }

    function getFileIcon(type) {
        const icons = {
            'pdf': '📄',
            'video': '🎥',
            'image': '🖼️'
        };
        return icons[type] || '📁';
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function updateMediaCount(count) {
        const el = document.getElementById('mediaCount');
        if (el) el.textContent = count;
    }

    // Open Preview Modal
    async function openPreview(mediaId) {
        currentMediaId = mediaId;
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE}/media/${mediaId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (data.success) {
                renderPreview(data.data);
                openModal('previewModal');
            }
        } catch (error) {
            console.error('Preview error:', error);
            showError('ไม่สามารถแสดงรายละเอียดสื่อได้');
        }
    }

    function renderPreview(media) {
        document.getElementById('previewTitle').textContent = media.title;

        const content = document.getElementById('previewContent');
        content.innerHTML = '';

        if (media.file_type === 'image') {
            const img = document.createElement('img');
            img.src = media.file_path.startsWith('/') ? media.file_path : '/' + media.file_path;
            img.alt = media.title;
            content.appendChild(img);
        } else if (media.file_type === 'pdf') {
            const iframe = document.createElement('iframe');
            iframe.src = media.file_path.startsWith('/') ? media.file_path : '/' + media.file_path;
            content.appendChild(iframe);
        } else if (media.file_type === 'video') {
            const video = document.createElement('video');
            video.src = media.file_path.startsWith('/') ? media.file_path : '/' + media.file_path;
            video.controls = true;
            content.appendChild(video);
        }

        const info = document.getElementById('previewInfo');
        info.innerHTML = `
            <div class="info-row">
                <span class="info-label">ชื่อไฟล์:</span>
                <span class="info-value">${media.filename}</span>
            </div>
            <div class="info-row">
                <span class="info-label">ประเภท:</span>
                <span class="info-value">${getFileTypeLabel(media.file_type)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">ขนาด:</span>
                <span class="info-value">${formatFileSize(media.file_size)}</span>
            </div>
            ${media.department_name ? `
            <div class="info-row">
                <span class="info-label">แผนก:</span>
                <span class="info-value">${media.department_name}</span>
            </div>` : ''}
            ${media.category ? `
            <div class="info-row">
                <span class="info-label">หมวดหมู่:</span>
                <span class="info-value">${media.category}</span>
            </div>` : ''}
            ${media.description ? `
            <div class="info-row">
                <span class="info-label">คำอธิบาย:</span>
                <span class="info-value">${media.description}</span>
            </div>` : ''}
            <div class="info-row">
                <span class="info-label">อัปโหลดโดย:</span>
                <span class="info-value">${media.uploaded_by_name}</span>
            </div>
            <div class="info-row">
                <span class="info-label">วันที่อัปโหลด:</span>
                <span class="info-value">${formatDate(media.upload_date)}</span>
            </div>
        `;

        // Show/Hide admin buttons
        const btnEdit = document.getElementById('btnEditMedia');
        const btnDelete = document.getElementById('btnDeleteMedia');

        if (currentUser && currentUser.role === 'admin') {
            if (btnEdit) btnEdit.style.display = 'inline-flex';
            if (btnDelete) btnDelete.style.display = 'inline-flex';
        } else {
            if (btnEdit) btnEdit.style.display = 'none';
            if (btnDelete) btnDelete.style.display = 'none';
        }

        // Set download button
        document.getElementById('btnDownloadMedia').onclick = () => downloadMedia(media.media_id);
        document.getElementById('btnDeleteMedia').onclick = () => deleteMedia(media.media_id);
        document.getElementById('btnEditMedia').onclick = () => openEditModal(media.media_id);
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Upload Media
    function openUploadModal() {
        if (currentUser && currentUser.role !== 'admin') {
            showError('เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถอัปโหลดสื่อได้');
            return;
        }
        document.getElementById('uploadForm').reset();
        document.getElementById('filePreview').style.display = 'none';
        document.querySelector('.drop-zone-content').style.display = 'flex';
        selectedFile = null;
        openModal('uploadModal');
    }

    async function handleUpload(event) {
        event.preventDefault();

        if (!selectedFile) {
            showError('กรุณาเลือกไฟล์');
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', document.getElementById('mediaTitle').value);
        formData.append('description', document.getElementById('mediaDescription').value);
        formData.append('department_id', document.getElementById('mediaDepartment').value);
        formData.append('category', document.getElementById('mediaCategory').value);
        formData.append('tags', document.getElementById('mediaTags').value);

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE}/media/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                showSuccess('อัปโหลดสื่อสำเร็จ');
                closeModal('uploadModal');
                await loadMedia();
            } else {
                showError(data.message || 'ไม่สามารถอัปโหลดสื่อได้');
            }
        } catch (error) {
            console.error('Upload error:', error);
            showError('เกิดข้อผิดพลาดในการอัปโหลด');
        }
    }

    // Download Media
    async function downloadMedia(mediaId) {
        try {
            const token = localStorage.getItem('authToken');
            window.open(`${API_BASE}/media/download/${mediaId}?token=${token}`, '_blank');
        } catch (error) {
            console.error('Download error:', error);
            showError('ไม่สามารถดาวน์โหลดสื่อได้');
        }
    }

    // Edit Media
    async function openEditModal(mediaId) {
        currentMediaId = mediaId;
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE}/media/${mediaId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (data.success) {
                const media = data.data;

                // Populate form
                document.getElementById('editMediaId').value = media.media_id;
                document.getElementById('editMediaTitle').value = media.title;
                document.getElementById('editMediaDescription').value = media.description || '';
                document.getElementById('editMediaCategory').value = media.category || '';

                // Populate departments in edit modal if empty
                const editDeptSelect = document.getElementById('editMediaDepartment');
                if (editDeptSelect.options.length <= 1) {
                    const formSelect = document.getElementById('mediaDepartment');
                    Array.from(formSelect.options).slice(1).forEach(opt => {
                        editDeptSelect.add(new Option(opt.text, opt.value));
                    });
                }
                editDeptSelect.value = media.department_id || '';

                // Handle tags
                let tags = '';
                if (media.tags) {
                    try {
                        const tagsArray = typeof media.tags === 'string' ? JSON.parse(media.tags) : media.tags;
                        tags = Array.isArray(tagsArray) ? tagsArray.join(', ') : tagsArray;
                    } catch (e) {
                        tags = media.tags;
                    }
                }
                document.getElementById('editMediaTags').value = tags;

                closeModal('previewModal');
                openModal('editModal');
            }
        } catch (error) {
            console.error('Edit error:', error);
            showError('ไม่สามารถโหลดข้อมูลสื่อได้');
        }
    }

    async function handleEditSubmit(event) {
        event.preventDefault();
        const mediaId = document.getElementById('editMediaId').value;

        const updateData = {
            title: document.getElementById('editMediaTitle').value,
            description: document.getElementById('editMediaDescription').value,
            department_id: document.getElementById('editMediaDepartment').value,
            category: document.getElementById('editMediaCategory').value,
            tags: document.getElementById('editMediaTags').value
        };

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE}/media/${mediaId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            const data = await response.json();
            if (data.success) {
                showSuccess('แก้ไขข้อมูลสื่อสำเร็จ');
                closeModal('editModal');
                await loadMedia();
            } else {
                showError(data.message || 'ไม่สามารถแก้ไขข้อมูลสื่อได้');
            }
        } catch (error) {
            console.error('Update error:', error);
            showError('เกิดข้อผิดพลาดในการแก้ไขข้อมูล');
        }
    }

    // Delete Media
    async function deleteMedia(mediaId) {
        if (!confirm('คุณต้องการลบสื่อนี้ใช่หรือไม่?')) {
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE}/media/${mediaId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (data.success) {
                showSuccess('ลบสื่อสำเร็จ');
                closeModal('previewModal');
                await loadMedia();
            } else {
                showError(data.message || 'ไม่สามารถลบสื่อได้');
            }
        } catch (error) {
            console.error('Delete error:', error);
            showError('เกิดข้อผิดพลาดในการลบสื่อ');
        }
    }

    // Load Statistics
    async function loadStats() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE}/media/stats/overview`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (data.success) {
                renderStats(data.data);
                openModal('statsModal');
            }
        } catch (error) {
            console.error('Stats error:', error);
            showError('ไม่สามารถโหลดสถิติได้');
        }
    }

    function renderStats(stats) {
        const content = document.getElementById('statsContent');

        let html = '<div class="stats-grid">';

        // Type stats
        stats.by_type.forEach((item, index) => {
            const cardClass = index === 0 ? '' : index === 1 ? 'secondary' : 'tertiary';
            html += `
                <div class="stat-card ${cardClass}">
                    <div class="stat-number">${item.count}</div>
                    <div class="stat-label">${getFileTypeLabel(item.file_type)}</div>
                </div>
            `;
        });

        html += '</div>';

        // Department stats
        html += '<h3 style="margin: 24px 0 12px 0;">จำนวนสื่อแยกตามแผนก</h3>';
        html += '<table class="stats-table"><thead><tr><th>แผนก</th><th>จำนวน</th></tr></thead><tbody>';
        stats.by_department.slice(0, 10).forEach(item => {
            html += `<tr><td>${item.department_name || 'ไม่ระบุ'}</td><td>${item.count}</td></tr>`;
        });
        html += '</tbody></table>';

        // Category stats
        if (stats.by_category.length > 0) {
            html += '<h3 style="margin: 24px 0 12px 0;">จำนวนสื่อแยกตามหมวดหมู่</h3>';
            html += '<table class="stats-table"><thead><tr><th>หมวดหมู่</th><th>จำนวน</th></tr></thead><tbody>';
            stats.by_category.forEach(item => {
                html += `<tr><td>${item.category}</td><td>${item.count}</td></tr>`;
            });
            html += '</tbody></table>';
        }

        content.innerHTML = html;
    }

    // Event Listeners
    function initializeEventListeners() {
        // Upload button
        const btnUpload = document.getElementById('btnUploadMedia');
        if (btnUpload) btnUpload.addEventListener('click', openUploadModal);

        // Stats button
        const btnStats = document.getElementById('btnMediaStats');
        if (btnStats) btnStats.addEventListener('click', loadStats);

        // Filters
        document.getElementById('searchMedia')?.addEventListener('input', debounce(loadMedia, 500));
        document.getElementById('filterDepartment')?.addEventListener('change', loadMedia);
        document.getElementById('filterCategory')?.addEventListener('change', loadMedia);
        document.getElementById('filterType')?.addEventListener('change', loadMedia);
        document.getElementById('btnClearFilters')?.addEventListener('click', clearFilters);

        // View toggle
        document.getElementById('btnGridView')?.addEventListener('click', () => {
            document.getElementById('mediaGrid').classList.remove('list-view');
            document.getElementById('btnGridView').classList.add('active');
            document.getElementById('btnListView').classList.remove('active');
        });
        document.getElementById('btnListView')?.addEventListener('click', () => {
            document.getElementById('mediaGrid').classList.add('list-view');
            document.getElementById('btnListView').classList.add('active');
            document.getElementById('btnGridView').classList.remove('active');
        });

        // Upload form
        document.getElementById('uploadForm')?.addEventListener('submit', handleUpload);
        document.getElementById('btnCancelUpload')?.addEventListener('click', () => closeModal('uploadModal'));

        // Edit form
        document.getElementById('editForm')?.addEventListener('submit', handleEditSubmit);
        document.getElementById('btnCancelEdit')?.addEventListener('click', () => closeModal('editModal'));

        // File input
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('uploadFile');

        if (dropZone && fileInput) {
            dropZone.addEventListener('click', () => fileInput.click());

            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });

            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('dragover');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                if (e.dataTransfer.files.length) {
                    handleFileSelect(e.dataTransfer.files[0]);
                }
            });

            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length) {
                    handleFileSelect(e.target.files[0]);
                }
            });
        }

        // Modal close buttons
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                closeAllModals();
            });
        });

        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal(modal.id);
                }
            });
        });

        // Update UI based on current user state
        updateUIForUser();
    }

    function handleFileSelect(file) {
        // Check file size (100MB)
        if (file.size > 100 * 1024 * 1024) {
            showError('ขนาดไฟล์เกิน 100MB');
            return;
        }

        // Check file type
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'video/mp4', 'video/quicktime'];
        if (!validTypes.includes(file.type)) {
            showError('ประเภทไฟล์ไม่รองรับ (รองรับ JPG, PNG, GIF, PDF, MP4, MOV)');
            return;
        }

        selectedFile = file;

        // Show preview
        const preview = document.getElementById('filePreview');
        preview.style.display = 'flex';
        preview.innerHTML = `
        <span class="file-preview-icon">${getFileIconByType(file.type)}</span>
        <div class="file-preview-info">
            <div class="file-preview-name">${file.name}</div>
            <div class="file-preview-size">${formatFileSize(file.size)}</div>
        </div>
    `;

        // Hide drop zone content
        document.querySelector('.drop-zone-content').style.display = 'none';
    }

    function getFileIconByType(mimeType) {
        if (mimeType.startsWith('image/')) return '🖼️';
        if (mimeType === 'application/pdf') return '📄';
        if (mimeType.startsWith('video/')) return '🎥';
        return '📁';
    }

    function clearFilters() {
        const search = document.getElementById('searchMedia');
        const dept = document.getElementById('filterDepartment');
        const cat = document.getElementById('filterCategory');
        const type = document.getElementById('filterType');

        if (search) search.value = '';
        if (dept) dept.value = '';
        if (cat) cat.value = '';
        if (type) type.value = '';
        loadMedia();
    }

    // Utility Functions
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    function closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }

    function showLoading() {
        const loader = document.getElementById('loadingIndicator');
        const grid = document.getElementById('mediaGrid');
        const empty = document.getElementById('emptyState');

        if (loader) loader.style.display = 'block';
        if (grid) grid.style.display = 'none';
        if (empty) empty.style.display = 'none';
    }

    function hideLoading() {
        const loader = document.getElementById('loadingIndicator');
        if (loader) loader.style.display = 'none';
    }

    function showError(message) {
        alert('❌ ' + message);
    }

    function showSuccess(message) {
        alert('✅ ' + message);
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

})();
