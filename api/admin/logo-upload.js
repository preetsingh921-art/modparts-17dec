const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { uploadImage } = require('../../lib/cloudinary');

// Helper function to verify JWT token and check admin role
function verifyAdminToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');

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
      const configData = await fs.promises.readFile(configPath, 'utf8');
      config = JSON.parse(configData);
    } catch {
      // File doesn't exist, create new config
    }

    config.logo = logoUrl;
    config.lastUpdated = new Date().toISOString();

    // Ensure config directory exists
    await fs.promises.mkdir('config', { recursive: true });
    await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));

    console.log('✅ Site config updated with logo:', logoUrl);
  } catch (error) {
    console.error('Error updating site config:', error);
  }
}

module.exports = async (req, res) => {
  // CORS is handled by dev-server middleware

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed. Only POST requests are supported.'
    });
  }

  try {
    // Verify admin authentication
    const adminUser = verifyAdminToken(req);
    if (!adminUser) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    console.log('Processing logo upload for admin:', adminUser.email);
    console.log('Content-Type:', req.headers['content-type']);

    // Handle JSON-based upload (base64 encoded) - same as product upload
    if (req.headers['content-type']?.includes('application/json')) {
      const { filename, mimetype, data } = req.body;

      console.log('📤 Processing logo upload:', {
        filename,
        mimetype,
        dataLength: data?.length || 0,
        admin: adminUser.email || adminUser.id
      });

      if (!filename || !mimetype || !data) {
        console.error('❌ Missing required fields for logo upload');
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: filename, mimetype, data (base64)'
        });
      }

      // Validate file type (allow SVG for logos)
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(mimetype)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file type. Only JPEG, PNG, GIF, WebP, and SVG images are allowed for logos.'
        });
      }

      // Decode base64 data
      const buffer = Buffer.from(data, 'base64');

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (buffer.length > maxSize) {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 5MB.'
        });
      }

      // Upload to Cloudinary
      try {
        const uploadResult = await uploadImage(buffer, 'logos');

        console.log('✅ Logo uploaded to Cloudinary:', uploadResult);

        // Update site configuration with the new logo URL
        await updateSiteConfig(uploadResult.url);

        return res.status(200).json({
          success: true,
          message: 'Logo uploaded successfully to Cloudinary',
          logoUrl: uploadResult.url,
          file_url: uploadResult.url, // For compatibility
          data: {
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            width: uploadResult.width,
            height: uploadResult.height,
            format: uploadResult.format,
            bytes: uploadResult.bytes,
            filename: filename
          }
        });

      } catch (uploadError) {
        console.error('❌ Error uploading logo to Cloudinary:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload logo to Cloudinary',
          error: uploadError.message
        });
      }
    }

    // For multipart/form-data, return a helpful message
    return res.status(400).json({
      success: false,
      message: 'Multipart form upload not supported. Please use JSON with base64 encoded data.',
      example: {
        filename: 'logo.png',
        mimetype: 'image/png',
        data: 'base64_encoded_image_data_here'
      }
    });

  } catch (error) {
    console.error('Logo upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during logo upload',
      error: error.message
    });
  }
};
