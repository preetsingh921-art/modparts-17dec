const jwt = require('jsonwebtoken');
const { uploadImage } = require('../../lib/cloudinary');

// Helper function to verify JWT token
function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
  } catch (error) {
    return null;
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
    // Verify authentication
    const user = verifyToken(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    console.log('Processing file upload for user:', user.email);
    console.log('Content-Type:', req.headers['content-type']);

    // Handle JSON-based upload (base64 encoded)
    if (req.headers['content-type']?.includes('application/json')) {
      const { filename, mimetype, data, folder } = req.body;

      console.log('📤 Processing image upload:', {
        filename,
        mimetype,
        dataLength: data?.length || 0,
        user: user.email || user.id
      });

      if (!filename || !mimetype || !data) {
        console.error('❌ Missing required fields for upload');
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: filename, mimetype, data (base64)'
        });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(mimetype)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'
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
        const uploadFolder = folder || 'products';
        const uploadResult = await uploadImage(buffer, uploadFolder);

        console.log('✅ File uploaded to Cloudinary:', uploadResult);

        return res.status(200).json({
          success: true,
          message: 'File uploaded successfully to Cloudinary',
          file_url: uploadResult.url,
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
        console.error('❌ Error uploading to Cloudinary:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload file to Cloudinary',
          error: uploadError.message
        });
      }
    }

    // For multipart/form-data, return a helpful message for now
    return res.status(400).json({
      success: false,
      message: 'Multipart form upload not yet implemented. Please use JSON with base64 encoded data.',
      example: {
        filename: 'image.png',
        mimetype: 'image/png',
        data: 'base64_encoded_image_data_here',
        folder: 'products'
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during file upload',
      error: error.message
    });
  }
};
