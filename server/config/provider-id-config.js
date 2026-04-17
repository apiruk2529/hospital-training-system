require('dotenv').config();

/**
 * MOPH Provider-ID OAuth Configuration
 * กำหนดค่าสำหรับระบบ OAuth ของ Provider-ID กระทรวงสาธารณสุข
 */

const providerIdConfig = {
    // OAuth Client Credentials
    clientId: process.env.MOPH_CLIENT_ID || '',
    clientSecret: process.env.MOPH_CLIENT_SECRET || '',

    // Provider Service Credentials (for Profile API)
    providerClientId: process.env.PROVIDER_CLIENT_ID || '',
    providerSecretKey: process.env.PROVIDER_SECRET_KEY || '',

    // OAuth URLs
    oauthUrl: process.env.MOPH_ID_OAUTH_URL || 'https://moph.id.th/oauth/redirect',
    tokenUrl: process.env.PROVIDER_ID_TOKEN_URL || 'https://moph.id.th/api/v1/token',
    // URL for exchanging Health ID token for Service token
    serviceTokenUrl: 'https://provider.id.th/api/v1/services/token',
    userInfoUrl: process.env.PROVIDER_ID_USER_INFO_URL || 'https://provider.id.th/api/v1/services/profile',

    // Redirect URIs
    redirectUri: process.env.PROVIDER_ID_REDIRECT_URI || 'http://localhost:3000/api/provider-auth/callback',

    // OAuth Parameters
    responseType: 'code',
    grantType: 'authorization_code',


    // Session/State configuration
    stateExpiry: 600000, // 10 minutes in milliseconds
};

/**
 * Generate OAuth authorization URL
 * @param {string} state - CSRF protection state parameter
 * @param {string} type - 'login' or 'register'
 * @returns {string} OAuth authorization URL
 */
function getAuthorizationUrl(state, type = 'login') {
    const params = new URLSearchParams({
        client_id: providerIdConfig.clientId,
        redirect_uri: providerIdConfig.redirectUri,
        response_type: providerIdConfig.responseType,
        state: state,
        // Add type to state for callback handling
    });

    return `${providerIdConfig.oauthUrl}?${params.toString()}`;
}

/**
 * Validate configuration
 * @returns {boolean} True if configuration is valid
 */
function validateConfig() {
    const required = ['clientId', 'clientSecret', 'redirectUri'];
    const missing = required.filter(key => !providerIdConfig[key]);

    if (missing.length > 0) {
        console.error('❌ Provider-ID configuration missing:', missing.join(', '));
        console.error('Please set the following environment variables:');
        missing.forEach(key => {
            const envVar = `PROVIDER_ID_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
            console.error(`  - ${envVar}`);
        });
        return false;
    }

    return true;
}

module.exports = {
    providerIdConfig,
    getAuthorizationUrl,
    validateConfig
};
