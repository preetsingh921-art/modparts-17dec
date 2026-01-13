const db = require('../../lib/db');
const { verifyAdminToken } = require('../../lib/auth');

module.exports = async function handler(req, res) {
    try {
        // GET - List movements
        if (req.method === 'GET') {
            const { status, product_id, limit = 50 } = req.query;

            let queryText = `
        SELECT 
          m.*,
          p.name as product_name,
          p.barcode,
          fw.name as from_warehouse_name,
          tw.name as to_warehouse_name
        FROM inventory_movements m
        LEFT JOIN products p ON m.product_id = p.id
        LEFT JOIN warehouses fw ON m.from_warehouse_id = fw.id
        LEFT JOIN warehouses tw ON m.to_warehouse_id = tw.id
        WHERE 1=1
      `;

            const params = [];
            let paramCount = 1;

            if (status) {
                queryText += ` AND m.status = $${paramCount}`;
                params.push(status);
                paramCount++;
            }

            if (product_id) {
                queryText += ` AND m.product_id = $${paramCount}`;
                params.push(product_id);
                paramCount++;
            }

            queryText += ` ORDER BY m.created_at DESC LIMIT $${paramCount}`;
            params.push(parseInt(limit));

            const result = await db.query(queryText, params);

            return res.json({ movements: result.rows });
        }

        // POST - Create movement (ship, receive, assign-bin)
        if (req.method === 'POST') {
            const decoded = verifyAdminToken(req);
            if (!decoded) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const { action } = req.query;

            // Ship products - decrease quantity at source
            if (action === 'ship') {
                const { product_ids, from_warehouse_id, to_warehouse_id, notes } = req.body;

                const movements = [];
                for (const productId of product_ids) {
                    // Create movement record with shipped_at timestamp
                    const result = await db.query(`
                        INSERT INTO inventory_movements 
                        (product_id, from_warehouse_id, to_warehouse_id, movement_type, status, notes, created_by, shipped_at)
                        VALUES ($1, $2, $3, 'transfer', 'in_transit', $4, $5, NOW())
                        RETURNING *
                    `, [productId, from_warehouse_id, to_warehouse_id, notes, decoded.id]);
                    movements.push(result.rows[0]);

                    // Decrease quantity at source (but don't go below 0)
                    await db.query(`
                        UPDATE products 
                        SET quantity = GREATEST(0, quantity - 1)
                        WHERE id = $1
                    `, [productId]);

                    console.log(`📤 Shipped product ${productId}: decreased quantity at warehouse ${from_warehouse_id}`);
                }

                // TODO: Create notification for destination warehouse admin
                // This would require a notifications table and admin-warehouse mapping

                return res.status(201).json({
                    message: `${movements.length} products shipped successfully. Quantity decreased at source.`,
                    movements
                });
            }

            // Receive product - increase quantity
            if (action === 'receive') {
                const { barcode, movement_id, bin_number, warehouse_id } = req.body;

                let movement;
                let productId;

                if (movement_id) {
                    // Complete existing movement with received_at timestamp
                    const result = await db.query(`
                        UPDATE inventory_movements 
                        SET status = 'completed', scanned_at = NOW(), received_at = NOW(), to_bin = $2
                        WHERE id = $1
                        RETURNING *
                    `, [movement_id, bin_number]);
                    movement = result.rows[0];
                    productId = movement?.product_id;
                } else if (barcode) {
                    // Find product by barcode
                    const productResult = await db.query(`
                        SELECT id FROM products WHERE barcode = $1 OR part_number = $1
                    `, [barcode]);

                    if (productResult.rows.length > 0) {
                        productId = productResult.rows[0].id;

                        // Update product bin if provided
                        if (bin_number) {
                            await db.query(`
                                UPDATE products SET bin_number = $1 WHERE id = $2
                            `, [bin_number, productId]);
                        }

                        // Update product warehouse if provided
                        if (warehouse_id) {
                            await db.query(`
                                UPDATE products SET warehouse_id = $1 WHERE id = $2
                            `, [warehouse_id, productId]);
                        }
                    }
                }

                // Increase quantity for received products
                if (productId) {
                    await db.query(`
                        UPDATE products 
                        SET quantity = quantity + 1
                        WHERE id = $1
                    `, [productId]);

                    console.log(`📥 Received product ${productId}: increased quantity`);
                }

                return res.json({
                    message: 'Product received successfully. Quantity increased.',
                    movement
                });
            }

            // Assign bin
            if (action === 'assign-bin') {
                const { product_id, bin_number, warehouse_id } = req.body;

                await db.query(`
                    UPDATE products 
                    SET bin_number = $1, warehouse_id = $2
                    WHERE id = $3
                `, [bin_number, warehouse_id, product_id]);

                return res.json({ message: 'Product assigned to bin successfully' });
            }

            return res.status(400).json({ message: 'Invalid action' });
        }

        // PUT - Update movement status
        if (req.method === 'PUT') {
            const decoded = verifyAdminToken(req);
            if (!decoded) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const { id, status, notes } = req.body;

            const result = await db.query(`
        UPDATE inventory_movements 
        SET status = $2, notes = COALESCE($3, notes), updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [id, status, notes]);

            return res.json({
                message: 'Movement updated successfully',
                movement: result.rows[0]
            });
        }

        return res.status(405).json({ message: 'Method not allowed' });

    } catch (error) {
        console.error('Movements API error:', error);
        return res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
};
