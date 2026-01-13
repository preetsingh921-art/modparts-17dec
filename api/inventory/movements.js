const db = require('../../lib/db');
const { verifyAdminToken } = require('../../lib/auth');

module.exports = async function handler(req, res) {
    try {
        // GET - List movements (filtered by warehouse if provided)
        if (req.method === 'GET') {
            const { status, product_id, warehouse_id, limit = 50 } = req.query;

            let queryText = `
        SELECT 
          m.*,
          p.name as product_name,
          p.barcode,
          p.part_number,
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

            // Filter by warehouse - show only movements where warehouse is sender OR receiver
            if (warehouse_id) {
                queryText += ` AND (m.from_warehouse_id = $${paramCount} OR m.to_warehouse_id = $${paramCount})`;
                params.push(warehouse_id);
                paramCount++;
            }

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
                const { product_ids, from_warehouse_id, to_warehouse_id, notes, quantity = 1 } = req.body;

                const movements = [];
                for (const productId of product_ids) {
                    // Create movement record with shipped_at timestamp and quantity
                    const result = await db.query(`
                        INSERT INTO inventory_movements 
                        (product_id, from_warehouse_id, to_warehouse_id, movement_type, status, notes, created_by, shipped_at, quantity)
                        VALUES ($1, $2, $3, 'transfer', 'in_transit', $4, $5, NOW(), $6)
                        RETURNING *
                    `, [productId, from_warehouse_id, to_warehouse_id, notes, decoded.id, quantity]);
                    movements.push(result.rows[0]);

                    // Decrease quantity at source by specified amount (but don't go below 0)
                    await db.query(`
                        UPDATE products 
                        SET quantity = GREATEST(0, quantity - $2)
                        WHERE id = $1
                    `, [productId, quantity]);

                    console.log(`📤 Shipped ${quantity} of product ${productId}: decreased quantity at warehouse ${from_warehouse_id}`);
                }

                // TODO: Create notification for destination warehouse admin
                // This would require a notifications table and admin-warehouse mapping

                return res.status(201).json({
                    message: `${movements.length} products shipped successfully. Quantity decreased at source.`,
                    movements
                });
            }

            // Receive product - only allow receiving shipments destined for admin's warehouse
            if (action === 'receive') {
                const { movement_id, bin_number, warehouse_id } = req.body;

                if (!movement_id) {
                    return res.status(400).json({ message: 'Movement ID required to receive a shipment' });
                }

                if (!warehouse_id) {
                    return res.status(400).json({ message: 'Warehouse ID required' });
                }

                // Get the movement and validate destination
                const movementResult = await db.query(`
                    SELECT m.*, p.part_number, p.name, p.description, p.price, p.category, p.barcode, p.image_url
                    FROM inventory_movements m
                    JOIN products p ON m.product_id = p.id
                    WHERE m.id = $1
                `, [movement_id]);

                if (movementResult.rows.length === 0) {
                    return res.status(404).json({ message: 'Movement not found' });
                }

                const movement = movementResult.rows[0];

                // Validate: only destination warehouse can receive
                if (String(movement.to_warehouse_id) !== String(warehouse_id)) {
                    return res.status(403).json({
                        message: 'You can only receive shipments destined for your warehouse'
                    });
                }

                // Check if movement is already completed
                if (movement.status === 'completed') {
                    return res.status(400).json({ message: 'This shipment has already been received' });
                }

                const quantity = movement.quantity || 1;

                // Check if product with same part_number exists in destination warehouse
                const existingProduct = await db.query(`
                    SELECT id, quantity FROM products 
                    WHERE part_number = $1 AND warehouse_id = $2
                `, [movement.part_number, warehouse_id]);

                let resultMessage;
                if (existingProduct.rows.length > 0) {
                    // Product exists - increase quantity
                    await db.query(`
                        UPDATE products 
                        SET quantity = quantity + $1, bin_number = COALESCE($3, bin_number)
                        WHERE id = $2
                    `, [quantity, existingProduct.rows[0].id, bin_number]);

                    const newQty = existingProduct.rows[0].quantity + quantity;
                    resultMessage = `Received ${quantity} units. Product already exists in warehouse - total now: ${newQty}`;
                    console.log(`📥 Received ${quantity} of ${movement.part_number} - increased existing stock`);
                } else {
                    // Product doesn't exist - create new entry
                    await db.query(`
                        INSERT INTO products (part_number, name, description, price, category, barcode, image_url, warehouse_id, bin_number, quantity)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    `, [
                        movement.part_number,
                        movement.name,
                        movement.description,
                        movement.price,
                        movement.category,
                        movement.barcode,
                        movement.image_url,
                        warehouse_id,
                        bin_number,
                        quantity
                    ]);

                    resultMessage = `Received ${quantity} units. New product entry created in warehouse.`;
                    console.log(`📥 Received ${quantity} of ${movement.part_number} - created new product entry`);
                }

                // Mark movement as completed
                await db.query(`
                    UPDATE inventory_movements 
                    SET status = 'completed', scanned_at = NOW(), received_at = NOW(), to_bin = $2
                    WHERE id = $1
                `, [movement_id, bin_number]);

                return res.json({
                    message: resultMessage,
                    movement: { ...movement, status: 'completed' }
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

            // Add unexpected inventory (when product wasn't expected/no movement)
            if (action === 'add-unexpected') {
                const { part_number, warehouse_id, bin_number, quantity = 1 } = req.body;

                if (!part_number || !warehouse_id) {
                    return res.status(400).json({ message: 'Part number and warehouse ID required' });
                }

                // Check if product with this part_number exists in this warehouse
                const existingProduct = await db.query(`
                    SELECT id, quantity FROM products 
                    WHERE part_number = $1 AND warehouse_id = $2
                `, [part_number, warehouse_id]);

                let resultMessage;
                if (existingProduct.rows.length > 0) {
                    // Product exists - increase quantity
                    await db.query(`
                        UPDATE products 
                        SET quantity = quantity + $1, bin_number = COALESCE($3, bin_number)
                        WHERE id = $2
                    `, [quantity, existingProduct.rows[0].id, bin_number]);

                    const newQty = existingProduct.rows[0].quantity + quantity;
                    resultMessage = `Added ${quantity} units to existing stock. Total now: ${newQty}`;
                    console.log(`📦 Unexpected receive: Added ${quantity} of ${part_number} to existing stock`);
                } else {
                    // Need to get product details from any warehouse
                    const productDetails = await db.query(`
                        SELECT name, description, price, category, barcode, image_url 
                        FROM products WHERE part_number = $1 LIMIT 1
                    `, [part_number]);

                    if (productDetails.rows.length === 0) {
                        return res.status(404).json({ message: 'Product not found. Cannot add to inventory.' });
                    }

                    const details = productDetails.rows[0];

                    // Create new entry in warehouse
                    await db.query(`
                        INSERT INTO products (part_number, name, description, price, category, barcode, image_url, warehouse_id, bin_number, quantity)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    `, [
                        part_number,
                        details.name,
                        details.description,
                        details.price,
                        details.category,
                        details.barcode,
                        details.image_url,
                        warehouse_id,
                        bin_number,
                        quantity
                    ]);

                    resultMessage = `Created new inventory entry with ${quantity} units.`;
                    console.log(`📦 Unexpected receive: Created new entry for ${part_number} with ${quantity} units`);
                }

                return res.json({ message: resultMessage });
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
