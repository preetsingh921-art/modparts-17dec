#!/usr/bin/env node
/**
 * Babbitts Online Parts Scraper & Importer
 * =========================================
 * Parses Babbitts OEM parts list HTML and inserts parts into the Neon database.
 *
 * Usage:
 *   node scripts/import-babbitts-parts.js <html-file> [options]
 *
 * Options:
 *   --category-id <id>    Category ID to assign (default: auto-detect from <h2>)
 *   --warehouse-id <id>   Warehouse ID (default: 1)
 *   --condition <status>  Condition status (default: "New")
 *   --dry-run             Parse only, don't insert into DB
 *   --skip-existing       Skip parts whose part_number already exists
 *
 * Examples:
 *   node scripts/import-babbitts-parts.js ./carburetor.html --dry-run
 *   node scripts/import-babbitts-parts.js ./carburetor.html --category-id 7 --warehouse-id 1
 *   node scripts/import-babbitts-parts.js ./carburetor.html --skip-existing
 */

const fs = require('fs');
const path = require('path');
const db = require('../lib/db');

// ── CLI Argument Parsing ────────────────────────────────────────────────────
const args = process.argv.slice(2);

function getArg(name, defaultVal = null) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return defaultVal;
  if (idx + 1 < args.length && !args[idx + 1].startsWith('--')) return args[idx + 1];
  return true;
}

const htmlFile = args.find(a => !a.startsWith('--'));
const categoryIdOverride = getArg('category-id');
const warehouseId = getArg('warehouse-id', null);
const conditionStatus = getArg('condition', 'New');
const dryRun = args.includes('--dry-run');
const skipExisting = args.includes('--skip-existing');

if (!htmlFile) {
  console.error('❌ Usage: node scripts/import-babbitts-parts.js <html-file> [options]');
  console.error('   Run with --dry-run to preview without inserting.');
  process.exit(1);
}

// ── Known category name → ID mapping (loaded from DB at runtime) ────────────
const CATEGORY_KEYWORD_MAP = {
  'carburetor': 'Fuel System',
  'fuel': 'Fuel System',
  'petcock': 'Fuel System',
  'engine': 'Engine Parts',
  'cylinder': 'Engine Parts',
  'piston': 'Engine Parts',
  'crankcase': 'Engine Parts',
  'crankshaft': 'Engine Parts',
  'camshaft': 'Engine Parts',
  'clutch': 'Transmission',
  'transmission': 'Transmission',
  'gearbox': 'Transmission',
  'brake': 'Brakes',
  'exhaust': 'Exhaust',
  'muffler': 'Exhaust',
  'electrical': 'Electrical',
  'ignition': 'Electrical',
  'lighting': 'Electrical',
  'suspension': 'Suspension',
  'fork': 'Suspension',
  'shock': 'Suspension',
  'wheel': 'Wheels & Tires',
  'tire': 'Wheels & Tires',
  'spoke': 'Wheels & Tires',
  'fender': 'Body & Frame',
  'tank': 'Body & Frame',
  'seat': 'Body & Frame',
  'frame': 'Body & Frame',
  'bolt': 'Fasteners & Hardware',
  'nut': 'Fasteners & Hardware',
  'screw': 'Fasteners & Hardware',
  'washer': 'Fasteners & Hardware',
};

// ── HTML Parser (no external dependencies) ──────────────────────────────────
/**
 * Parse a single Babbitts partlistrow div and extract part data.
 * Returns null if the row is unparseable or should be skipped.
 */
