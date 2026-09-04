#!/usr/bin/env node
/**
 * Category Backdrop Downloader & Populator (Robust Multi-candidate retry)
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const TARGET_DIRS = [
  path.join(__dirname, '../public/images/categories'),
  path.join(__dirname, '../frontend/public/images/categories')
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const CATEGORIES_TO_POPULATE = [
  {
    name: 'Fasteners & Hardware',
    filenames: ['fasteners-hardware.jpg', 'fasteners-&-hardware.jpg'],
    query: 'vintage motorcycle bolts screws nuts hardware assortment kit'
  },
  {
    name: 'Turnsignal',
    filenames: ['turnsignal.jpg'],
    query: 'Yamaha RD350 turn signal flasher indicator light'
  },
  {
    name: 'Taillight',
    filenames: ['taillight.jpg'],
    query: 'Yamaha RD350 rear tail light assembly lens vintage'
  }
];

async function searchWebImages(query) {
  try {
    const tokenUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
    const tokenRes = await axios.get(tokenUrl, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 8000
    });

    const vqdMatch = tokenRes.data.match(/vqd="?([^"&]+)"?/);
    if (!vqdMatch) return [];

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
    return results
      .filter(item => item.image && (item.image.startsWith('http://') || item.image.startsWith('https://')))
      .map(item => item.image);
  } catch (err) {
    console.error(`Search error for "${query}":`, err.message);
    return [];
  }
}

async function downloadAndSaveImage(imageUrl, filenames) {
  const response = await axios.get(imageUrl, {
    responseType: 'arraybuffer',
    headers: { 'User-Agent': USER_AGENT },
    timeout: 10000,
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
  console.log('🚀 Downloading remaining category backdrops...');

  for (const cat of CATEGORIES_TO_POPULATE) {
    console.log(`Searching for "${cat.name}"...`);
    const candidates = await searchWebImages(cat.query);
    let success = false;

    for (let i = 0; i < Math.min(candidates.length, 6); i++) {
      const url = candidates[i];
      try {
        await downloadAndSaveImage(url, cat.filenames);
        console.log(`✅ Saved ${cat.filenames.join(', ')} from candidate #${i + 1}`);
        success = true;
        break;
      } catch (err) {
        console.log(`  Candidate #${i + 1} failed: ${err.message}, trying next...`);
      }
      await sleep(500);
    }

    if (!success) {
      console.error(`❌ Could not download image for ${cat.name}`);
    }
    await sleep(1000);
  }

  process.exit(0);
}

main();
