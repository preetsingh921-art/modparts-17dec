const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');

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

// Ensure upload directories exist
async function ensureDirectories() {
  const dirs = [
    'public/uploads',
    'public/uploads/logos',
    'public/uploads/favicons',
    'config'
  ];
  
  for (const dir of dirs) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    }
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
    
    console.log('✅ Site config updated');
  } catch (error) {
    console.error('Error updating site config:', error);
  }
}

// Parse multipart form data manually (simple version)
function parseMultipartData(body, boundary) {
  const parts = body.split(`--${boundary}`);
  const files = {};
  
  for (const part of parts) {
    if (part.includes('Content-Disposition: form-data')) {
      const nameMatch = part.match(/name="([^"]+)"/);
      const filenameMatch = part.match(/filename="([^"]+)"/);
      
      if (nameMatch && filenameMatch) {
        const fieldName = nameMatch[1];
        const filename = filenameMatch[1];
        
        // Find the start of file data (after double CRLF)
        const dataStart = part.indexOf('\r\n\r\n') + 4;
        const dataEnd = part.lastIndexOf('\r\n');
        
        if (dataStart > 3 && dataEnd > dataStart) {
          const fileData = part.slice(dataStart, dataEnd);
          files[fieldName] = {
            filename: filename,
            data: Buffer.from(fileData, 'binary')
          };
        }
      }
    }
  }
  
  return files;
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

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    console.log('🚀 Simple upload starting...');
    
    // Verify admin access
    const adminUser = verifyAdminToken(req);
    if (!adminUser) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    console.log('✅ Admin access verified');

    // Ensure upload directories exist
    await ensureDirectories();

    // Get content type and boundary
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return res.status(400).json({
        success: false,
        message: 'Content-Type must be multipart/form-data'
      });
    }

    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      return res.status(400).json({
        success: false,
        message: 'No boundary found in Content-Type'
      });
    }

    // Read request body
    let body = '';
    req.setEncoding('binary');
    
    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', async () => {
      try {
        console.log('📦 Parsing multipart data...');
        
        // Parse multipart data
        const files = parseMultipartData(body, boundary);
        
        if (!files.logo) {
          return res.status(400).json({
            success: false,
            message: 'No logo file found in upload'
          });
        }

        const logoFile = files.logo;
        console.log('📁 Logo file:', {
          filename: logoFile.filename,
          size: logoFile.data.length
        });

        // Validate file type by extension
        const extension = path.extname(logoFile.filename).toLowerCase();
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        
        if (!allowedExtensions.includes(extension)) {
          return res.status(400).json({
            success: false,
            message: `Invalid file type: ${extension}. Allowed: ${allowedExtensions.join(', ')}`
          });
        }

        // Generate filename and path
        const timestamp = Date.now();
        const filename = `logo-${timestamp}${extension}`;
        const logoPath = `public/uploads/logos/${filename}`;
        const logoUrl = `/uploads/logos/${filename}`;

        console.log('💾 Saving to:', logoPath);

        // Save file
        await fs.writeFile(logoPath, logoFile.data);
        console.log('✅ File saved successfully');

        // Update site configuration
        await updateSiteConfig(logoUrl);

        console.log('🎉 Simple upload completed:', logoUrl);

        res.json({
          success: true,
          message: 'Logo uploaded successfully',
          logoUrl: logoUrl,
          filename: filename,
          fileSize: logoFile.data.length,
          method: 'simple-upload'
        });

      } catch (error) {
        console.error('❌ Simple upload error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to process upload',
          error: error.message
        });
      }
    });

  } catch (error) {
    console.error('❌ Simple upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