function parsePartRow(rowHtml) {
  const part = {};

  // Extract Ref# from <div class="c0"><span>XX</span></div>
  const refMatch = rowHtml.match(/<div class="c0"[^>]*>\s*<span>(\d+)<\/span>/);
  part.ref_no = refMatch ? refMatch[1] : null;

  // Extract SKU from data-sku="..." on the form
  const skuMatch = rowHtml.match(/data-sku="([^"]+)"/);
  part.part_number = skuMatch ? skuMatch[1] : null;

  // Extract name from data-name="..." on the form
  const nameMatch = rowHtml.match(/data-name="([^"]+)"/);
  let rawName = nameMatch ? nameMatch[1] : null;

  // Clean up name: remove leading ". " or ". ." prefixes
  if (rawName) {
    rawName = rawName.replace(/^\.+\s*/, '').trim();
  }
  part.name = rawName;

  // Extract price from data-retail="..."
  const priceMatch = rowHtml.match(/data-retail="([^"]+)"/);
  part.price = priceMatch ? parseFloat(priceMatch[1]) : 0;

  // Extract superseded/new part number if present
  // Old part has class="itemnumstrike", new part has class="itemnumnew"
  const supersededMatch = rowHtml.match(/<span class="itemnumstrike">([^<]+)<\/span>/);
  const newPartMatch = rowHtml.match(/<span class="itemnumnew">([^<]+)<\/span>/);
  
  if (supersededMatch && newPartMatch) {
    part.superseded_from = supersededMatch[1];
    part.superseded_to = newPartMatch[1];
    // Use the NEW part number as the primary
    part.part_number = newPartMatch[1];
    part.description = `Supersedes ${supersededMatch[1]}`;
  }

  // If no superseded info, get part number from itemnum span
  if (!part.part_number || part.part_number.startsWith('[')) {
    const itemNumMatch = rowHtml.match(/<span class="itemnum">([^<]+)<\/span>/);
    if (itemNumMatch && !itemNumMatch[1].startsWith('[')) {
      part.part_number = itemNumMatch[1];
    }
  }

  // Extract full display name from c1a span (may have extra details like "UR", "STD 350B")
  const displayNameMatch = rowHtml.match(/<div class="c1a"[^>]*>\s*<span[^>]*>([^<]+)<\/span>/);
  if (displayNameMatch) {
    let displayName = displayNameMatch[1].replace(/^\.+\s*/, '').trim();
    // Use the longer/more detailed display name if it has more info
    if (displayName.length > (part.name || '').length) {
      part.full_name = displayName;
    }
  }

  // Skip "Unavailable In Price Book" entries
  if (part.name && part.name.toLowerCase().includes('unavailable in price book')) {
    return null;
  }

  // Skip entries with invalid/bracket part numbers
  if (part.part_number && part.part_number.startsWith('[')) {
    return null;
  }

  // Must have at minimum a name and part number
  if (!part.name || !part.part_number) {
    return null;
  }

  return part;
}

/**
 * Parse the full Babbitts HTML and extract all parts.
 */
function parseHtml(html) {
  // Detect assembly/category from the <h2> tag
  const h2Match = html.match(/<h2>([^<]+)<\/h2>/);
  const assemblyName = h2Match ? h2Match[1].trim() : 'Unknown';

  // Find all partlistrow divs
  const rowRegex = /<div id="row-\d+"[^>]*class="partlistrow[^"]*">([\s\S]*?)<\/form>\s*<\/div>/g;
  const parts = [];
  let match;

  while ((match = rowRegex.exec(html)) !== null) {
    const rowHtml = match[1];
    const part = parsePartRow(match[0]);
    if (part) {
      part.assembly = assemblyName;
      parts.push(part);
    }
  }

  return { assemblyName, parts };
}

// ── Database Operations ─────────────────────────────────────────────────────

async function getCategoryId(assemblyName) {
  // If user explicitly set a category ID, use it
  if (categoryIdOverride) return parseInt(categoryIdOverride);

  // Try to auto-detect from assembly name
  const lowerAssembly = assemblyName.toLowerCase();
  let targetCategoryName = null;

  for (const [keyword, catName] of Object.entries(CATEGORY_KEYWORD_MAP)) {
    if (lowerAssembly.includes(keyword)) {
      targetCategoryName = catName;
      break;
    }
  }

  if (targetCategoryName) {
    const result = await db.query(
      'SELECT id FROM categories WHERE name ILIKE $1 LIMIT 1',
      [targetCategoryName]
    );
    if (result.rows.length > 0) {
      console.log(`📂 Auto-detected category: "${targetCategoryName}" (ID: ${result.rows[0].id})`);
      return result.rows[0].id;
    }
  }

  // Fallback: create a new category for this assembly
  console.log(`📂 Creating new category: "${assemblyName}"`);
  const result = await db.query(
    'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING id',
    [assemblyName, `Yamaha RD350 ${assemblyName} parts`]
  );
  return result.rows[0].id;
}

async function getExistingPartNumbers() {
  const result = await db.query('SELECT part_number FROM products WHERE part_number IS NOT NULL');
  return new Set(result.rows.map(r => r.part_number.toUpperCase()));
}

