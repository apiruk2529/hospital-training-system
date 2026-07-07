// Online Training Module - Admin Functions

let currentMaterials = [];
let materialsToDelete = [];

// Initialize Admin Events
document.addEventListener('componentsLoaded', function () {
    // Course Form Submit
    const courseForm = document.getElementById('courseForm');
    if (courseForm) {
        courseForm.addEventListener('submit', handleCourseSubmit);
    }

    // Cover Image Preview
    const courseCover = document.getElementById('courseCover');
    if (courseCover) {
        courseCover.addEventListener('change', function (e) {
            const file = e.target.files[0];
            const preview = document.getElementById('courseCoverPreview');

            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    preview.innerHTML = `<img src="${e.target.result}" style="width:100%; height:140px; object-fit:cover; border-radius: 8px;">`;
                    preview.style.display = 'block';
                }
                reader.readAsDataURL(file);
            } else {
                preview.innerHTML = '';
                preview.style.display = 'none';
            }
        });
    }

    // Material Type Toggle
    const materialType = document.getElementById('materialType');
    if (materialType) {
        materialType.addEventListener('change', function () {
            const type = this.value;
            const videoSourceGroup = document.getElementById('videoSourceGroup');

            if (type === 'video') {
                videoSourceGroup.style.display = 'block';
                // Trigger change on checked radio to set correct visibility
                const checkedSource = document.querySelector('input[name="videoSource"]:checked');
                if (checkedSource) checkedSource.dispatchEvent(new Event('change'));

                document.getElementById('pdfFileGroup').style.display = 'none';
            } else {
                videoSourceGroup.style.display = 'none';
                document.getElementById('videoUrlGroup').style.display = 'none';
                document.getElementById('videoFileGroup').style.display = 'none';
                document.getElementById('pdfFileGroup').style.display = 'block';
            }
        });
    }

    // Video Source Toggle
    document.querySelectorAll('input[name="videoSource"]').forEach(radio => {
        radio.addEventListener('change', function () {
            if (document.getElementById('materialType').value !== 'video') return;

            if (this.value === 'youtube') {
                document.getElementById('videoUrlGroup').style.display = 'block';
                document.getElementById('videoFileGroup').style.display = 'none';
            } else {
                document.getElementById('videoUrlGroup').style.display = 'none';
                document.getElementById('videoFileGroup').style.display = 'block';
            }
        });
    });

    // Add Material Button
    const btnAddMaterial = document.getElementById('btnAddMaterial');
    if (btnAddMaterial) {
        btnAddMaterial.addEventListener('click', addMaterial);
    }

    // Add Course Button (Admin) - Ensure this is attached even if online-training.js loads later
    const btnAddCourse = document.getElementById('btnAddCourse');
    if (btnAddCourse) {
        btnAddCourse.addEventListener('click', openCourseModal);
    }

    // Modal Close Buttons
    document.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
        btn.addEventListener('click', closeCourseModal);
    });
});

// Open Course Modal (Create)
function openCourseModal() {
    const modal = document.getElementById('courseModal');
    const form = document.getElementById('courseForm');
    const title = document.getElementById('courseModalTitle');

    if (!modal || !form) return;

    // Reset Form
    form.reset();
    document.getElementById('courseId').value = '';
    document.getElementById('courseRequiredTime').value = '60'; // Default
    document.getElementById('courseCoverPreview').innerHTML = '';
    document.getElementById('courseCoverPreview').style.display = 'none';

    // Reset Materials
    currentMaterials = [];
    materialsToDelete = [];
    renderMaterialsList();

    // Reset Material Inputs
    document.getElementById('materialType').value = 'video';
    document.getElementById('videoSourceGroup').style.display = 'block';

    // Reset Video Source to YouTube
    const youtubeRadio = document.querySelector('input[name="videoSource"][value="youtube"]');
    if (youtubeRadio) {
        youtubeRadio.checked = true;
        youtubeRadio.dispatchEvent(new Event('change'));
    }

    document.getElementById('pdfFileGroup').style.display = 'none';

    title.textContent = 'สร้างหลักสูตรใหม่';
    modal.classList.add('active');
}

