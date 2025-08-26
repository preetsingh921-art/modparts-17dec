const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');

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

// Update site configuration to remove logo
async function updateSiteConfig() {
  try {
    const configPath = 'config/site-config.json';
    let config = {};
    
    try {
      const configData = await fs.readFile(configPath, 'utf8');
      config = JSON.parse(configData);
    } catch {
      // File doesn't exist, create new config
    }
    
    config.logo = null;
    config.lastUpdated = new Date().toISOString();
    
    // Ensure config directory exists
    await fs.mkdir('config', { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
  } catch (error) {
    console.error('Error updating site config:', error);
  }
}

// Remove favicon files
async function removeFaviconFiles() {
  try {
    const filesToRemove = [
      'public/favicon.ico',
      'public/favicon.svg',
      'public/apple-touch-icon.png'
    ];

    const faviconSizes = [16, 32, 48, 64, 128, 256];
    faviconSizes.forEach(size => {
      filesToRemove.push(`public/uploads/favicons/favicon-${size}x${size}.png`);
    });

    for (const file of filesToRemove) {
      try {
        await fs.unlink(file);
      } catch {
        // File doesn't exist, ignore
      }
    }
  } catch (error) {
    console.error('Error removing favicon files:', error);
  }
}

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
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

  if (req.method !== 'DELETE') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // Get current logo from config
    let currentLogo = null;
    try {
      const configData = await fs.readFile('config/site-config.json', 'utf8');
      const config = JSON.parse(configData);
      currentLogo = config.logo;
    } catch {
      // No config file or logo
    }

    // Remove current logo file if it exists
    if (currentLogo) {
      try {
        const logoPath = `public${currentLogo}`;
        await fs.unlink(logoPath);
        console.log('✅ Logo file removed:', logoPath);
      } catch (error) {
        console.log('Logo file not found or already removed:', error.message);
      }
    }

    // Remove favicon files
    await removeFaviconFiles();

    // Update site configuration
    await updateSiteConfig();

    console.log('✅ Logo removed successfully');

    res.json({
      success: true,
      message: 'Logo removed successfully'
    });

  } catch (error) {
    console.error('Logo removal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove logo'
    });
  }
};
