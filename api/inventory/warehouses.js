const db = require('../../lib/db');
const { verifyAdminToken } = require('../../lib/auth');

module.exports = async function handler(req, res) {
    try {
        // GET - List all warehouses
        if (req.method === 'GET') {
            const { id } = req.query;

            if (id) {
                // Get single warehouse
                const result = await db.query(`
          SELECT w.*, 
            (SELECT COUNT(*) FROM bins WHERE warehouse_id = w.id) as bin_count,
            (SELECT COUNT(*) FROM products WHERE warehouse_id = w.id) as product_count
          FROM warehouses w
          WHERE w.id = $1
        `, [id]);

                if (result.rows.length === 0) {
                    return res.status(404).json({ message: 'Warehouse not found' });
                }

                return res.json({ warehouse: result.rows[0] });
            } else {
                // Get all warehouses
                const result = await db.query(`
          SELECT w.*, 
            (SELECT COUNT(*) FROM bins WHERE warehouse_id = w.id) as bin_count,
            (SELECT COUNT(*) FROM products WHERE warehouse_id = w.id) as product_count
          FROM warehouses w
          WHERE w.is_active = true
          ORDER BY w.name
        `);

                console.log('Warehouses found:', result.rows.length);
                return res.json({ warehouses: result.rows });
            }
        }

        // POST - Create warehouse
        if (req.method === 'POST') {
            const decoded = verifyAdminToken(req);
            if (!decoded) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const { name, location, country, is_active = true } = req.body;

            if (!name) {
                return res.status(400).json({ message: 'Warehouse name is required' });
            }

            const result = await db.query(`
        INSERT INTO warehouses (name, location, country, is_active)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [name, location, country, is_active]);

            return res.status(201).json({
                message: 'Warehouse created successfully',
                warehouse: result.rows[0]
            });
        }

        // PUT - Update warehouse
        if (req.method === 'PUT') {
            const decoded = verifyAdminToken(req);
            if (!decoded) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const { id, name, location, country, is_active } = req.body;

            if (!id) {
                return res.status(400).json({ message: 'Warehouse ID is required' });
            }

            const result = await db.query(`
        UPDATE warehouses 
        SET name = COALESCE($2, name),
            location = COALESCE($3, location),
            country = COALESCE($4, country),
            is_active = COALESCE($5, is_active),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [id, name, location, country, is_active]);

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Warehouse not found' });
            }

            return res.json({
                message: 'Warehouse updated successfully',
                warehouse: result.rows[0]
            });
        }

        // DELETE - Delete warehouse
        if (req.method === 'DELETE') {
            const decoded = verifyAdminToken(req);
            if (!decoded) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const { id } = req.query;

            if (!id) {
                return res.status(400).json({ message: 'Warehouse ID is required' });
            }

            // Soft delete by setting is_active to false
            const result = await db.query(`
        UPDATE warehouses 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Warehouse not found' });
            }

            return res.json({ message: 'Warehouse deleted successfully' });
        }

        return res.status(405).json({ message: 'Method not allowed' });

    } catch (error) {
        console.error('Warehouse API error:', error);
        return res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
};