// Close Course Modal
function closeCourseModal() {
    const modal = document.getElementById('courseModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Add Material to List (Client-side)
function addMaterial() {
    const type = document.getElementById('materialType').value;
    const title = document.getElementById('materialTitle').value;

    if (!title) {
        alert('กรุณาระบุชื่อสื่อการเรียนรู้');
        return;
    }

    let material = {
        id: 'new_' + Date.now(),
        title: title,
        type: type,
        isNew: true
    };

    if (type === 'video') {
        const source = document.querySelector('input[name="videoSource"]:checked').value;

        if (source === 'youtube') {
            const url = document.getElementById('materialVideoUrl').value;
            if (!url) {
                alert('กรุณาระบุ YouTube URL');
                return;
            }
            material.content_url = url;
        } else {
            const fileInput = document.getElementById('materialVideoFile');
            if (fileInput.files.length === 0) {
                alert('กรุณาเลือกไฟล์วิดีโอ');
                return;
            }
            material.file = fileInput.files[0];
            material.content_url = material.file.name;
        }
    } else {
        const fileInput = document.getElementById('materialPdfFile');
        if (fileInput.files.length === 0) {
            alert('กรุณาเลือกไฟล์ PDF');
            return;
        }
        material.file = fileInput.files[0];
        material.content_url = material.file.name; // Display name
    }

    currentMaterials.push(material);
    renderMaterialsList();

    // Reset inputs
    document.getElementById('materialTitle').value = '';
    document.getElementById('materialVideoUrl').value = '';
    document.getElementById('materialVideoFile').value = '';
    document.getElementById('materialPdfFile').value = '';
}

// Render Materials List
function renderMaterialsList() {
    const container = document.getElementById('materialsList');
    if (!container) return;

    if (currentMaterials.length === 0) {
        container.innerHTML = '<p style="color: #6b7280; font-style: italic;">ยังไม่มีสื่อการเรียนรู้</p>';
        return;
    }

    let html = '<ul style="list-style: none; padding: 0; margin: 0;">';

    currentMaterials.forEach((item, index) => {
        const icon = item.type === 'video' ? '🎥' : '📄';
        const displayUrl = item.type === 'video' ? item.content_url : (item.file ? item.file.name : item.content_url);

        html += `
            <li style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #eee; background: #fff;">
                <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
                    <span style="font-size: 1.2rem;">${icon}</span>
                    <div style="overflow: hidden;">
                        <div style="font-weight: 500;">${item.title}</div>
                        <div style="font-size: 0.8rem; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${displayUrl}</div>
                    </div>
                </div>
                <button type="button" onclick="removeMaterial(${index})" style="color: #ef4444; background: none; border: none; cursor: pointer; padding: 4px;">❌</button>
            </li>
        `;
    });

    html += '</ul>';
    container.innerHTML = html;
}

// Remove Material
function removeMaterial(index) {
    const item = currentMaterials[index];

    // If it's an existing item (not new), add to delete list
    if (!item.isNew && item.material_id) {
        materialsToDelete.push(item.material_id);
    }

    currentMaterials.splice(index, 1);
    renderMaterialsList();
}

// Handle Course Submit (Create/Edit)
async function handleCourseSubmit(e) {
    e.preventDefault();

    // Check if user forgot to click "+ Add Material"
    const matTitle = document.getElementById('materialTitle').value.trim();
    const matVideoUrl = document.getElementById('materialVideoUrl').value.trim();
    const matVideoFile = document.getElementById('materialVideoFile').files.length > 0;
    const matPdfFile = document.getElementById('materialPdfFile').files.length > 0;

    if (matTitle || matVideoUrl || matVideoFile || matPdfFile) {
        alert('⚠️ คุณมีข้อมูลสื่อการเรียนรู้ที่ยังไม่ได้กดปุ่ม "+ เพิ่มสื่อการเรียนรู้"\n\nกรุณากดปุ่ม "+ เพิ่มสื่อการเรียนรู้" (ปุ่มสีเทา) ก่อนกดบันทึกหลักสูตรครับ');
        return;
    }

    const courseId = document.getElementById('courseId').value;
    const title = document.getElementById('courseTitle').value;
    const description = document.getElementById('courseDescription').value;
    const requiredTime = document.getElementById('courseRequiredTime').value;
    const coverFile = document.getElementById('courseCover').files[0];

    // 1. Save Course Details
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('required_learning_minutes', requiredTime);
    if (coverFile) {
        formData.append('cover_image', coverFile);
    }

    const url = courseId ? `${API_URL}/courses/${courseId}` : `${API_URL}/courses`;
    const method = courseId ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message);
        }

        const savedCourseId = courseId || data.data?.courseId || data.courseId;

        // 2. Process Deletions
        if (materialsToDelete.length > 0) {
            for (const materialId of materialsToDelete) {
                await fetch(`${API_URL}/courses/materials/${materialId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
            }
        }

        // 3. Process Additions (New Materials)
        const newMaterials = currentMaterials.filter(m => m.isNew);
        for (const material of newMaterials) {
            const materialData = new FormData();
            materialData.append('title', material.title);
            materialData.append('type', material.type);
            materialData.append('order_index', 0); // Default order

            if (material.type === 'video') {
                if (material.file) {
                    materialData.append('file', material.file);
                } else {
                    materialData.append('content_url', material.content_url);
                }
            } else if (material.type === 'pdf' && material.file) {
                materialData.append('file', material.file);
            }

            const matResponse = await fetch(`${API_URL}/courses/${savedCourseId}/materials`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}` },
                body: materialData
            });
            
            if (!matResponse.ok) {
                throw new Error(`อัปโหลดสื่อล้มเหลว (Status: ${matResponse.status}) อาจเกิดจากไฟล์มีขนาดใหญ่เกินไป`);
            }
            
            const matData = await matResponse.json();
            if (!matData.success) {
                throw new Error(`อัปโหลดสื่อล้มเหลว: ${matData.message}`);
            }
        }

        alert(courseId ? 'อัปเดตหลักสูตรสำเร็จ!' : 'สร้างหลักสูตรสำเร็จ!');
        closeCourseModal();
        loadCourses(); // Reload list

    } catch (error) {
        console.error('Error saving course:', error);
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message);
    }
}

