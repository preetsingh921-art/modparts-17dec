// Shared authentication utilities
const jwt = require('jsonwebtoken');

// JWT secret for token verification
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Verify JWT token and check admin role
 * @param {Object} req - Express request object
 * @returns {Object|null} - Decoded token if valid admin, null otherwise
 */
function verifyAdminToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Check if user has admin role
        if (decoded.role !== 'admin') {
            return null;
        }

        return decoded;
    } catch (error) {
        console.error('Token verification failed:', error);
        return null;
    }
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
    verifyToken,
    JWT_SECRET
};
