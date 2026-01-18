const db = require('../../lib/db');
const { verifyAdminToken } = require('../../lib/auth');

module.exports = async function handler(req, res) {
    try {
        // GET - List bins (optionally by warehouse)
        if (req.method === 'GET') {
            const { warehouse_id, id } = req.query;

            if (id) {
                const result = await db.query(`
          SELECT b.*, w.name as warehouse_name
          FROM bins b
          LEFT JOIN warehouses w ON b.warehouse_id = w.id
          WHERE b.id = $1
        `, [id]);

                if (result.rows.length === 0) {
                    return res.status(404).json({ message: 'Bin not found' });
                }

                return res.json({ bin: result.rows[0] });
            } else if (warehouse_id) {
                const result = await db.query(`
          SELECT b.*, 
            (SELECT COUNT(*) FROM products WHERE bin_number = b.bin_number AND warehouse_id = b.warehouse_id) as product_count
          FROM bins b
          WHERE b.warehouse_id = $1 AND b.is_active = true
          ORDER BY b.bin_number
        `, [warehouse_id]);

                return res.json({ bins: result.rows });
            } else {
                const result = await db.query(`
          SELECT b.*, w.name as warehouse_name,
            (SELECT COUNT(*) FROM products WHERE bin_number = b.bin_number AND warehouse_id = b.warehouse_id) as product_count
          FROM bins b
          LEFT JOIN warehouses w ON b.warehouse_id = w.id
          WHERE b.is_active = true
          ORDER BY w.name, b.bin_number
        `);

                return res.json({ bins: result.rows });
            }
        }

        // POST - Create bin
        if (req.method === 'POST') {
            const decoded = verifyAdminToken(req);
            if (!decoded) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const { warehouse_id, bin_number, description, capacity = 100 } = req.body;

            if (!warehouse_id || !bin_number) {
                return res.status(400).json({ message: 'Warehouse ID and bin number are required' });
            }

            const result = await db.query(`
        INSERT INTO bins (warehouse_id, bin_number, description, capacity)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [warehouse_id, bin_number, description, capacity]);

            return res.status(201).json({
                message: 'Bin created successfully',
                bin: result.rows[0]
            });
        }

        // PUT - Update bin
        if (req.method === 'PUT') {
            const decoded = verifyAdminToken(req);
            if (!decoded) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const { id } = req.query;
            const { bin_number, description, capacity } = req.body;

            if (!id) {
                return res.status(400).json({ message: 'Bin ID is required' });
            }

            const result = await db.query(`
                UPDATE bins 
                SET bin_number = COALESCE($2, bin_number),
                    description = COALESCE($3, description),
                    capacity = COALESCE($4, capacity),
                    updated_at = NOW()
                WHERE id = $1
                RETURNING *
            `, [id, bin_number, description, capacity]);

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Bin not found' });
            }

            return res.json({
                message: 'Bin updated successfully',
                bin: result.rows[0]
            });
        }

        // DELETE - Delete bin
        if (req.method === 'DELETE') {
            const decoded = verifyAdminToken(req);
            if (!decoded) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const { id } = req.query;

            if (!id) {
                return res.status(400).json({ message: 'Bin ID is required' });
            }

            await db.query(`
        UPDATE bins SET is_active = false, updated_at = NOW() WHERE id = $1
      `, [id]);

            return res.json({ message: 'Bin deleted successfully' });
        }

        return res.status(405).json({ message: 'Method not allowed' });

    } catch (error) {
        console.error('Bins API error:', error);
        return res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
};
