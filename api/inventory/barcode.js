const db = require('../../lib/db');
const { verifyAdminToken } = require('../../lib/auth');

module.exports = async function handler(req, res) {
    try {
        const { action, barcode } = req.query;

        // GET - Scan/lookup barcode
        if (req.method === 'GET') {
            if (action === 'scan' && barcode) {
                const result = await db.query(`
          SELECT 
            p.*,
            c.name as category_name,
            w.name as warehouse_name,
            w.location as warehouse_location
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          LEFT JOIN warehouses w ON p.warehouse_id = w.id
          WHERE p.barcode = $1 OR p.part_number = $1
          LIMIT 1
        `, [barcode]);

                if (result.rows.length === 0) {
                    return res.status(404).json({ message: 'Product not found', barcode });
                }

                return res.json({ product: result.rows[0] });
            }

            return res.status(400).json({ message: 'Invalid action or missing barcode' });
        }

        // POST - Generate or get print data
        if (req.method === 'POST') {
            const decoded = verifyAdminToken(req);
            if (!decoded) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const { product_id, product_ids } = req.body;

            // Generate barcode for single product
            if (action === 'generate' && product_id) {
                // Generate a unique barcode using part_number or timestamp
                const result = await db.query(`
          SELECT part_number FROM products WHERE id = $1
        `, [product_id]);

                if (result.rows.length === 0) {
                    return res.status(404).json({ message: 'Product not found' });
                }

                const barcode = result.rows[0].part_number || `BC${Date.now()}`;

                await db.query(`
          UPDATE products SET barcode = $1 WHERE id = $2
        `, [barcode, product_id]);

                return res.json({ message: 'Barcode generated', barcode });
            }

            // Bulk generate barcodes
            if (action === 'bulk-generate' && product_ids) {
                const barcodes = [];
                for (const id of product_ids) {
                    const result = await db.query(`
            SELECT id, part_number FROM products WHERE id = $1
          `, [id]);

                    if (result.rows.length > 0) {
                        const barcode = result.rows[0].part_number || `BC${Date.now()}-${id}`;
                        await db.query(`UPDATE products SET barcode = $1 WHERE id = $2`, [barcode, id]);
                        barcodes.push({ id, barcode });
                    }
                }

                return res.json({ message: 'Barcodes generated', barcodes });
            }

            // Get print data
            if (action === 'print-data' && product_ids) {
                const result = await db.query(`
          SELECT id, name, part_number, barcode, price
          FROM products
          WHERE id = ANY($1::int[])
        `, [product_ids]);

                return res.json({ products: result.rows });
            }

            return res.status(400).json({ message: 'Invalid action' });
        }

        return res.status(405).json({ message: 'Method not allowed' });

    } catch (error) {
        console.error('Barcode API error:', error);
        return res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
};