// Edit Course (Open Modal with Data)
async function editCourse(courseId) {
    try {
        const response = await fetch(`${API_URL}/courses/${courseId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.success) {
            const course = data.data;

            // Set Form Data
            document.getElementById('courseId').value = course.course_id;
            document.getElementById('courseTitle').value = course.title;
            document.getElementById('courseDescription').value = course.description || '';
            document.getElementById('courseRequiredTime').value = course.required_learning_minutes || 60;

            // Set Cover Image
            const preview = document.getElementById('courseCoverPreview');
            if (course.cover_image) {
                preview.innerHTML = `<img src="/uploads/${course.cover_image}" style="width:100%; height:140px; object-fit:cover; border-radius: 8px;">`;
                preview.style.display = 'block';
            } else {
                preview.innerHTML = '';
                preview.style.display = 'none';
            }

            // Set Materials
            currentMaterials = data.materials || []; // API should return materials in 'materials' field or inside 'data'
            // Check if materials are inside data.materials or separate
            if (course.materials) {
                currentMaterials = course.materials;
            } else if (data.materials) {
                currentMaterials = data.materials;
            }

            materialsToDelete = [];
            renderMaterialsList();

            document.getElementById('courseModalTitle').textContent = 'แก้ไขหลักสูตร';
            document.getElementById('courseModal').classList.add('active');
        } else {
            alert('ไม่สามารถดึงข้อมูลหลักสูตรได้: ' + data.message);
        }
    } catch (error) {
        console.error('Error fetching course details:', error);
        alert('เกิดข้อผิดพลาดในการดึงข้อมูลหลักสูตร: ' + error.message);
    }
}

// Delete Course
async function deleteCourse(courseId) {
    if (!confirm('ต้องการลบหลักสูตรนี้หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) return;

    try {
        const response = await fetch(`${API_URL}/courses/${courseId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.success) {
            alert('ลบหลักสูตรสำเร็จ!');
            loadCourses();
        } else {
            alert('เกิดข้อผิดพลาด: ' + data.message);
        }
    } catch (error) {
        console.error('Error deleting course:', error);
        alert('เกิดข้อผิดพลาดในการลบหลักสูตร');
    }
}
