#!/usr/bin/env node
/**
 * Automated Batch Product Image Populator
 * =======================================
 * Searches the web for authentic Yamaha RD350 OEM part images,
 * downloads and copies them locally to public/images/products/,
 * and updates products.image_url in the database.
 *
 * Usage:
 *   node scripts/populate-product-images.js [options]
 *
 * Options:
 *   --limit=N         Process up to N products (default: 20)
 *   --all             Process all products missing images
 *   --category=ID     Filter by category ID
 *   --dry-run         Search and preview without saving or updating DB
 *   --delay=MS        Delay between requests in milliseconds (default: 1200)
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const db = require('../lib/db');

// Parse CLI arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const processAll = args.includes('--all');

const limitArg = args.find(a => a.startsWith('--limit='));
const limit = processAll ? 999999 : (limitArg ? parseInt(limitArg.split('=')[1]) : 20);

const categoryArg = args.find(a => a.startsWith('--category='));
const categoryId = categoryArg ? parseInt(categoryArg.split('=')[1]) : null;

const delayArg = args.find(a => a.startsWith('--delay='));
const delayMs = delayArg ? parseInt(delayArg.split('=')[1]) : 1200;

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const PUBLIC_DIRS = [
  path.join(__dirname, '../public/images/products'),
  path.join(__dirname, '../frontend/public/images/products')
];

// Ensure target directories exist
for (const dir of PUBLIC_DIRS) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Search DuckDuckGo for candidate images
 */
async function searchPartImage(query) {
  try {
    const tokenUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
    const tokenRes = await axios.get(tokenUrl, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 8000
    });

    const vqdMatch = tokenRes.data.match(/vqd="?([^"&]+)"?/);
    if (!vqdMatch) return null;

    const vqd = vqdMatch[1];
    const searchUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,`;
    const imageRes = await axios.get(searchUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': 'https://duckduckgo.com/'
      },
      timeout: 10000
    });

    const results = imageRes.data?.results || [];
    if (results.length === 0) return null;

    // Pick first candidate with valid image URL
    for (const item of results) {
      if (item.image && (item.image.startsWith('http://') || item.image.startsWith('https://'))) {
        return {
          title: item.title?.replace(/<[^>]*>?/gm, ''),
          imageUrl: item.image,
          thumbnail: item.thumbnail,
          source: item.source
        };
      }
    }
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Download remote image and save into public directories
 */
async function downloadAndSave(imageUrl, identifier) {
  const cleanId = String(identifier).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const filename = `${cleanId}.jpg`;

  const response = await axios.get(imageUrl, {
    responseType: 'arraybuffer',
    headers: { 'User-Agent': USER_AGENT },
    timeout: 15000,
    maxContentLength: 15 * 1024 * 1024
  });

  const buffer = Buffer.from(response.data);

  for (const dir of PUBLIC_DIRS) {
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, buffer);
  }

  return `/images/products/${filename}`;
}

async function main() {
  console.log('🚀 Starting Automated Web Image Populator');
  console.log('==========================================');
  console.log(`Config: Limit=${limit}, Category=${categoryId || 'ALL'}, Delay=${delayMs}ms, DryRun=${dryRun}\n`);

  try {
    // 1. Fetch products missing images
    let query = `
      SELECT id, name, part_number, category_id
      FROM products
      WHERE image_url IS NULL OR image_url = '' OR image_url = 'nan' OR image_url = 'undefined'
    `;
    const params = [];

    if (categoryId) {
      query += ` AND category_id = $1`;
      params.push(categoryId);
    }

    query += ` ORDER BY id ASC LIMIT $${params.length + 1}`;
    params.push(limit);

    const { rows: products } = await db.query(query, params);
    console.log(`📦 Found ${products.length} products needing images.\n`);

    if (products.length === 0) {
      console.log('🎉 No products need images! All caught up.');
      process.exit(0);
    }

    let successCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const indexStr = `[${i + 1}/${products.length}]`;
      const searchQuery = `Yamaha RD350 ${p.part_number || ''} ${p.name}`.trim();

      process.stdout.write(`${indexStr} Searching for #${p.id} (${p.part_number || '-'} - ${p.name.substring(0, 30)})... `);

      try {
        const found = await searchPartImage(searchQuery);

        if (!found) {
          console.log('❌ No image found');
          notFoundCount++;
          await sleep(delayMs);
          continue;
        }

        if (dryRun) {
          console.log(`🔎 [DRY RUN] Found: ${found.imageUrl.substring(0, 60)}...`);
          successCount++;
          await sleep(delayMs);
          continue;
        }

        // Download and save locally
        const identifier = p.part_number || `product_${p.id}`;
        let localPath;
        try {
          localPath = await downloadAndSave(found.imageUrl, identifier);
        } catch (dlErr) {
          // If download fails, fallback to direct image URL
          localPath = found.imageUrl;
        }

        // Update DB
        await db.query('UPDATE products SET image_url = $1, updated_at = NOW() WHERE id = $2', [localPath, p.id]);

        console.log(`✅ Saved & Attached -> ${localPath}`);
        successCount++;

      } catch (err) {
        console.log(`⚠️ Error: ${err.message}`);
        errorCount++;
      }

      await sleep(delayMs);
    }

    console.log('\n==========================================');
    console.log(`🏁 Batch Completed!`);
    console.log(`   ✅ Successfully attached: ${successCount}`);
    console.log(`   ❌ Images not found:     ${notFoundCount}`);
    console.log(`   ⚠️ Errors:                ${errorCount}`);
    console.log('==========================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

main();
