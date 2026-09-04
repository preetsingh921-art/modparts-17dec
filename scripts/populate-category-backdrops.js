#!/usr/bin/env node
/**
 * Category Backdrop Downloader & Populator
 * ========================================
 * Searches for authentic vintage Yamaha / motorcycle part images for categories
 * missing backdrops, downloads them, and saves them into:
 *   - public/images/categories/
 *   - frontend/public/images/categories/
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const TARGET_DIRS = [
  path.join(__dirname, '../public/images/categories'),
  path.join(__dirname, '../frontend/public/images/categories')
];

for (const dir of TARGET_DIRS) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const CATEGORIES_TO_POPULATE = [
  {
    name: 'Exhaust',
    filenames: ['exhaust.jpg'],
    query: 'Yamaha RD350 exhaust expansion chambers vintage motorcycle'
  },
  {
    name: 'Fuel System',
    filenames: ['fuel-system.jpg'],
    query: 'Yamaha RD350 carburetor fuel tank petcock motorcycle'
  },
  {
    name: 'Transmission',
    filenames: ['transmission.jpg'],
    query: 'Yamaha RD350 transmission gearbox clutch plates motorcycle'
  },
  {
    name: 'Body & Frame',
    filenames: ['body-frame.jpg', 'body-&-frame.jpg'],
    query: 'Yamaha RD350 motorcycle frame chassis vintage'
  },
  {
    name: 'Wheels & Tires',
    filenames: ['wheels-tires.jpg', 'wheels-&-tires.jpg'],
    query: 'vintage motorcycle spoked wheels tires classic'
  },
  {
    name: 'Fasteners & Hardware',
    filenames: ['fasteners-hardware.jpg', 'fasteners-&-hardware.jpg'],
    query: 'vintage motorcycle bolts nuts washers hardware kit'
  },
  {
    name: 'Steering',
    filenames: ['steering.jpg'],
    query: 'Yamaha RD350 steering triple tree handlebar fork vintage'
  },
  {
    name: 'Turnsignal',
    filenames: ['turnsignal.jpg'],
    query: 'vintage motorcycle turn signal indicator light amber Yamaha'
  },
  {
    name: 'Taillight',
    filenames: ['taillight.jpg'],
    query: 'Yamaha RD350 vintage taillight tail lamp lens red'
  },
  {
    name: 'Handlebar Cable',
    filenames: ['handlebar-cable.jpg'],
    query: 'Yamaha RD350 clutch throttle brake cables motorcycle'
  }
];

async function searchWebImage(query) {
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
    for (const item of results) {
      if (item.image && (item.image.startsWith('http://') || item.image.startsWith('https://'))) {
        return item.image;
      }
    }
    return null;
  } catch (err) {
    console.error(`Search error for "${query}":`, err.message);
    return null;
  }
}

async function downloadAndSaveImage(imageUrl, filenames) {
  const response = await axios.get(imageUrl, {
    responseType: 'arraybuffer',
    headers: { 'User-Agent': USER_AGENT },
    timeout: 15000,
    maxContentLength: 15 * 1024 * 1024
  });

  const buffer = Buffer.from(response.data);

  for (const dir of TARGET_DIRS) {
    for (const fname of filenames) {
      const filePath = path.join(dir, fname);
      fs.writeFileSync(filePath, buffer);
    }
  }
}

async function main() {
  console.log('🚀 Starting Category Backdrop Downloader & Populator');
  console.log('====================================================\n');

  let successCount = 0;

  for (let i = 0; i < CATEGORIES_TO_POPULATE.length; i++) {
    const cat = CATEGORIES_TO_POPULATE[i];
    console.log(`[${i + 1}/${CATEGORIES_TO_POPULATE.length}] Searching backdrop for category: "${cat.name}"...`);

    const imgUrl = await searchWebImage(cat.query);
    if (!imgUrl) {
      console.log(`❌ Could not find image for ${cat.name}`);
      continue;
    }

    try {
      await downloadAndSaveImage(imgUrl, cat.filenames);
      console.log(`✅ Saved: ${cat.filenames.join(', ')} (from ${imgUrl.substring(0, 50)}...)`);
      successCount++;
    } catch (dlErr) {
      console.error(`⚠️ Download failed for ${cat.name}:`, dlErr.message);
    }

    await sleep(1200);
  }

  console.log('\n====================================================');
  console.log(`🏁 Finished: ${successCount}/${CATEGORIES_TO_POPULATE.length} category backdrops populated.`);
  console.log('====================================================\n');
  process.exit(0);
}

main();
