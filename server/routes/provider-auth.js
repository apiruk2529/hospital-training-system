const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { promisePool } = require('../config/database');
const { providerIdConfig, getAuthorizationUrl, validateConfig } = require('../config/provider-id-config');
const { verifyToken, isAdmin } = require('../middleware/auth');
require('dotenv').config();

// In-memory store for OAuth states (in production, use Redis or database)
const oauthStates = new Map();

/**
 * Generate secure random state for CSRF protection
 */
function generateState(type = 'login') {
    const state = crypto.randomBytes(32).toString('hex');
    const data = {
        state,
        type, // 'login' or 'register'
        timestamp: Date.now()
    };
    oauthStates.set(state, data);

    // Clean up expired states
    setTimeout(() => oauthStates.delete(state), providerIdConfig.stateExpiry);

    return state;
}

/**
 * Validate and consume OAuth state
 */
function validateState(state) {
    const data = oauthStates.get(state);
    if (!data) return null;

    // Check if expired
    if (Date.now() - data.timestamp > providerIdConfig.stateExpiry) {
        oauthStates.delete(state);
        return null;
    }

    // Consume state (one-time use)
    oauthStates.delete(state);
    return data;
}

/**
 * GET /api/provider-auth/login
 * Redirect to MOPH Provider-ID for login
 */
router.get('/login', (req, res) => {
    try {
        if (!validateConfig()) {
            return res.status(500).json({
                success: false,
                message: 'Provider-ID OAuth ยังไม่ได้ตั้งค่า กรุณาติดต่อผู้ดูแลระบบ'
            });
        }

        const state = generateState('login');
        const authUrl = getAuthorizationUrl(state);

        res.json({
            success: true,
            data: {
                authUrl,
                state
            }
        });

    } catch (error) {
        console.error('Provider-ID login error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Provider-ID'
        });
    }
});

/**
 * GET /api/provider-auth/register
 * Redirect to MOPH Provider-ID for registration
 */
router.get('/register', (req, res) => {
    try {
        if (!validateConfig()) {
            return res.status(500).json({
                success: false,
                message: 'Provider-ID OAuth ยังไม่ได้ตั้งค่า กรุณาติดต่อผู้ดูแลระบบ'
            });
        }

        const state = generateState('register');
        const authUrl = getAuthorizationUrl(state);

        res.json({
            success: true,
            data: {
                authUrl,
                state
            }
        });

    } catch (error) {
        console.error('Provider-ID register error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการลงทะเบียนด้วย Provider-ID'
        });
    }
});

/**
 * GET /api/provider-auth/callback
 * Handle OAuth callback from MOPH Provider-ID
 */
