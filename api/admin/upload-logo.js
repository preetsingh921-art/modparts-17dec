const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
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

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, GIF, WebP, and SVG files are allowed.'));
    }
  }
});

// Ensure upload directories exist
async function ensureDirectories() {
  const dirs = [
    'public/uploads',
    'public/uploads/logos',
    'public/uploads/favicons'
  ];
  
  for (const dir of dirs) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }
}

// Generate basic favicon from logo (simplified version)
async function generateFavicon(logoBuffer, logoExtension) {
  try {
    if (logoExtension === '.svg') {
      // For SVG, just copy as is for favicon
      await fs.writeFile('public/favicon.svg', logoBuffer);
      return;
    }

    // For now, just copy the original as favicon.ico
    // In production, you'd want to use Sharp or similar for resizing
    await fs.writeFile('public/favicon.ico', logoBuffer);

    console.log('✅ Basic favicon generated');

  } catch (error) {
    console.error('Error generating favicon:', error);
    // Don't fail the entire upload if favicon generation fails
  }
}

// Update site configuration
async function updateSiteConfig(logoUrl) {
  try {
    const configPath = 'config/site-config.json';
    let config = {};
    
    try {
      const configData = await fs.readFile(configPath, 'utf8');
      config = JSON.parse(configData);
    } catch {
      // File doesn't exist, create new config
    }
    
    config.logo = logoUrl;
    config.lastUpdated = new Date().toISOString();
    
    // Ensure config directory exists
    await fs.mkdir('config', { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
  } catch (error) {
    console.error('Error updating site config:', error);
  }
}

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verify admin access
  const adminUser = verifyAdminToken(req);
  if (!adminUser) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // Ensure upload directories exist
    await ensureDirectories();

    // Handle file upload
    upload.single('logo')(req, res, async (err) => {
      if (err) {
        console.error('Upload error:', err);
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload failed'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      try {
        const file = req.file;
        const timestamp = Date.now();
        const extension = path.extname(file.originalname).toLowerCase();
        const filename = `logo-${timestamp}${extension}`;
        const logoPath = `public/uploads/logos/${filename}`;
        const logoUrl = `/uploads/logos/${filename}`;

        // Save the original logo
        await fs.writeFile(logoPath, file.buffer);

        // Generate favicon and other sizes
        await generateFavicon(file.buffer, extension);

        // Update site configuration
        await updateSiteConfig(logoUrl);

        console.log('✅ Logo uploaded successfully:', logoUrl);

        res.json({
          success: true,
          message: 'Logo uploaded successfully',
          logoUrl: logoUrl,
          filename: filename
        });

      } catch (error) {
        console.error('Error processing logo upload:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to process logo upload'
        });
      }
    });

  } catch (error) {
    console.error('Logo upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
