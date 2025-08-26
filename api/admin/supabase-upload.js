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

// Convert base64 to buffer
function base64ToBuffer(base64String) {
  // Remove data URL prefix if present
  const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
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
    console.log('🚀 Supabase upload starting...');
    
    // Verify admin access
    const adminUser = verifyAdminToken(req);
    if (!adminUser) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    console.log('✅ Admin access verified');

    // Parse JSON body (expecting base64 image data)
    let body = '';
    
    if (req.body) {
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    } else {
      // Read body from stream
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      body = Buffer.concat(chunks).toString();
    }

    console.log('📦 Body received, length:', body.length);

    let requestData;
    try {
      requestData = JSON.parse(body);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid JSON in request body'
      });
    }

    if (!requestData.image || !requestData.filename) {
      return res.status(400).json({
        success: false,
        message: 'Missing image data or filename'
      });
    }

    console.log('📁 Processing image:', requestData.filename);

    // Convert base64 to buffer
    const imageBuffer = base64ToBuffer(requestData.image);
    console.log('📊 Image buffer size:', imageBuffer.length);

    // Validate file size (5MB limit)
    if (imageBuffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    }

    // Generate filename
    const timestamp = Date.now();
    const extension = requestData.filename.split('.').pop().toLowerCase();
    const filename = `logo-${timestamp}.${extension}`;

    console.log('💾 Uploading to Supabase Storage...');

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('logos')
      .upload(filename, imageBuffer, {
        contentType: `image/${extension}`,
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Supabase upload error:', uploadError);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload to storage',
        error: uploadError.message
      });
    }

    console.log('✅ Uploaded to Supabase:', uploadData.path);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('logos')
      .getPublicUrl(filename);

    const logoUrl = urlData.publicUrl;
    console.log('🌐 Public URL:', logoUrl);

    // Update site configuration
    await updateSiteConfig(logoUrl);

    console.log('🎉 Supabase upload completed:', logoUrl);

    res.json({
      success: true,
      message: 'Logo uploaded successfully via Supabase',
      logoUrl: logoUrl,
      filename: filename,
      fileSize: imageBuffer.length,
      method: 'supabase-upload'
    });

  } catch (error) {
    console.error('❌ Supabase upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
