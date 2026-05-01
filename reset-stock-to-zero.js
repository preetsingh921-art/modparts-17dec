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
        console.log('📦 Resetting all product stock to 0...');

        // First, show current stock stats
        const { rows: stats } = await db.query(`
            SELECT 
                COUNT(*) as total_products,
                SUM(quantity) as total_stock,
                COUNT(*) FILTER (WHERE quantity > 0) as products_with_stock,
                COUNT(*) FILTER (WHERE quantity = 0) as products_at_zero
            FROM products
        `);

        const stat = stats[0];
        console.log('\n📊 Current stock stats:');
        console.log(`   Total products: ${stat.total_products}`);
        console.log(`   Total stock across all products: ${stat.total_stock}`);
        console.log(`   Products with stock > 0: ${stat.products_with_stock}`);
        console.log(`   Products already at 0: ${stat.products_at_zero}`);

        // Reset all quantities to 0
        const { rowCount } = await db.query('UPDATE products SET quantity = 0 WHERE quantity != 0');

        console.log(`\n✅ Reset ${rowCount} product(s) to quantity = 0`);

        // Verify
        const { rows: verify } = await db.query(`
            SELECT COUNT(*) as total, SUM(quantity) as total_stock 
            FROM products
        `);
        console.log(`\n📋 Verification:`)
        console.log(`   Total products: ${verify[0].total}`);
        console.log(`   Total stock: ${verify[0].total_stock} (should be 0)`);
        console.log('\n🎯 All products now start at 0 stock.');
        console.log('   Stock will increase when parts are received via Scan & Receive.');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

resetStockToZero();
