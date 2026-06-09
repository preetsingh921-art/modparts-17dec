#!/usr/bin/env node
/**
 * CMSNL Parts Scraper & Importer
 * ==============================
 * Fetches remaining Yamaha RD350 OEM parts lists from CMSNL and inserts new parts into the database.
 *
 * Usage:
 *   node scripts/import-cmsnl-parts.js [options]
 *
 * Options:
 *   --dry-run             Fetch and parse only, don't insert into DB
 *   --skip-existing       Skip parts whose part_number already exists (default: true)
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const db = require('../lib/db');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const skipExisting = !args.includes('--no-skip-existing');

const MISSING_CATEGORIES = [
  { name: 'Air Cleaner', blockCode: 'A-10', slug: 'air-cleaner', categoryId: 1, stepId: '1081' },
  { name: 'Clutch', blockCode: 'B-08', slug: 'clutch', categoryId: 8, stepId: '1083' },
  { name: 'Crankcase Cover', blockCode: 'B-05', slug: 'crankcase-cover', categoryId: 1, stepId: '1085' },
  { name: 'Flywheel Magneto', blockCode: 'B-06', slug: 'flywheel-magneto', categoryId: 2, stepId: '1087' },
  { name: 'Frame-Side Cover', blockCode: 'D-01', slug: 'frame-side-cover', categoryId: 16, stepId: '1089' },
  { name: 'Front Fork', blockCode: 'D-05', slug: 'front-fork', categoryId: 4, stepId: '1091' },
  { name: 'Fuel Tank', blockCode: 'D-09', slug: 'fuel-tank', categoryId: 16, stepId: '1093' },
  { name: 'Headlight', blockCode: 'F-02', slug: 'headlight', categoryId: 2, stepId: '1095' },
  { name: 'Oil Pump', blockCode: 'A-08', slug: 'oil-pump', categoryId: 1, stepId: '1097' },
  { name: 'Rear Wheel', blockCode: 'E-02', slug: 'rear-wheel', categoryId: 17, stepId: '1099' },
  { name: 'Shift Cam-Fork', blockCode: 'B-12', slug: 'shift-cam-fork', categoryId: 8, stepId: '1101' },
  { name: 'Shift Shaft', blockCode: 'C-01', slug: 'shift-shaft', categoryId: 8, stepId: '1103' },
  { name: 'Swing Arm-Rear Shocks-Chain Case', blockCode: 'D-04', slug: 'swing-arm-rear-shocks-chain-case', categoryId: 4, stepId: '1105' },
  { name: 'Tachometer Gear', blockCode: 'B-11', slug: 'tachometer-gear', categoryId: 1, stepId: '1129' },
  { name: 'Transmission', blockCode: 'B-09', slug: 'transmission', categoryId: 8, stepId: '1131' }
];

// Helper to format part numbers to match Babbitts/Yamaha standards
function formatYamahaPartNumber(raw) {
  if (!raw) return null;
  raw = raw.trim().toUpperCase().replace(/-/g, '');
  
  if (raw.startsWith('9')) {
    // Standard part formatting (5-5-2 or 5-5-1)
    if (raw.length === 12) {
      return `${raw.substring(0, 5)}-${raw.substring(5, 10)}-${raw.substring(10, 12)}`;
    } else if (raw.length === 11) {
      return `${raw.substring(0, 5)}-${raw.substring(5, 10)}-${raw.substring(10, 11)}`;
    } else if (raw.length === 10) {
      return `${raw.substring(0, 5)}-${raw.substring(5, 10)}`;
    }
  } else {
    // Model-specific part formatting (3-5-2-2 or 3-5-2)
    if (raw.length === 12) {
      return `${raw.substring(0, 3)}-${raw.substring(3, 8)}-${raw.substring(8, 10)}-${raw.substring(10, 12)}`;
    } else if (raw.length === 10) {
      return `${raw.substring(0, 3)}-${raw.substring(3, 8)}-${raw.substring(8, 10)}`;
    }
  }
  return raw;
}

// Check database for existing part numbers (stored unhyphenated)
async function getExistingPartNumbers() {
  const result = await db.query("SELECT part_number FROM products WHERE part_number IS NOT NULL");
  return new Set(result.rows.map(r => r.part_number.replace(/-/g, '').toUpperCase()));
}

async function insertPart(part, categoryId, assemblyName) {
  const formattedPartNumber = formatYamahaPartNumber(part.part_number);
  const barcode = formattedPartNumber;
  
  const description = `Yamaha OEM - ${assemblyName}`;
  const conditionStatus = 'New';
  
  const insertQuery = `
    INSERT INTO products (
      name, description, condition_status, price, quantity,
      category_id, image_url, part_number, barcode,
      warehouse_id, bin_number, ref_no, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
    )
    RETURNING id, name, part_number, ref_no
  `;
  
  const values = [
    part.name,
    description,
    conditionStatus,
    part.price || 0,
    0, // quantity starts at 0
    categoryId,
    null, // image_url
    formattedPartNumber,
    barcode,
    null, // warehouse_id = null
    null, // bin_number
    part.ref_no || null
  ];
  
  const result = await db.query(insertQuery, values);
  return result.rows[0];
}

async function main() {
  console.log('🚀 Starting CMSNL Recursive Parts Importer');
  console.log('===========================================\n');
  
  let existingParts = new Set();
  if (skipExisting) {
    existingParts = await getExistingPartNumbers();
    console.log(`📊 Existing products count in DB: ${existingParts.size}\n`);
  }
  
  const globalSummary = [];
  
  for (const cat of MISSING_CATEGORIES) {
    console.log(`-------------------------------------------`);
    console.log(`📂 Processing: "${cat.name}" (Block: ${cat.blockCode})`);
    console.log(`-------------------------------------------`);
    
    const stepPath = `/Users/charanpreetsingh/.gemini/antigravity/brain/ea7cce19-e6c0-46ec-a840-14cba9cbc5d2/.system_generated/steps/${cat.stepId}/content.md`;
    console.log(`📖 Reading local file: ${stepPath}`);
    
    let html;
    try {
      const content = fs.readFileSync(stepPath, 'utf8');
      const htmlStart = content.indexOf('<!DOCTYPE html>');
      html = htmlStart !== -1 ? content.substring(htmlStart) : content;
    } catch (err) {
      console.error(`❌ Failed to read ${cat.name} local file: ${err.message}`);
      globalSummary.push({ name: cat.name, status: 'FAILED', reason: err.message });
      continue;
    }
    
    // Save raw HTML to scripts/test-<slug>.html
    const testFilePath = path.join(__dirname, `test-${cat.slug}.html`);
    fs.writeFileSync(testFilePath, html);
    console.log(`💾 Saved test file to: scripts/test-${cat.slug}.html`);
    
    // Extract __NEXT_DATA__
    const match = html.match(/<script id=\"__NEXT_DATA__\" type=\"application\/json\">([\s\S]*?)<\/script>/);
    if (!match) {
      console.error(`❌ Could not find __NEXT_DATA__ in page of ${cat.name}`);
      globalSummary.push({ name: cat.name, status: 'FAILED', reason: 'No NEXT_DATA' });
      continue;
    }
    
    let partsData = [];
    try {
      const data = JSON.parse(match[1]);
      const pp = data.props.pageProps;
      const listing = pp.data.getCMSPartBlockListing;
      const state = pp.__APOLLO_STATE__ || {};
      
      if (!listing || !listing.edges || listing.edges.length === 0 || !listing.edges[0].node.partReferences) {
        console.warn(`⚠️ No parts listing array in data for ${cat.name}`);
        globalSummary.push({ name: cat.name, status: 'EMPTY', count: 0 });
        continue;
      }
      
      const partRefs = listing.edges[0].node.partReferences;
      
      // Build product Map from apollo state
      const productMap = {};
      for (const [key, val] of Object.entries(state)) {
        if (val && val.__typename === 'Product' && val.sku) {
          const sku = val.sku.toUpperCase();
          const name = val.name || 'Unknown Part';
          let priceVal = 0;
          if (val.price && val.price.__ref) {
            const priceObj = state[val.price.__ref];
            if (priceObj && priceObj.value && priceObj.value.centAmount !== undefined) {
              priceVal = priceObj.value.centAmount / 100;
            }
          }
          productMap[sku] = { name, price: priceVal };
        }
      }
      
      // Map part references to unified part schema
      for (const ref of partRefs) {
        if (!ref.partCode) continue;
        const code = ref.partCode.toUpperCase();
        const pInfo = productMap[code] || { name: 'Unknown Component', price: 0 };
        
        // Skip unavailable/discontinued markers if name is unknown and code has no info
        if (pInfo.name === 'Unknown Component' && pInfo.price === 0) {
          // Check if we can find any info
          continue;
        }
        
        // Convert EUR price to USD (est exchange rate 1.10)
        const priceUsd = parseFloat((pInfo.price * 1.10).toFixed(2));
        
        partsData.push({
          ref_no: ref.reference,
          part_number: ref.partCode,
          name: pInfo.name,
          price: priceUsd
        });
      }
      
    } catch (err) {
      console.error(`❌ Failed to parse data for ${cat.name}: ${err.message}`);
      globalSummary.push({ name: cat.name, status: 'PARSING ERROR', reason: err.message });
      continue;
    }
    
    console.log(`📦 Parsed ${partsData.length} parts.`);
    
    if (partsData.length === 0) {
      globalSummary.push({ name: cat.name, status: 'NO PARTS FOUND', count: 0 });
      continue;
    }
    
    if (dryRun) {
      console.log('🏁 DRY RUN - previewing first 3 parsed parts:');
      console.log(partsData.slice(0, 3));
      globalSummary.push({ name: cat.name, status: 'DRY RUN', count: partsData.length });
      continue;
    }
    
    let inserted = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const part of partsData) {
      const cleanPN = part.part_number.toUpperCase().replace(/-/g, '');
      if (skipExisting && existingParts.has(cleanPN)) {
        skipped++;
        continue;
      }
      
      try {
        const result = await insertPart(part, cat.categoryId, cat.name);
        console.log(`✅ Inserted: [${result.id}] ${result.part_number} - ${result.name} (Ref#${result.ref_no || '-'})`);
        inserted++;
        if (skipExisting) {
          existingParts.add(cleanPN); // prevent duplicate within same run
        }
      } catch (err) {
        if (err.code === '23505') {
          skipped++;
        } else {
          console.error(`❌ Error inserting ${part.part_number}: ${err.message}`);
          errors++;
        }
      }
    }
    
    console.log(`📊 Category Summary: Inserted: ${inserted}, Skipped: ${skipped}, Errors: ${errors}`);
    globalSummary.push({
      name: cat.name,
      status: 'IMPORTED',
      inserted,
      skipped,
      errors,
      total: partsData.length
    });
  }
  
  console.log('\n==========================================');
  console.log('🏁 GLOBAL RECURSIVE IMPORT SUMMARY');
  console.log('==========================================');
  console.log('┌──────────────────────────────────┬─────────────────┬──────────┬──────────┬────────┐');
  console.log('│ Category Name                    │ Status          │ Inserted │ Skipped  │ Errors │');
  console.log('├──────────────────────────────────┼─────────────────┼──────────┼──────────┼────────┤');
  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  for (const s of globalSummary) {
    const name = s.name.padEnd(32);
    const status = s.status.padEnd(15);
    const ins = (s.inserted !== undefined ? s.inserted.toString() : '-').padStart(8);
    const skip = (s.skipped !== undefined ? s.skipped.toString() : '-').padStart(8);
    const err = (s.errors !== undefined ? s.errors.toString() : '-').padStart(6);
    console.log(`│ ${name} │ ${status} │ ${ins} │ ${skip} │ ${err} │`);
    if (s.inserted) totalInserted += s.inserted;
    if (s.skipped) totalSkipped += s.skipped;
    if (s.errors) totalErrors += s.errors;
  }
  console.log('└──────────────────────────────────┴─────────────────┴──────────┴──────────┴────────┘');
  console.log(`\n🎉 Total Inserted: ${totalInserted}`);
  console.log(`🎉 Total Skipped:  ${totalSkipped}`);
  console.log(`🎉 Total Errors:   ${totalErrors}`);
  
  // Close pool
  await db.pool.end();
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
