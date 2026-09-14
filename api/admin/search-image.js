const fs = require('fs');
const path = require('path');
const https = require('https');
const axios = require('axios');
const db = require('../../lib/db');
const { verifyAdminToken } = require('../../lib/auth');

let cloudinaryLib = null;
try {
  cloudinaryLib = require('../../lib/cloudinary');
} catch (e) {
  // Cloudinary module not loaded
}

/**
 * 1. Primary Engine: Bing Image Search Scraper
 * Extracts direct high-res image URLs, thumbnails, dimensions, and source domain from Bing HTML.
 */
async function searchBingImages(query, limit = 16) {
  try {
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`;
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 10000
    });

    const html = res.data || '';
    const regex = /class="iusc"[^>]*m="([^"]+)"/g;
    let match;
    const results = [];
    const seenUrls = new Set();

    while ((match = regex.exec(html)) !== null && results.length < limit) {
      try {
        const decoded = match[1]
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&#39;/g, "'")
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>');
        const data = JSON.parse(decoded);
        const imgUrl = data.murl;
        if (!imgUrl || seenUrls.has(imgUrl)) continue;
        seenUrls.add(imgUrl);

        let source = 'Web';
        if (data.purl) {
          try {
            source = new URL(data.purl).hostname.replace(/^www\./, '');
          } catch (e) {}
        }

        results.push({
          title: (data.t || data.desc || 'Part Image').replace(/<[^>]*>?/gm, ''),
          image: imgUrl,
          thumbnail: data.turl || imgUrl,
          width: data.w || null,
          height: data.h || null,
          source: source
        });
      } catch (e) {}
    }
    return results;
  } catch (err) {
    console.warn('⚠️ Bing image search failed:', err.message);
    return [];
  }
}

/**
 * 2. Secondary Engine: Wikimedia Commons API
 * Free public domain schematics, vintage motorcycle photos, and model images.
 */
async function searchWikimediaImages(query, limit = 8) {
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=${limit}&prop=imageinfo&iiprop=url|size|extmetadata&format=json&origin=*`;
    const res = await axios.get(url, {
      headers: { 'User-Agent': 'ModParts/1.0 (admin@partsformyrd350.com)' },
      timeout: 8000
    });

    const pages = res.data?.query?.pages || {};
    return Object.values(pages).map(p => {
      const info = p.imageinfo?.[0] || {};
      return {
        title: p.title.replace(/^File:/, '').replace(/\.[^/.]+$/, ''),
        image: info.url,
        thumbnail: info.thumburl || info.url,
        width: info.width || null,
        height: info.height || null,
        source: 'Wikimedia Commons'
      };
    }).filter(item => item.image);
  } catch (err) {
    console.warn('⚠️ Wikimedia image search failed:', err.message);
    return [];
  }
}

/**
 * 3. Tertiary Engine: Internal Database Catalog Search
 * Pulls existing high-quality images already stored in Neon DB for matching parts.
 */
async function searchCatalogImages(query, limit = 6) {
  try {
    const cleanQ = query.replace(/yamaha\s*rd\s*350/gi, '').trim() || query.trim();
    if (!cleanQ || cleanQ.length < 3) return [];

    const searchQuery = `%${cleanQ}%`;
    const sql = `
      SELECT id, name, part_number, image_url, images
      FROM products
      WHERE image_url IS NOT NULL AND image_url <> ''
        AND (name ILIKE $1 OR part_number ILIKE $1)
      LIMIT $2
    `;
    const { rows } = await db.query(sql, [searchQuery, limit]);
    return rows.map(r => ({
      title: `${r.name} (${r.part_number || 'N/A'})`,
      image: r.image_url,
      thumbnail: r.image_url,
      width: null,
      height: null,
      source: 'Catalog DB'
    }));
  } catch (err) {
    console.warn('⚠️ Catalog image search failed:', err.message);
    return [];
  }
}