router.get('/callback', async (req, res) => {
    try {
        const { code, state, error, error_description } = req.query;

        // Check for OAuth errors
        if (error) {
            console.error('OAuth error from Provider-ID:', error, error_description);
            return res.status(400).json({
                success: false,
                message: `Provider-ID OAuth Error: ${error_description || error}`
            });
        }

        if (!code || !state) {
            return res.status(400).json({
                success: false,
                message: 'ข้อมูล OAuth ไม่ถูกต้อง (ไม่มี code หรือ state)'
            });
        }

        // Validate state
        const stateData = validateState(state);
        if (!stateData) {
            return res.status(400).json({
                success: false,
                message: 'State ไม่ถูกต้องหรือหมดอายุ'
            });
        }

        console.log('Provider-ID callback - Type:', stateData.type);
        console.log('Exchanging code for token...');

        // Prepare token request data
        const tokenData = new URLSearchParams({
            grant_type: providerIdConfig.grantType,
            code: code,
            redirect_uri: providerIdConfig.redirectUri,
            client_id: providerIdConfig.clientId,
            client_secret: providerIdConfig.clientSecret
        });

        console.log('Token request to:', providerIdConfig.tokenUrl);
        console.log('Token request data:', {
            grant_type: providerIdConfig.grantType,
            redirect_uri: providerIdConfig.redirectUri,
            client_id: providerIdConfig.clientId,
            client_secret: '***hidden***',
            code: code
        });

        // Exchange code for token
        const tokenResponse = await axios.post(
            providerIdConfig.tokenUrl,
            tokenData.toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                }
            }
        );

        console.log('Token response status:', tokenResponse.status);
        console.log('Token response data:', JSON.stringify(tokenResponse.data, null, 2));

        // MOPH API returns nested structure: { status, data: { access_token, ... } }
        const responseData = tokenResponse.data.data || tokenResponse.data;
        const { access_token, token_type } = responseData;

        if (!access_token) {
            console.error('No access token in response:', tokenResponse.data);
            throw new Error('No access token received from Provider-ID');
        }

        console.log('Access token received successfully!');
        console.log('Token type:', token_type || 'Bearer');

        // MOPH Provider-ID includes user info in the JWT token itself
        // Decode the JWT to extract user information from scopes_detail
        console.log('Decoding JWT token to extract user info...');

        try {
            // 1. Decode JWT for basic info (CID, Provider ID)
            const tokenParts = access_token.split('.');
            let jwtPayload = {};
            if (tokenParts.length === 3) {
                jwtPayload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
            }
            console.log('JWT payload decoded:', JSON.stringify(jwtPayload, null, 2));

            // 2. Fetch extended profile from API (2-Step Process)
            console.log('Fetching extended profile (Step 1: Get Service Token)...');
            let apiProfile = {};

            try {
                // Step 1: Exchange Health ID Token for Service Token
                console.log('Exchanging Health ID token for Service token at:', providerIdConfig.serviceTokenUrl);
                const serviceTokenBody = {
                    client_id: providerIdConfig.providerClientId,
                    secret_key: providerIdConfig.providerSecretKey,
                    token_by: 'Health ID',
                    token: access_token
                };
                console.log('Service Token Request Body:', JSON.stringify({ ...serviceTokenBody, secret_key: '***' }, null, 2));

                const serviceTokenResponse = await axios.post(providerIdConfig.serviceTokenUrl, serviceTokenBody, {
                    headers: { 'Content-Type': 'application/json' }
                });

                if (serviceTokenResponse.data && serviceTokenResponse.data.data) {
                    // Extract access_token from the data object
                    const serviceTokenData = serviceTokenResponse.data.data;
                    const serviceToken = serviceTokenData.access_token;

                    console.log('Service Token obtained (Access Token). Fetching profile (Step 2)...');

                    // Step 2: Fetch Profile using Service Token
                    const profileResponse = await axios.get(providerIdConfig.userInfoUrl, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${serviceToken}`,
                            'client-id': providerIdConfig.providerClientId,
                            'secret-key': providerIdConfig.providerSecretKey
                        }
                    });

                    console.log('API Profile Response:', JSON.stringify(profileResponse.data, null, 2));
                    apiProfile = profileResponse.data.data || profileResponse.data;
                } else {
                    console.warn('Failed to obtain Service Token:', serviceTokenResponse.data);
                }

            } catch (apiError) {
                console.error('Failed to fetch profile from API:', apiError.message);
                if (apiError.response) {
                    console.error('API Error Response:', JSON.stringify(apiError.response.data));
                    apiProfile = {
                        error: true,
                        message: apiError.message,
                        details: apiError.response.data
                    };
                }
            }

            // 3. Merge Information
            const scopesDetail = jwtPayload.scopes_detail || {};

            // Extract organization data if available
            let position = '';
            let hospital = '';
            if (apiProfile.organization && Array.isArray(apiProfile.organization) && apiProfile.organization.length > 0) {
                const org = apiProfile.organization[0];
                position = org.position || org.affiliation || '';
                // Prefer Thai name, fallback to English
                hospital = org.hname_th || org.hname_eng || '';
            }

            const userInfo = {
                provider_id: apiProfile.provider_id || jwtPayload.sub || jwtPayload.account_id,
                cid: scopesDetail.id_card || apiProfile.id_card || apiProfile.hash_cid,
                full_name: `${apiProfile.title_th || scopesDetail.name_prefix || ''} ${apiProfile.firstname_th || scopesDetail.name || ''} ${apiProfile.lastname_th || scopesDetail.surname || ''}`.trim() || apiProfile.name_th || scopesDetail.name_en,
                email: apiProfile.email || scopesDetail.email || '',
                position: position || apiProfile.position || scopesDetail.position || '',
                hospital: hospital || apiProfile.hospital || scopesDetail.hospital || scopesDetail.organization || '',
                mobile_no: apiProfile.mobile_no || scopesDetail.mobile_no,
                birthdate: apiProfile.date_of_birth || scopesDetail.birthdate,
                nationality: apiProfile.nationality || scopesDetail.nationality,
                ial: scopesDetail.ial,
                raw_api_data: apiProfile
            };

            // Fallback for name if structured name not found
            if (!userInfo.full_name && jwtPayload.name) userInfo.full_name = jwtPayload.name;

            console.log('Final User Info:', JSON.stringify(userInfo, null, 2));

            // Handle based on type (login or register)
            if (stateData.type === 'login') {
                return await handleProviderLogin(userInfo, res);
            } else {
                return await handleProviderRegistration(userInfo, res);
            }

        } catch (decodeError) {
            console.error('Profile processing error:', decodeError);
            throw new Error(`Failed to process user info: ${decodeError.message}`);
        }

    } catch (error) {
        console.error('Provider-ID callback error:', error);

        // Enhanced error logging
        let errorDetail = '';
        if (error.response) {
            console.error('Error response status:', error.response.status);
            console.error('Error response data:', error.response.data);

            if (error.response.data && typeof error.response.data === 'object') {
                errorDetail = error.response.data.error_description || error.response.data.error || error.response.data.message || JSON.stringify(error.response.data);
            }
        }

        const errorMessage = `เกิดข้อผิดพลาด Provider-ID (${error.message}): ${errorDetail}`;
        res.redirect(`/?provider_error=${encodeURIComponent(errorMessage)}`);
    }
});

/**
 * Handle Provider-ID login
 */
async function handleProviderLogin(userInfo, res) {
    try {
        const providerId = userInfo.provider_id || userInfo.id;
        console.log(`[handleProviderLogin] Attempting login for providerId: '${providerId}'`);

        if (!providerId) {
            console.error('[handleProviderLogin] Error: providerId is missing');
            return res.redirect(`/?provider_error=${encodeURIComponent('ไม่พบข้อมูล Provider ID')}`);
        }

        // Check if user exists
        const [users] = await promisePool.query(
            `SELECT user_id, username, full_name, email, role, is_active, approval_status 
             FROM users 
             WHERE provider_id = ?`,
            [providerId]
        );

        console.log(`[handleProviderLogin] Query result count: ${users.length}`);
        if (users.length > 0) {
            console.log(`[handleProviderLogin] User found: ${users[0].username}, Status: ${users[0].approval_status}`);
        }

        if (users.length === 0) {
            // Check if there is a pending registration
            const [registrations] = await promisePool.query(
                'SELECT status FROM provider_registrations WHERE provider_id = ? AND status = \'pending\'',
                [providerId]
            );

            if (registrations.length > 0) {
                return res.redirect(`/?provider_status=pending&message=${encodeURIComponent('บัญชีของคุณรอการอนุมัติจากผู้ดูแลระบบ')}`);
            }

            return res.redirect(`/?provider_error=${encodeURIComponent('ไม่พบบัญชีผู้ใช้ กรุณาลงทะเบียนก่อนเข้าสู่ระบบ')}`);
        }

        const user = users[0];

        // Check approval status
        if (user.approval_status === 'pending') {
            return res.redirect(`/?provider_status=pending&message=${encodeURIComponent('บัญชีของคุณรอการอนุมัติจากผู้ดูแลระบบ')}`);
        }

        if (user.approval_status === 'rejected') {
            return res.redirect(`/?provider_error=${encodeURIComponent('บัญชีของคุณถูกปฏิเสธ กรุณาติดต่อผู้ดูแลระบบ')}`);
        }

        // Check if active
        if (!user.is_active) {
            return res.redirect(`/?provider_error=${encodeURIComponent('บัญชีผู้ใช้ถูกระงับ กรุณาติดต่อผู้ดูแลระบบ')}`);
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user.user_id,
                username: user.username,
                role: user.role,
                authMethod: 'provider_id'
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        // Log successful login
        await promisePool.query(
            'INSERT INTO login_logs (user_id, username, status, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
            [user.user_id, user.username, 'success', '0.0.0.0', 'Provider-ID OAuth']
        );

        // Redirect to home with token in URL (will be picked up by frontend)
        res.redirect(`/?token=${encodeURIComponent(token)}&provider_login=success`);

    } catch (error) {
        console.error('Handle provider login error:', error);
        throw error;
    }
}

/**
 * Handle Provider-ID registration
 */
async function handleProviderRegistration(userInfo, res) {
    try {
        const providerId = userInfo.provider_id || userInfo.id;
        const cid = userInfo.cid || userInfo.citizen_id;
        const fullName = userInfo.full_name || userInfo.name;
        const email = userInfo.email;
        const position = userInfo.position || userInfo.title;
        const hospital = userInfo.hospital || userInfo.organization;

        // Check if already registered
        const [existing] = await promisePool.query(
            'SELECT user_id, approval_status FROM users WHERE provider_id = ?',
            [providerId]
        );

        if (existing.length > 0) {
            const status = existing[0].approval_status;
            const message = status === 'pending'
                ? 'คุณได้ลงทะเบียนแล้ว รอการอนุมัติจากผู้ดูแลระบบ'
                : 'คุณมีบัญชีในระบบแล้ว กรุณาเข้าสู่ระบบ';
            return res.redirect(`/?provider_status=${status}&message=${encodeURIComponent(message)}`);
        }

        // Check if CID already exists
        if (cid) {
            const [cidExists] = await promisePool.query(
                'SELECT user_id FROM users WHERE cid = ?',
                [cid]
            );

            if (cidExists.length > 0) {
                return res.redirect(`/?provider_error=${encodeURIComponent('เลขบัตรประชาชนนี้มีในระบบแล้ว')}`);
            }
        }

        // Create registration record
        const [result] = await promisePool.query(
            `INSERT INTO provider_registrations 
             (provider_id, cid, full_name, email, position, hospital, oauth_data, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [providerId, cid, fullName, email, position, hospital, JSON.stringify(userInfo)]
        );

        // Redirect to login page with success message
        const params = new URLSearchParams({
            provider_status: 'pending',
            message: 'ลงทะเบียนสำเร็จ รอการอนุมัติจากผู้ดูแลระบบ',
            full_name: fullName,
            email: email || ''
        });
        res.redirect(`/?${params.toString()}`);

    } catch (error) {
        console.error('Handle provider registration error:', error);
        throw error;
    }
}

/**
 * GET /api/provider-auth/pending
 * Get pending registrations (Admin only)
 */
router.get('/pending', verifyToken, isAdmin, async (req, res) => {
    try {
        const [registrations] = await promisePool.query(
            `SELECT * FROM provider_registrations WHERE status = 'pending' ORDER BY created_at DESC`
        );

        res.json({
            success: true,
            data: registrations
        });

    } catch (error) {
        console.error('Get pending registrations error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการลงทะเบียน'
        });
    }
});

/**
 * POST /api/provider-auth/approve/:registrationId
 * Approve a registration (Admin only)
 */
router.post('/approve/:registrationId', verifyToken, isAdmin, async (req, res) => {
    console.log('[API] /approve/:registrationId called');
    const connection = await promisePool.getConnection();

    try {
        await connection.beginTransaction();

        const { registrationId } = req.params;
        const adminUserId = req.user.userId;
        console.log(`[Approve] Processing ID: ${registrationId}, By Admin: ${adminUserId}`);

        // Get registration data
        const [registrations] = await connection.query(
            'SELECT * FROM provider_registrations WHERE registration_id = ? AND status = \'pending\'',
            [registrationId]
        );

        if (registrations.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'ไม่พบข้อมูลการลงทะเบียนหรือได้รับการอนุมัติแล้ว'
            });
        }

        const registration = registrations[0];

        // Generate username from provider_id or email
        const username = `pid_${registration.provider_id.substring(0, 10)}`;
        const employeeId = registration.cid || `PID-${registration.registration_id}`;

        // Check for existing user by CID or Email to prevent duplicates
        const [existingUsers] = await connection.query(
            'SELECT user_id, provider_id FROM users WHERE email = ? OR cid = ?',
            [registration.email, registration.cid]
        );

        let userId;

        if (existingUsers.length > 0) {
            // User exists - Update existing record
            const existingUser = existingUsers[0];
            userId = existingUser.user_id;

            if (existingUser.provider_id && existingUser.provider_id !== registration.provider_id) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'บัญชีนี้ถูกผูกกับ Provider ID อื่นแล้ว'
                });
            }

            console.log(`[Approve] Merging with existing user ID: ${userId}`);

            await connection.query(
                `UPDATE users 
                 SET provider_id = ?, 
                     cid = COALESCE(cid, ?),
                     position = COALESCE(?, position), 
                     hospital = COALESCE(?, hospital),
                     full_name = COALESCE(?, full_name),
                     approval_status = 'approved',
                     auth_method = IF(auth_method = 'local', 'local', 'provider_id')
                 WHERE user_id = ?`,
                [
                    registration.provider_id,
                    registration.cid,
                    registration.position,
                    registration.hospital,
                    registration.full_name,
                    userId
                ]
            );

        } else {
            // New User - Insert
            console.log(`[Approve] Creating new user for Provider ID: ${registration.provider_id}`);
            const [userResult] = await connection.query(
                `INSERT INTO users 
                 (employee_id, username, password_hash, full_name, email, cid, position, hospital, 
                  provider_id, auth_method, role, approval_status, approved_by, approved_at, is_active) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'provider_id', 'user', 'approved', ?, NOW(), TRUE)`,
                [
                    employeeId,
                    username,
                    '', // No password for Provider-ID users
                    registration.full_name,
                    registration.email,
                    registration.cid,
                    registration.position,
                    registration.hospital,
                    registration.provider_id,
                    adminUserId
                ]
            );
            userId = userResult.insertId;
        }

        // Update registration status
        await connection.query(
            `UPDATE provider_registrations 
             SET status = 'approved', approved_by = ?, approved_at = NOW() 
             WHERE registration_id = ?`,
            [adminUserId, registrationId]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'อนุมัติการลงทะเบียนสำเร็จ',
            data: {
                userId: userId,
                username
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Approve registration error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการอนุมัติ: ' + (error.sqlMessage || error.message),
            details: error.message
        });
    } finally {
        connection.release();
    }
});

