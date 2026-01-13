const db = require('../../lib/db');
const { verifyAdminToken } = require('../../lib/auth');

module.exports = async function handler(req, res) {
    try {
        const decoded = verifyAdminToken(req);
        if (!decoded) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // GET - Get products grouped by bin for a warehouse
        if (req.method === 'GET') {
            const { warehouse_id, search } = req.query;

            if (!warehouse_id) {
                return res.status(400).json({ message: 'warehouse_id is required' });
            }

            // Build query to get products grouped by bin
            let queryText = `
                SELECT 
                    COALESCE(p.bin_number, 'UNASSIGNED') as bin_number,
                    STRING_AGG(DISTINCT p.part_number, ', ' ORDER BY p.part_number) as part_numbers,
                    STRING_AGG(DISTINCT p.name, ', ' ORDER BY p.name) as product_names,
                    COUNT(DISTINCT p.id) as unique_products,
                    SUM(p.quantity) as total_quantity
                FROM products p
                WHERE p.warehouse_id = $1
            `;

            const params = [warehouse_id];
            let paramCount = 2;

            // Add search filter for part number or bin number
            if (search) {
                queryText += ` AND (
                    p.part_number ILIKE $${paramCount} 
                    OR p.bin_number ILIKE $${paramCount}
                    OR p.name ILIKE $${paramCount}
                )`;
                params.push(`%${search}%`);
                paramCount++;
            }

            queryText += `
                GROUP BY COALESCE(p.bin_number, 'UNASSIGNED')
                ORDER BY bin_number
            `;

            const result = await db.query(queryText, params);

            // Also get warehouse info
            const warehouseResult = await db.query(
                'SELECT id, name, code FROM warehouses WHERE id = $1',
                [warehouse_id]
            );

            return res.json({
                warehouse: warehouseResult.rows[0] || null,
                bins: result.rows,
                total_bins: result.rows.length,
                generated_at: new Date().toISOString()
            });
        }

        return res.status(405).json({ message: 'Method not allowed' });

    } catch (error) {
        console.error('Bin contents API error:', error);
        return res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
};
