const fs = require('fs');
const path = require('path');
const axios = require('axios');
const db = require('../../lib/db');
const { verifyAdminToken } = require('../../lib/auth');

/**
 * DuckDuckGo Image Search Helper
 */
async function searchWebImages(query, limit = 12) {
  try {
    const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    // Step 1: Fetch vqd search token
    const tokenUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
    const tokenRes = await axios.get(tokenUrl, {
      headers: { 'User-Agent': userAgent },
      timeout: 8000
    });

    const vqdMatch = tokenRes.data.match(/vqd="?([^"&]+)"?/);
    if (!vqdMatch) {
      console.warn('⚠️ No vqd token found for query:', query);
      return [];
    }

    const vqd = vqdMatch[1];

    // Step 2: Query image API with vqd
    const searchUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,`;
    const imageRes = await axios.get(searchUrl, {
      headers: {
        'User-Agent': userAgent,
        'Referer': 'https://duckduckgo.com/'
      },
      timeout: 10000
    });

    const rawResults = imageRes.data?.results || [];

    return rawResults.slice(0, limit).map(r => ({
      title: r.title?.replace(/<[^>]*>?/gm, '') || 'Part Image',
      image: r.image,
      thumbnail: r.thumbnail,
      width: r.width,
      height: r.height,
      source: r.source || 'Web'
    }));
  } catch (err) {
    console.error('❌ Web image search failed:', err.message);
    return [];
  }
}

/**
 * Download an image and save it into public static directories
 */
async function downloadAndSaveImage(imageUrl, identifier) {
  const cleanId = String(identifier)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .toLowerCase();
  
  const filename = `${cleanId}.jpg`;

  const publicDirs = [
    path.join(__dirname, '../../public/images/products'),
    path.join(__dirname, '../../frontend/public/images/products')
  ];

  // Ensure directories exist
  for (const dir of publicDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Download image buffer
  const response = await axios.get(imageUrl, {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
    },
    timeout: 15000,
    maxContentLength: 15 * 1024 * 1024 // 15MB limit
  });

  const buffer = Buffer.from(response.data);

  // Write to both public directories
  for (const dir of publicDirs) {
    const targetFile = path.join(dir, filename);
    fs.writeFileSync(targetFile, buffer);
  }

  console.log(`✅ Saved product image locally as: /images/products/${filename}`);
  return `/images/products/${filename}`;
}

module.exports = async function handler(req, res) {
  // Enforce admin privileges
  const adminUser = verifyAdminToken(req);
  if (!adminUser) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  try {
    // -----------------------------------------------------------------
    // GET: Search images from web
    // -----------------------------------------------------------------
    if (req.method === 'GET') {
      const { query, part_number, name, limit = 12 } = req.query;

      let searchQuery = query;
      if (!searchQuery) {
        const terms = [];
        if (part_number) terms.push(part_number);
        if (name) terms.push(name);
        searchQuery = `Yamaha RD350 ${terms.join(' ')}`.trim();
      }

      console.log(`🔍 Searching web images for: "${searchQuery}"`);
      const results = await searchWebImages(searchQuery, parseInt(limit));

      return res.status(200).json({
        success: true,
        query: searchQuery,
        count: results.length,
        results
      });

    // -----------------------------------------------------------------
    // POST: Copy/Attach one or more selected images to product
    // -----------------------------------------------------------------
    } else if (req.method === 'POST') {
      const { product_id, image_url, image_urls, part_number, copy_local = true } = req.body;

      // Normalize into an array of URLs
      let inputUrls = [];
      if (Array.isArray(image_urls) && image_urls.length > 0) {
        inputUrls = image_urls.filter(Boolean);
      } else if (image_url) {
        inputUrls = [image_url];
      }

      if (inputUrls.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one image URL is required' });
      }

      const savedImages = [];
      let anyLocalCopy = false;

      for (let i = 0; i < inputUrls.length; i++) {
        const rawUrl = inputUrls[i];
        let finalUrl = rawUrl;

        if (copy_local) {
          try {
            const baseId = part_number || (product_id ? `product_${product_id}` : `part_${Date.now()}`);
            const identifier = i === 0 ? baseId : `${baseId}_${i + 1}`;
            finalUrl = await downloadAndSaveImage(rawUrl, identifier);
            anyLocalCopy = true;
          } catch (downloadErr) {
            console.warn(`⚠️ Failed to copy image #${i + 1} locally, using direct URL: ${downloadErr.message}`);
            finalUrl = rawUrl;
          }
        }

        savedImages.push(finalUrl);
      }

      const primaryImageUrl = savedImages[0] || null;

      // If product_id is provided, update product record in DB (both image_url and images JSONB)
      let updatedProduct = null;
      if (product_id) {
        const updateQuery = `
          UPDATE products 
          SET 
            image_url = $1, 
            images = $2::jsonb,
            updated_at = NOW() 
          WHERE id = $3 
          RETURNING id, name, part_number, image_url, images
        `;
        const { rows } = await db.query(updateQuery, [primaryImageUrl, JSON.stringify(savedImages), product_id]);
        if (rows.length === 0) {
          return res.status(404).json({ success: false, message: 'Product not found' });
        }
        updatedProduct = rows[0];
      }

      return res.status(200).json({
        success: true,
        message: `${savedImages.length} image(s) assigned successfully`,
        image_url: primaryImageUrl,
        images: savedImages,
        local_copy: anyLocalCopy,
        product: updatedProduct
      });

    } else {
      return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Search image API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process image request',
      error: error.message
    });
  }
};
