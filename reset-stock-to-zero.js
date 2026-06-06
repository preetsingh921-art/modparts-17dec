/**
 * Reset All Product Stock to 0
 * This sets quantity = 0 for ALL existing products in the database.
 * Stock will only increase when parts are received via scan.
 * 
 * Run: node reset-stock-to-zero.js
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const db = require('./lib/db');

async function resetStockToZero() {
    try {
        console.log('📦 Starting database stock reset and warehouse-independent migration...');

        // 1. Identify and clean up duplicates by part_number
        const dupResult = await db.query(`
            SELECT part_number, COUNT(*) as cnt 
            FROM products 
            WHERE part_number IS NOT NULL 
            GROUP BY part_number 
            HAVING COUNT(*) > 1
        `);

        if (dupResult.rows.length > 0) {
            console.log(`🔍 Found ${dupResult.rows.length} duplicate part number group(s).`);
            for (const group of dupResult.rows) {
                const pn = group.part_number;
                const { rows: instances } = await db.query(
                    'SELECT id, barcode, warehouse_id, quantity FROM products WHERE part_number = $1 ORDER BY id ASC',
                    [pn]
                );

                console.log(`   Group for Part Number: ${pn}`);
                // Select which instance to keep: prefer the one where barcode matches part_number, or the first one
                let keepIdx = 0;
                for (let i = 0; i < instances.length; i++) {
                    if (instances[i].barcode === pn) {
                        keepIdx = i;
                        break;
                    }
                }

                const toKeep = instances[keepIdx];
                console.log(`   👉 Keeping product ID ${toKeep.id} (barcode: ${toKeep.barcode}, warehouse_id: ${toKeep.warehouse_id})`);

                for (let i = 0; i < instances.length; i++) {
                    if (i !== keepIdx) {
                        const toDelete = instances[i];
                        console.log(`   🗑️ Deleting duplicate product ID ${toDelete.id} (warehouse_id: ${toDelete.warehouse_id}, quantity: ${toDelete.quantity})`);
                        await db.query('DELETE FROM products WHERE id = $1', [toDelete.id]);
                    }
                }
            }
        } else {
            console.log('🔍 No duplicate part numbers found.');
        }

        // 2. Show current stats
        const { rows: stats } = await db.query(`
            SELECT 
                COUNT(*) as total_products,
                SUM(quantity) as total_stock,
                COUNT(*) FILTER (WHERE quantity > 0) as products_with_stock,
                COUNT(*) FILTER (WHERE warehouse_id IS NOT NULL) as products_with_warehouse
            FROM products
        `);

        const stat = stats[0];
        console.log('\n📊 Stats before updates:');
        console.log(`   Total products: ${stat.total_products}`);
        console.log(`   Total stock across all products: ${stat.total_stock}`);
        console.log(`   Products with stock > 0: ${stat.products_with_stock}`);
        console.log(`   Products with warehouse assigned: ${stat.products_with_warehouse}`);

        // 3. Reset all warehouse_ids to NULL and quantities to 0
        console.log('\n🔄 Migrating all products to be independent of warehouse (warehouse_id = NULL) and setting stock to 0...');
        const { rowCount } = await db.query('UPDATE products SET warehouse_id = NULL, quantity = 0');

        console.log(`✅ Updated ${rowCount} product(s)`);

        // 4. Verify results
        const { rows: verify } = await db.query(`
            SELECT 
                COUNT(*) as total, 
                SUM(quantity) as total_stock,
                COUNT(*) FILTER (WHERE warehouse_id IS NOT NULL) as count_with_warehouse
            FROM products
        `);
        console.log(`\n📋 Verification:`);
        console.log(`   Total products: ${verify[0].total}`);
        console.log(`   Total stock: ${verify[0].total_stock} (should be 0)`);
        console.log(`   Products with warehouse: ${verify[0].count_with_warehouse} (should be 0)`);
        
        console.log('\n🎯 Database is now initialized: all products are warehouse-independent with 0 stock.');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await db.pool.end();
        process.exit(0);
    }
}

resetStockToZero();
