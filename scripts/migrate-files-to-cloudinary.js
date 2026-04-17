require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // Fallback

const fs = require('fs');
const path = require('path');
const { query } = require('../lib/db');
const { cloudinary } = require('../lib/cloudinary');

async function migrateImagesToCloudinary() {
    console.log('🚀 Starting image migration to Cloudinary...');

    try {
        // Fetch products with non-cloudinary images
        const { rows: products } = await query(`
            SELECT id, image_url 
            FROM products 
            WHERE image_url IS NOT NULL 
              AND image_url != ''
              AND image_url NOT LIKE '%cloudinary.com%'
        `);

        console.log(`📦 Found ${products.length} products to migrate.`);

        let successCount = 0;
        let failCount = 0;

        for (const product of products) {
            console.log(`\nProcessing Product ID: ${product.id}`);
            console.log(`Original URL: ${product.image_url}`);

            try {
                let uploadResult;

                // Case 1: Local file (e.g., /uploads/products/image.jpg)
                if (product.image_url.startsWith('/uploads/') || product.image_url.startsWith('uploads/')) {
                    const localPath = path.join(__dirname, '..', 'public', product.image_url.startsWith('/') ? product.image_url.slice(1) : product.image_url);
                    
                    if (fs.existsSync(localPath)) {
                        console.log(`Uploading local file: ${localPath}`);
                        uploadResult = await cloudinary.uploader.upload(localPath, {
                            folder: 'modparts/products'
                        });
                    } else {
                        console.error(`❌ Local file not found: ${localPath}`);
                        failCount++;
                        continue;
                    }
                } 
                // Case 2: External HTTP URL (e.g., Supabase)
                else if (product.image_url.startsWith('http')) {
                    console.log(`Uploading from URL: ${product.image_url}`);
                    uploadResult = await cloudinary.uploader.upload(product.image_url, {
                        folder: 'modparts/products'
                    });
                } else {
                    console.error(`❌ Unsupported URL format: ${product.image_url}`);
                    failCount++;
                    continue;
                }

                if (uploadResult && uploadResult.secure_url) {
                    console.log(`✅ Uploaded to Cloudinary: ${uploadResult.secure_url}`);
                    
                    // Update database
                    await query(
                        'UPDATE products SET image_url = $1 WHERE id = $2',
                        [uploadResult.secure_url, product.id]
                    );
                    
                    console.log(`✅ Database updated for Product ID: ${product.id}`);
                    successCount++;
                }

            } catch (err) {
                console.error(`❌ Error migrating product ${product.id}:`, err.message || err);
                failCount++;
            }
        }

        console.log('\n=======================================');
        console.log('🎉 Migration Summary:');
        console.log(`Total processed: ${products.length}`);
        console.log(`Success: ${successCount}`);
        console.log(`Failed: ${failCount}`);
        console.log('=======================================');

    } catch (err) {
        console.error('❌ Fatal error during migration:', err);
    } finally {
        process.exit();
    }
}

migrateImagesToCloudinary();
