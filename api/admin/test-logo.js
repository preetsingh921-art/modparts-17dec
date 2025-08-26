const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// JWT secret for token verification
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper function to verify JWT token and check admin role
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

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify admin access
    const adminUser = verifyAdminToken(req);
    if (!adminUser) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.',
        debug: {
          hasAuth: !!req.headers.authorization,
          authHeader: req.headers.authorization ? 'Bearer ***' : 'none'
        }
      });
    }

    // Test response
    res.json({
      success: true,
      message: 'Admin access verified! Logo upload system is ready.',
      user: {
        id: adminUser.userId,
        email: adminUser.email,
        role: adminUser.role
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Test logo API error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
