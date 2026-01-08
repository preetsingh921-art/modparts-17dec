const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} buffer - File buffer
 * @param {string} folder - Folder name in Cloudinary (e.g., 'products', 'logos')
 * @param {string} publicId - Optional custom public ID for the file
 * @returns {Promise<{url: string, publicId: string, width: number, height: number}>}
 */
async function uploadImage(buffer, folder = 'products', publicId = null) {
    return new Promise((resolve, reject) => {
        const uploadOptions = {
            folder: `modparts/${folder}`,
            resource_type: 'image',
            transformation: [
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
            ]
        };

        if (publicId) {
            uploadOptions.public_id = publicId;
        }

        // Upload via stream
        const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (error) {
                    console.error('❌ Cloudinary upload error:', error);
                    reject(error);
                } else {
                    console.log('✅ Cloudinary upload successful:', result.public_id);
                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                        width: result.width,
                        height: result.height,
                        format: result.format,
                        bytes: result.bytes
                    });
                }
            }
        );

        // Write buffer to stream
        uploadStream.end(buffer);
    });
}

/**
 * Delete an image from Cloudinary
 * @param {string} publicId - The public ID of the image to delete
 * @returns {Promise<boolean>}
 */
async function deleteImage(publicId) {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        console.log('✅ Cloudinary delete result:', result);
        return result.result === 'ok';
    } catch (error) {
        console.error('❌ Cloudinary delete error:', error);
        throw error;
    }
}

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string|null}
 */
function extractPublicIdFromUrl(url) {
    if (!url || !url.includes('cloudinary')) {
        return null;
    }

    try {
        // URL format: https://res.cloudinary.com/{cloud}/image/upload/{transformations}/{public_id}.{ext}
        const regex = /\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/;
        const match = url.match(regex);
        return match ? match[1] : null;
    } catch (error) {
        console.error('Error extracting public ID:', error);
        return null;
    }
}

module.exports = {
    cloudinary,
    uploadImage,
    deleteImage,
    extractPublicIdFromUrl
};
