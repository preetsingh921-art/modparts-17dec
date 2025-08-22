/**
 * Cloudflare Turnstile verification utility
 * Verifies Turnstile tokens with Cloudflare's API
 */

const https = require('https');

/**
 * Verify a Turnstile token with Cloudflare
 * @param {string} token - The Turnstile token to verify
 * @param {Object} options - Verification options
 * @param {string} options.remoteip - The user's IP address (optional)
 * @param {number} options.timeout - Request timeout in milliseconds (default: 5000)
 * @returns {Promise<boolean>} - True if verification successful, false otherwise
 */
async function isTurnstileValid(token, options = {}) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  
  // Skip verification in development if no secret key
  if (!secretKey || secretKey === 'your-turnstile-secret-key') {
    console.log('⚠️ Turnstile verification skipped - no secret key configured');
    return true; // Allow in development
  }

  // Validate token format
  if (!token || typeof token !== 'string' || token.length < 10) {
    console.log('❌ Invalid Turnstile token format');
    return false;
  }

  try {
    console.log('🔐 Verifying Turnstile token with Cloudflare...');
    
    const postData = new URLSearchParams({
      secret: secretKey,
      response: token,
      ...(options.remoteip && { remoteip: options.remoteip })
    }).toString();

    const result = await makeRequest(postData, options.timeout || 5000);
    
    if (result.success) {
      console.log('✅ Turnstile verification successful');
      console.log('📊 Challenge timestamp:', result.challenge_ts);
      console.log('🌐 Hostname:', result.hostname);
      
      // Additional checks can be added here
      // e.g., hostname validation, timestamp checks
      
      return true;
    } else {
      console.log('❌ Turnstile verification failed');
      console.log('🔍 Error codes:', result['error-codes']);
      return false;
    }
    
  } catch (error) {
    console.error('💥 Turnstile verification error:', error.message);
    
    // In production, you might want to fail closed (return false)
    // In development, you might want to fail open (return true)
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      console.log('🔒 Production mode: failing closed due to verification error');
      return false;
    } else {
      console.log('🔓 Development mode: allowing due to verification error');
      return true;
    }
  }
}

/**
 * Make HTTPS request to Cloudflare Turnstile API
 * @param {string} postData - URL-encoded form data
 * @param {number} timeout - Request timeout in milliseconds
 * @returns {Promise<Object>} - Parsed JSON response
 */
function makeRequest(postData, timeout) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'challenges.cloudflare.com',
      port: 443,
      path: '/turnstile/v0/siteverify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'ModParts-Turnstile-Verifier/1.0'
      },
      timeout: timeout
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (parseError) {
          reject(new Error(`Failed to parse Turnstile response: ${parseError.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Turnstile request failed: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Turnstile request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Validate Turnstile configuration
 * @returns {Object} - Configuration status
 */
function validateTurnstileConfig() {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  const siteKey = process.env.REACT_APP_TURNSTILE_SITE_KEY;
  
  return {
    secretKeyConfigured: !!(secretKey && secretKey !== 'your-turnstile-secret-key'),
    siteKeyConfigured: !!(siteKey && siteKey !== 'your-turnstile-site-key'),
    isProduction: process.env.NODE_ENV === 'production'
  };
}

/**
 * Get user's real IP address from request
 * Handles various proxy headers
 * @param {Object} req - Express request object
 * @returns {string} - User's IP address
 */
function getUserIP(req) {
  return req.headers['cf-connecting-ip'] ||  // Cloudflare
         req.headers['x-forwarded-for']?.split(',')[0] ||  // Standard proxy
         req.headers['x-real-ip'] ||  // Nginx
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
}

module.exports = {
  isTurnstileValid,
  validateTurnstileConfig,
  getUserIP
};
