/**
 * Provider-ID OAuth Authentication Handler
 * Handles login and registration flows with MOPH Provider-ID
 */

const ProviderAuth = {
    /**
     * Initialize Provider-ID authentication
     */
    init() {
        const btnProviderLogin = document.getElementById('btnProviderLogin');
        const btnProviderRegister = document.getElementById('btnProviderRegister');

        if (btnProviderLogin) {
            btnProviderLogin.addEventListener('click', () => this.handleProviderLogin());
        }

        if (btnProviderRegister) {
            btnProviderRegister.addEventListener('click', () => this.handleProviderRegister());
        }

        // Check for OAuth callback
        this.checkOAuthCallback();
    },

    /**
     * Handle Provider-ID login
     */
    async handleProviderLogin() {
        try {
            const response = await fetch('/api/provider-auth/login');
            const data = await response.json();

            if (data.success) {
                // Redirect to MOPH OAuth
                window.location.href = data.data.authUrl;
            } else {
                this.showError(data.message);
            }
        } catch (error) {
            console.error('Provider login error:', error);
            this.showError('เกิดข้อผิดพลาดในการเชื่อมต่อ Provider-ID');
        }
    },

    /**
     * Handle Provider-ID registration
     */
    async handleProviderRegister() {
        try {
            const response = await fetch('/api/provider-auth/register');
            const data = await response.json();

            if (data.success) {
                // Redirect to MOPH OAuth
                window.location.href = data.data.authUrl;
            } else {
                this.showError(data.message);
            }
        } catch (error) {
            console.error('Provider register error:', error);
            this.showError('เกิดข้อผิดพลาดในการเชื่อมต่อ Provider-ID');
        }
    },

    /**
     * Check for OAuth callback parameters or redirect parameters
     */
    checkOAuthCallback() {
        const urlParams = new URLSearchParams(window.location.search);

        // Check for Provider-ID login success (with token)
        const token = urlParams.get('token');
        const providerLogin = urlParams.get('provider_login');

        if (token && providerLogin === 'success') {
            // Store token and redirect to dashboard
            localStorage.setItem('authToken', token);
            window.location.href = '/';
            return;
        }

        // Check for registration status
        const providerStatus = urlParams.get('provider_status');
        const message = urlParams.get('message');
        const fullName = urlParams.get('full_name');
        const email = urlParams.get('email');

        if (providerStatus === 'pending' && message) {
            // Show pending registration message
            this.showRegistrationPending({
                fullName: fullName || '',
                email: email || ''
            });
            // Clean up URL
            window.history.replaceState({}, document.title, '/');
            return;
        }

        // Check for errors
        const providerError = urlParams.get('provider_error');
        if (providerError) {
            this.showError(decodeURIComponent(providerError));
            window.history.replaceState({}, document.title, '/');
            return;
        }

        // Check for general status messages
        if (message) {
            this.showError(decodeURIComponent(message));
            window.history.replaceState({}, document.title, '/');
        }
    },



    /**
     * Show registration pending status
     */
    showRegistrationPending(data = {}) {
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.innerHTML = `
                <div class="registration-status">
                    <div class="status-icon pending">⏳</div>
                    <div class="status-message">รอการอนุมัติจากผู้ดูแลระบบ</div>
                    <p>การลงทะเบียนของคุณได้รับการบันทึกแล้ว</p>
                    <p>กรุณารอการอนุมัติจากผู้ดูแลระบบ</p>
                    ${data.fullName ? `
                        <div class="status-details">
                            <div class="detail-row">
                                <span class="detail-label">ชื่อ-นามสกุล:</span>
                                <span class="detail-value">${data.fullName}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">อีเมล:</span>
                                <span class="detail-value">${data.email}</span>
                            </div>
                            ${data.position ? `
                                <div class="detail-row">
                                    <span class="detail-label">ตำแหน่ง:</span>
                                    <span class="detail-value">${data.position}</span>
                                </div>
                            ` : ''}
                            ${data.hospital ? `
                                <div class="detail-row">
                                    <span class="detail-label">โรงพยาบาล:</span>
                                    <span class="detail-value">${data.hospital}</span>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            `;
            loginError.classList.add('active');
            loginError.style.background = 'rgba(245, 158, 11, 0.1)';
            loginError.style.color = 'var(--text-primary)';
        }
    },

    /**
     * Show error message
     */
    showError(message) {
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.textContent = message;
            loginError.classList.add('active');
        }
    }
};

// Initialize when components are loaded (not just DOM ready)
// This ensures login.html is loaded before we try to attach event listeners
document.addEventListener('componentsLoaded', () => {
    console.log('Provider-ID: Initializing after components loaded');
    ProviderAuth.init();
});

// Also initialize if components are already loaded
if (window.componentsLoaded) {
    console.log('Provider-ID: Components already loaded, initializing now');
    ProviderAuth.init();
}