/**
 * POST /api/provider-auth/reject/:registrationId
 * Reject a registration (Admin only)
 */
router.post('/reject/:registrationId', verifyToken, isAdmin, async (req, res) => {
    try {
        const { registrationId } = req.params;
        const { reason } = req.body;
        const adminUserId = req.user.userId;

        // Update registration status
        const [result] = await promisePool.query(
            `UPDATE provider_registrations 
             SET status = 'rejected', approved_by = ?, approved_at = NOW(), rejection_reason = ? 
             WHERE registration_id = ? AND status = 'pending'`,
            [adminUserId, reason || 'ไม่ระบุเหตุผล', registrationId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบข้อมูลการลงทะเบียนหรือได้รับการประมวลผลแล้ว'
            });
        }

        res.json({
            success: true,
            message: 'ปฏิเสธการลงทะเบียนสำเร็จ'
        });

    } catch (error) {
        console.error('Reject registration error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการปฏิเสธการลงทะเบียน'
        });
    }
});

/**
 * GET /api/provider-auth/status/:registrationId
 * Check registration status
 */
router.get('/status/:registrationId', async (req, res) => {
    try {
        const { registrationId } = req.params;

        const [registrations] = await promisePool.query(
            `SELECT registration_id, full_name, email, position, hospital, status, 
                    rejection_reason, created_at, approved_at 
             FROM provider_registrations 
             WHERE registration_id = ?`,
            [registrationId]
        );

        if (registrations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบข้อมูลการลงทะเบียน'
            });
        }

        res.json({
            success: true,
            data: registrations[0]
        });

    } catch (error) {
        console.error('Get registration status error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ'
        });
    }
});

module.exports = router;