async function insertPart(part, categoryId) {
  // Barcode = part_number (for scanner compatibility)
  const barcode = part.part_number;

  // Build description
  let description = `Yamaha OEM - ${part.assembly}`;
  if (part.full_name && part.full_name !== part.name) {
    description += ` | ${part.full_name}`;
  }
  if (part.superseded_from) {
    description += ` | Supersedes: ${part.superseded_from}`;
  }

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
    part.name,                              // $1  name
    description,                            // $2  description
    conditionStatus,                        // $3  condition_status
    part.price || 0,                        // $4  price
    0,                                      // $5  quantity (start at 0, add via scan)
    categoryId,                             // $6  category_id
    null,                                   // $7  image_url
    part.part_number,                       // $8  part_number
    barcode,                                // $9  barcode
    warehouseId ? parseInt(warehouseId) : null, // $10 warehouse_id
    null,                                   // $11 bin_number
    part.ref_no || null                     // $12 ref_no
  ];

  const result = await db.query(insertQuery, values);
  return result.rows[0];
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔧 Babbitts Parts Scraper & Importer');
  console.log('====================================\n');

  // Read HTML file
  const filePath = path.resolve(htmlFile);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const html = fs.readFileSync(filePath, 'utf-8');
  console.log(`📄 Reading: ${filePath}`);

  // Parse HTML
  const { assemblyName, parts } = parseHtml(html);
  console.log(`📋 Assembly: ${assemblyName}`);
  console.log(`📦 Parts found: ${parts.length}\n`);

  if (parts.length === 0) {
    console.log('⚠️  No valid parts found in the HTML.');
    process.exit(0);
  }

  // Print parsed parts table
  console.log('┌──────┬────────────────────────────────┬──────────────────┬──────────┐');
  console.log('│ Ref# │ Name                           │ Part Number      │ Price    │');
  console.log('├──────┼────────────────────────────────┼──────────────────┼──────────┤');
  for (const p of parts) {
    const ref = (p.ref_no || '-').padEnd(4);
    const name = (p.name || '').substring(0, 30).padEnd(30);
    const pn = (p.part_number || '').padEnd(16);
    const price = `$${(p.price || 0).toFixed(2)}`.padStart(8);
    console.log(`│ ${ref} │ ${name} │ ${pn} │ ${price} │`);
    if (p.superseded_from) {
      console.log(`│      │   ↳ Supersedes: ${p.superseded_from.padEnd(13)}│                  │          │`);
    }
  }
  console.log('└──────┴────────────────────────────────┴──────────────────┴──────────┘');
  console.log('');

  if (dryRun) {
    console.log('🏁 DRY RUN complete — no database changes made.');
    process.exit(0);
  }

  // Determine category
  const categoryId = await getCategoryId(assemblyName);
  console.log(`📂 Using category ID: ${categoryId}`);

  // Check for existing parts
  let existingParts = new Set();
  if (skipExisting) {
    existingParts = await getExistingPartNumbers();
    console.log(`📊 Existing products in DB: ${existingParts.size}`);
  }

  // Insert parts
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const part of parts) {
    // Skip if already exists
    if (skipExisting && existingParts.has(part.part_number.toUpperCase())) {
      console.log(`⏭️  Skipping (exists): ${part.part_number} - ${part.name}`);
      skipped++;
      continue;
    }

    try {
      const result = await insertPart(part, categoryId);
      console.log(`✅ Inserted: [${result.id}] ${result.part_number} - ${result.name} (Ref#${result.ref_no || '-'})`);
      inserted++;
    } catch (err) {
      // Handle duplicate barcode+warehouse constraint
      if (err.code === '23505') {
        console.log(`⏭️  Duplicate: ${part.part_number} - ${part.name}`);
        skipped++;
      } else {
        console.error(`❌ Error inserting ${part.part_number}: ${err.message}`);
        errors++;
      }
    }
  }

  console.log('\n====================================');
  console.log(`📊 Import Summary:`);
  console.log(`   ✅ Inserted: ${inserted}`);
  console.log(`   ⏭️  Skipped:  ${skipped}`);
  console.log(`   ❌ Errors:   ${errors}`);
  console.log(`   📦 Total:    ${parts.length}`);

  // Close the pool
  await db.pool.end();
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
