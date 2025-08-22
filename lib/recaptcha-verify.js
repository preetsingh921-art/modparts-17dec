const https = require('https');
const querystring = require('querystring');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

/**
 * Verify reCAPTCHA token with Google's API
 * @param {string} token - The reCAPTCHA token from the frontend
 * @param {string} remoteip - The user's IP address (optional)
 * @returns {Promise<Object>} - Verification result
 */
const verifyRecaptcha = (token, remoteip = null) => {
  return new Promise((resolve, reject) => {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    
    // Skip verification in development if no secret key
    if (!secretKey || secretKey === 'your-recaptcha-secret-key') {
      console.log('⚠️ reCAPTCHA verification skipped - no secret key configured');
      return resolve({
        success: true,
        score: 0.9,
        action: 'development',
        hostname: 'localhost',
        challenge_ts: new Date().toISOString(),
        'error-codes': []
      });
    }

    if (!token) {
      return resolve({
        success: false,
        'error-codes': ['missing-input-response']
      });
    }

    const postData = querystring.stringify({
      secret: secretKey,
      response: token,
      ...(remoteip && { remoteip })
    });

    const options = {
      hostname: 'www.google.com',
      port: 443,
      path: '/recaptcha/api/siteverify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('🔐 reCAPTCHA verification result:', {
            success: result.success,
            score: result.score,
            action: result.action,
            hostname: result.hostname,
            errors: result['error-codes']
          });
          resolve(result);
        } catch (error) {
          console.error('❌ Error parsing reCAPTCHA response:', error);
          reject(new Error('Failed to parse reCAPTCHA response'));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ reCAPTCHA verification request error:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
};

/**
 * Middleware to verify reCAPTCHA token
 * @param {Object} options - Configuration options
 * @param {number} options.minScore - Minimum score for reCAPTCHA v3 (0.0 to 1.0)
 * @param {string[]} options.allowedActions - Allowed actions for reCAPTCHA v3
 * @param {boolean} options.required - Whether reCAPTCHA is required
 * @returns {Function} - Express middleware function
 */
const recaptchaMiddleware = (options = {}) => {
  const {
    minScore = 0.5,
    allowedActions = [],
    required = true
  } = options;

  return async (req, res, next) => {
    const token = req.body.recaptchaToken || req.headers['x-recaptcha-token'];
    const userIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];

    console.log('🔐 reCAPTCHA middleware - verifying token');

    // Skip if not required and no token provided
    if (!required && !token) {
      console.log('⚠️ reCAPTCHA not required and no token provided - skipping');
      return next();
    }

    // Fail if required but no token provided
    if (required && !token) {
      console.log('❌ reCAPTCHA required but no token provided');
      return res.status(400).json({
        success: false,
        message: 'reCAPTCHA verification required',
        code: 'RECAPTCHA_REQUIRED'
      });
    }

    try {
      const result = await verifyRecaptcha(token, userIP);

      if (!result.success) {
        console.log('❌ reCAPTCHA verification failed:', result['error-codes']);
        return res.status(400).json({
          success: false,
          message: 'reCAPTCHA verification failed',
          code: 'RECAPTCHA_FAILED',
          errors: result['error-codes']
        });
      }

      // Check score for reCAPTCHA v3
      if (result.score !== undefined && result.score < minScore) {
        console.log(`❌ reCAPTCHA score too low: ${result.score} < ${minScore}`);
        return res.status(400).json({
          success: false,
          message: 'reCAPTCHA verification failed - suspicious activity detected',
          code: 'RECAPTCHA_LOW_SCORE',
          score: result.score
        });
      }

      // Check allowed actions for reCAPTCHA v3
      if (allowedActions.length > 0 && result.action && !allowedActions.includes(result.action)) {
        console.log(`❌ reCAPTCHA action not allowed: ${result.action}`);
        return res.status(400).json({
          success: false,
          message: 'reCAPTCHA verification failed - invalid action',
          code: 'RECAPTCHA_INVALID_ACTION',
          action: result.action
        });
      }

      console.log('✅ reCAPTCHA verification successful');
      
      // Add verification result to request object
      req.recaptcha = result;
      next();

    } catch (error) {
      console.error('❌ reCAPTCHA verification error:', error);
      return res.status(500).json({
        success: false,
        message: 'reCAPTCHA verification service unavailable',
        code: 'RECAPTCHA_SERVICE_ERROR'
      });
    }
  };
};

/**
 * Simple function to verify reCAPTCHA token (for use in API handlers)
 * @param {string} token - The reCAPTCHA token
 * @param {Object} options - Verification options
 * @returns {Promise<boolean>} - Whether verification passed
 */
const isRecaptchaValid = async (token, options = {}) => {
  const { minScore = 0.5, allowedActions = [] } = options;

  try {
    const result = await verifyRecaptcha(token);

    if (!result.success) {
      return false;
    }

    if (result.score !== undefined && result.score < minScore) {
      return false;
    }

    if (allowedActions.length > 0 && result.action && !allowedActions.includes(result.action)) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ reCAPTCHA validation error:', error);
    return false;
  }
};

module.exports = {
  verifyRecaptcha,
  recaptchaMiddleware,
  isRecaptchaValid
};
