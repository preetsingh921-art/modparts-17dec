const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;

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
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Check upload directories
    const directories = [
      'public/uploads',
      'public/uploads/logos',
      'public/uploads/favicons',
      'config'
    ];

    const dirStatus = {};
    for (const dir of directories) {
      try {
        await fs.access(dir);
        const stats = await fs.stat(dir);
        dirStatus[dir] = {
          exists: true,
          isDirectory: stats.isDirectory(),
          permissions: stats.mode.toString(8)
        };
      } catch (error) {
        dirStatus[dir] = {
          exists: false,
          error: error.message
        };
      }
    }

    // Check if multer is available
    let multerAvailable = false;
    try {
      require('multer');
      multerAvailable = true;
    } catch (error) {
      multerAvailable = false;
    }

    // Check current site config
    let siteConfig = null;
    try {
      const configData = await fs.readFile('config/site-config.json', 'utf8');
      siteConfig = JSON.parse(configData);
    } catch (error) {
      siteConfig = { error: error.message };
    }

    // Check existing logos
    let existingLogos = [];
    try {
      const logoFiles = await fs.readdir('public/uploads/logos');
      existingLogos = logoFiles.map(file => ({
        filename: file,
        url: `/uploads/logos/${file}`
      }));
    } catch (error) {
      existingLogos = { error: error.message };
    }

    // Environment info
    const envInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      cwd: process.cwd(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasJwtSecret: !!process.env.JWT_SECRET
      }
    };

    res.json({
      success: true,
      message: 'Upload debug information',
      debug: {
        adminUser: {
          id: adminUser.userId,
          email: adminUser.email,
          role: adminUser.role
        },
        directories: dirStatus,
        multerAvailable,
        siteConfig,
        existingLogos,
        environment: envInfo,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Debug upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