/**
 * Unified Search Pipeline:
 * Cascades across Bing, Wikimedia, and Catalog DB to return a rich, de-duplicated gallery.
 */
async function unifiedImageSearch(query, limit = 16) {
  const seenUrls = new Set();
  const allResults = [];

  // 1. Primary: Bing Search
  const bingResults = await searchBingImages(query, limit);
  for (const item of bingResults) {
    if (item.image && !seenUrls.has(item.image)) {
      seenUrls.add(item.image);
      allResults.push(item);
    }
  }

  // 2. If results < limit, supplement with Wikimedia & Catalog DB
  if (allResults.length < limit) {
    const needed = limit - allResults.length;
    const [wikiResults, catalogResults] = await Promise.all([
      searchWikimediaImages(query, Math.min(needed, 8)),
      searchCatalogImages(query, Math.min(needed, 6))
    ]);

    for (const item of [...catalogResults, ...wikiResults]) {
      if (item.image && !seenUrls.has(item.image)) {
        seenUrls.add(item.image);
        allResults.push(item);
      }
      if (allResults.length >= limit) break;
    }
  }

  return allResults.slice(0, limit);
}

/**
 * Download an image and save it permanently via Cloudinary CDN or local static directories
 * Safely falls back to direct image URL if disk is read-only (e.g. on Vercel without Cloudinary)
 */
async function downloadAndSaveImage(imageUrl, identifier) {
  const cleanId = String(identifier)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .toLowerCase();
  
  const filename = `${cleanId}.jpg`;

  // 1. Download image buffer
  let buffer = null;
  try {
    const agent = new https.Agent({ rejectUnauthorized: false });
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': imageUrl
      },
      httpsAgent: agent,
      timeout: 15000,
      maxContentLength: 20 * 1024 * 1024 // 20MB limit
    });
    buffer = Buffer.from(response.data);
  } catch (downloadErr) {
    console.warn(`⚠️ Failed to download image buffer from ${imageUrl}: ${downloadErr.message}`);
    // If downloading buffer fails, return the direct URL so image assignment still works!
    return imageUrl;
  }

  // 2. Upload to Cloudinary if configured (production CDN)
  const hasCloudinary = !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

  if (hasCloudinary && cloudinaryLib?.uploadImage) {
    try {
      const uploadResult = await cloudinaryLib.uploadImage(buffer, 'products', cleanId);
      if (uploadResult?.url) {
        console.log(`✅ Uploaded product image to Cloudinary: ${uploadResult.url}`);
        return uploadResult.url;
      }
    } catch (cloudErr) {
      console.warn(`⚠️ Cloudinary upload failed: ${cloudErr.message}. Falling back to disk/URL.`);
    }
  }

  // 3. Fallback: Save to local public directories (local development)
  try {
    const publicDirs = [
      path.join(__dirname, '../../public/images/products'),
      path.join(__dirname, '../../frontend/public/images/products')
    ];

    for (const dir of publicDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const targetFile = path.join(dir, filename);
      fs.writeFileSync(targetFile, buffer);
    }

    console.log(`✅ Saved product image locally as: /images/products/${filename}`);
    return `/images/products/${filename}`;
  } catch (fsErr) {
    console.warn(`⚠️ Local disk write failed (${fsErr.message}). Using direct web image URL.`);
    return imageUrl;
  }
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
      const { query, part_number, name, limit = 16 } = req.query;

      let searchQuery = query;
      if (!searchQuery) {
        const terms = [];
        if (part_number) terms.push(part_number);
        if (name) terms.push(name);
        searchQuery = `Yamaha RD350 ${terms.join(' ')}`.trim();
      }

      console.log(`🔍 Searching web images for: "${searchQuery}"`);
      const results = await unifiedImageSearch(searchQuery, parseInt(limit));

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
            if (finalUrl !== rawUrl) {
              anyLocalCopy = true;
            }
          } catch (downloadErr) {
            console.warn(`⚠️ Failed to copy image #${i + 1}, using direct URL: ${downloadErr.message}`);
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
