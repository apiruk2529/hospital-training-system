/**
 * Provider-ID Registration Approvals Management
 * Admin interface for approving/rejecting Provider-ID registrations
 */

let currentRejectionId = null;

/**
 * Load pending registrations
 * @param {boolean} countOnly - If true, only update valid badge count
 */
async function loadPendingRegistrations(countOnly = false) {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/provider-auth/pending', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            updatePendingBadge(data.data.length);
            if (!countOnly) {
                displayRegistrations(data.data);
            }
        } else {
            console.error('Failed to load pending registrations:', data.message);
            if (!countOnly) showError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
        }
    } catch (error) {
        console.error('Load registrations error:', error);
        if (!countOnly) showError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
}

/**
 * Update pending count badge
 */
function updatePendingBadge(count) {
    const badge = document.getElementById('pendingCountBadge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

// Remove old observer code as it's now handled by app.js tabs logic
// Auto-load when section is shown - REMOVED


/**
 * Display registrations in table
 */
function displayRegistrations(registrations) {
    const tbody = document.getElementById('approvalsTableBody');

    if (!registrations || registrations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <i class="fas fa-inbox"></i><br>
                    ไม่มีการลงทะเบียนที่รอการอนุมัติ
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = registrations.map(reg => `
        <tr>
            <td>
                <div class="user-info">
                    <div class="user-name">${escapeHtml(reg.full_name)}</div>
                    <div class="user-email">${escapeHtml(reg.email)}</div>
                </div>
            </td>
            <td>${escapeHtml(reg.cid || '-')}</td>
            <td>${escapeHtml(reg.position || '-')}</td>
            <td>${escapeHtml(reg.hospital || '-')}</td>
            <td>${formatDate(reg.created_at)}</td>
            <td>
                <span class="status-badge ${reg.status}">
                    ${getStatusText(reg.status)}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-success btn-sm btn-approve" data-id="${reg.registration_id}">
                        <i class="fas fa-check"></i> อนุมัติ
                    </button>
                    <button class="btn btn-danger btn-sm btn-reject" data-id="${reg.registration_id}">
                        <i class="fas fa-times"></i> ปฏิเสธ
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

/**
 * Approve registration
 */
async function approveRegistration(registrationId) {
    console.log('approveRegistration called with ID:', registrationId);
    // if (!confirm('ยืนยันการอนุมัติการลงทะเบียนนี้? (ID: ' + registrationId + ')')) {
    //     return;
    // }

    try {
        const token = localStorage.getItem('authToken');
        console.log('Sending approval request for ID:', registrationId);

        const response = await fetch(`/api/provider-auth/approve/${registrationId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Approve response status:', response.status);
        const text = await response.text();
        console.log('Approve response body:', text);

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('Failed to parse response JSON:', e);
            throw new Error('Server returned invalid JSON: ' + text.substring(0, 100));
        }

        if (data.success) {
            showSuccess('อนุมัติการลงทะเบียนสำเร็จ');
            loadPendingRegistrations();
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Approve error:', error);
        showError('เกิดข้อผิดพลาดในการอนุมัติ: ' + error.message);
    }
}

/**
 * Open rejection modal
 */
function openRejectionModal(registrationId) {
    currentRejectionId = registrationId;
    document.getElementById('rejectionReason').value = '';
    document.getElementById('rejectionModal').classList.add('active');
}

/**
 * Close rejection modal
 */
function closeRejectionModal() {
    currentRejectionId = null;
    document.getElementById('rejectionModal').classList.remove('active');
}

/**
 * Confirm rejection
 */
async function confirmRejection() {
    const reason = document.getElementById('rejectionReason').value.trim();

    if (!reason) {
        alert('กรุณาระบุเหตุผลในการปฏิเสธ');
        return;
    }

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/provider-auth/reject/${currentRejectionId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason })
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('ปฏิเสธการลงทะเบียนสำเร็จ');
            closeRejectionModal();
            loadPendingRegistrations();
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Reject error:', error);
        showError('เกิดข้อผิดพลาดในการปฏิเสธ');
    }
}

/**
 * Get status text in Thai
 */
function getStatusText(status) {
    const statusMap = {
        'pending': 'รออนุมัติ',
        'approved': 'อนุมัติแล้ว',
        'rejected': 'ปฏิเสธ'
    };
    return statusMap[status] || status;
}

/**
 * Format date to Thai format
 */
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show success message
 */
function showSuccess(message) {
    showMessageModal('สำเร็จ', message, 'text-success');
}

/**
 * Show error message
 */
function showError(message) {
    showMessageModal('แจ้งเตือน', message, 'text-danger');
}

/**
 * Show generic message modal
 */
function showMessageModal(title, message, titleClass = '') {
    const modal = document.getElementById('messageModal');
    const titleEl = document.getElementById('messageModalTitle');
    const textEl = document.getElementById('messageModalText');

    if (modal && titleEl && textEl) {
        titleEl.textContent = title;
        titleEl.className = titleClass; // Reset and set class
        textEl.textContent = message;
        modal.classList.add('active');
    } else {
        alert(message); // Fallback
    }
}

/**
 * Close message modal
 */
function closeMessageModal() {
    const modal = document.getElementById('messageModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Event Delegation for dynamic buttons
document.addEventListener('click', function (e) {
    // Handle Approve Button
    const approveBtn = e.target.closest('.btn-approve');
    if (approveBtn) {
        const id = approveBtn.getAttribute('data-id');
        if (id) {
            approveRegistration(id);
        }
    }

    // Handle Reject Button
    const rejectBtn = e.target.closest('.btn-reject');
    if (rejectBtn) {
        const id = rejectBtn.getAttribute('data-id');
        if (id) {
            openRejectionModal(id);
        }
    }
});

// Make functions global for inline onclick handlers (fallback)
window.approveRegistration = approveRegistration;
window.openRejectionModal = openRejectionModal;
window.closeRejectionModal = closeRejectionModal;
window.confirmRejection = confirmRejection;
window.loadPendingRegistrations = loadPendingRegistrations;
window.closeMessageModal = closeMessageModal;

console.log('Provider Approvals Script Loaded (Event Delegation Active)');
