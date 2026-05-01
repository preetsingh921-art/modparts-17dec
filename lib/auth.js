// Shared authentication utilities
const jwt = require('jsonwebtoken');

// JWT secret for token verification
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Verify JWT token and check admin or superadmin role
 * @param {Object} req - Express request object
 * @returns {Object|null} - Decoded token if valid admin/superadmin, null otherwise
 */
function verifyAdminToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Check if user has admin or superadmin role
        if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
            return null;
        }

        return decoded;
    } catch (error) {
        console.error('Token verification failed:', error);
        return null;
    }
}

/**
 * Verify JWT token and check superadmin role specifically
 * @param {Object} req - Express request object
 * @returns {Object|null} - Decoded token if valid superadmin, null otherwise
 */
function verifySuperAdminToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.role !== 'superadmin') {
            return null;
        }

        return decoded;
    } catch (error) {
        console.error('Token verification failed:', error);
        return null;
    }
}

/**
 * Check if a decoded token belongs to a superadmin
 * @param {Object} decoded - Decoded JWT token
 * @returns {boolean}
 */
function isSuperAdmin(decoded) {
    return decoded && decoded.role === 'superadmin';
}

/**
 * Verify JWT token (any authenticated user)
 * @param {Object} req - Express request object
 * @returns {Object|null} - Decoded token if valid, null otherwise
 */
function verifyToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded;
    } catch (error) {
        console.error('Token verification failed:', error);
        return null;
    }
}

module.exports = {
    verifyAdminToken,
    verifySuperAdminToken,
    verifyToken,
    isSuperAdmin,
    JWT_SECRET
};
