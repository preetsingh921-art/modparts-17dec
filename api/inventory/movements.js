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
          p.hs_code,
          fw.name as from_warehouse_name,
          fw.country as from_warehouse_country,
          tw.name as to_warehouse_name,
          tw.country as to_warehouse_country,
          cu.first_name || ' ' || cu.last_name as created_by_name,
          ru.first_name || ' ' || ru.last_name as received_by_name
        FROM inventory_movements m
        LEFT JOIN products p ON m.product_id = p.id
        LEFT JOIN warehouses fw ON m.from_warehouse_id = fw.id
        LEFT JOIN warehouses tw ON m.to_warehouse_id = tw.id
        LEFT JOIN users cu ON m.created_by = cu.id
        LEFT JOIN users ru ON m.received_by = ru.id
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

            try {
                const result = await db.query(queryText, params);
                return res.json({ movements: result.rows });
            } catch (queryErr) {
                console.warn('⚠️ Movements detailed query failed, falling back to base columns:', queryErr.message);
                const fallbackQuery = `
                    SELECT 
                      m.*,
                      p.name as product_name,
                      p.barcode,
                      p.part_number,
                      fw.name as from_warehouse_name,
                      tw.name as to_warehouse_name,
                      cu.first_name || ' ' || cu.last_name as created_by_name
                    FROM inventory_movements m
                    LEFT JOIN products p ON m.product_id = p.id
                    LEFT JOIN warehouses fw ON m.from_warehouse_id = fw.id
                    LEFT JOIN warehouses tw ON m.to_warehouse_id = tw.id
                    LEFT JOIN users cu ON m.created_by = cu.id
                    ORDER BY m.created_at DESC LIMIT $1
                `;
                const fallbackResult = await db.query(fallbackQuery, [parseInt(limit)]);
                return res.json({ movements: fallbackResult.rows });
            }
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
                const { product_ids, from_warehouse_id, to_warehouse_id, notes, quantity = 1, from_bin_number, tracking_number } = req.body;

                const movements = [];
                for (const productId of product_ids) {
                    // Create movement record with shipped_at timestamp, quantity, and tracking info
                    const result = await db.query(`
                        INSERT INTO inventory_movements 
                        (product_id, from_warehouse_id, to_warehouse_id, movement_type, status, notes, created_by, shipped_at, quantity, from_bin_number, tracking_number)
                        VALUES ($1, $2, $3, 'transfer', 'in_transit', $4, $5, NOW(), $6, $7, $8)
                        RETURNING *
                    `, [productId, from_warehouse_id, to_warehouse_id, notes, decoded.id, quantity, from_bin_number || null, tracking_number || null]);
                    movements.push(result.rows[0]);

                    // Decrease quantity at source by specified amount (but don't go below 0)
                    await db.query(`
                        UPDATE products 
                        SET quantity = GREATEST(0, quantity - $2)
                        WHERE id = $1
                    `, [productId, quantity]);

                    console.log(`📤 Shipped ${quantity} of product ${productId}: decreased quantity at warehouse ${from_warehouse_id}`);
                }

                return res.status(201).json({
                    message: `${movements.length} products shipped successfully. Quantity decreased at source.`,
                    movements
                });
            }

            // Update transfer status through pipeline: picked → packed → customs_review → in_transit → arrived
            if (action === 'update-status') {
                const { movement_id, new_status, tracking_number: trackNum, customs_status: custStatus, notes: statusNotes } = req.body;

                if (!movement_id || !new_status) {
                    return res.status(400).json({ message: 'movement_id and new_status are required' });
                }

                // Valid status transitions
                const VALID_STATUSES = ['pending', 'picked', 'packed', 'customs_review', 'in_transit', 'arrived', 'received', 'completed', 'cancelled'];
                if (!VALID_STATUSES.includes(new_status)) {
                    return res.status(400).json({ message: `Invalid status. Valid: ${VALID_STATUSES.join(', ')}` });
                }

                // Build dynamic update with timestamp for the specific stage
                const timestampMap = {
                    'picked': 'picked_at',
                    'packed': 'packed_at',
                    'in_transit': 'shipped_at',
                    'arrived': 'received_at',
                    'received': 'received_at',
                    'completed': 'scanned_at',
                    'customs_review': 'customs_cleared_at',
                };

                let updateFields = 'status = $2, updated_at = NOW()';
                const updateParams = [movement_id, new_status];
                let paramIdx = 3;

                // Set the timestamp for this pipeline stage
                const tsField = timestampMap[new_status];
                if (tsField) {
                    updateFields += `, ${tsField} = NOW()`;
                }

                // Optionally update tracking number
                if (trackNum) {
                    updateFields += `, tracking_number = $${paramIdx}`;
                    updateParams.push(trackNum);
                    paramIdx++;
                }

                // Optionally update customs status
                if (custStatus) {
                    updateFields += `, customs_status = $${paramIdx}`;
                    updateParams.push(custStatus);
                    paramIdx++;
                }

                // Optionally update notes
                if (statusNotes) {
                    updateFields += `, notes = $${paramIdx}`;
                    updateParams.push(statusNotes);
                    paramIdx++;
                }

                const result = await db.query(`
                    UPDATE inventory_movements 
                    SET ${updateFields}
                    WHERE id = $1
                    RETURNING *
                `, updateParams);

                if (result.rows.length === 0) {
                    return res.status(404).json({ message: 'Movement not found' });
                }

                console.log(`📋 Movement ${movement_id} status → ${new_status}`);
                return res.json({
                    message: `Transfer status updated to '${new_status}'`,
                    movement: result.rows[0]
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
                    SELECT m.*, p.part_number, p.name, p.description, p.price, p.category_id, p.barcode, p.image_url, p.condition_status
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
                        INSERT INTO products (part_number, name, description, price, category_id, barcode, image_url, warehouse_id, bin_number, quantity, condition_status)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    `, [
                        movement.part_number,
                        movement.name,
                        movement.description,
                        movement.price,
                        movement.category_id,
                        movement.barcode,
                        movement.image_url,
                        warehouse_id,
                        bin_number,
                        quantity,
                        movement.condition_status || 'New'
                    ]);

                    resultMessage = `Received ${quantity} units. New product entry created in warehouse.`;
                    console.log(`📥 Received ${quantity} of ${movement.part_number} - created new product entry`);
                }

                // Mark movement as completed with receiver user
                try {
                    await db.query(`
                        UPDATE inventory_movements 
                        SET status = 'completed', scanned_at = NOW(), received_at = NOW(), to_bin = $2, received_by = $3
                        WHERE id = $1
                    `, [movement_id, bin_number, decoded.id]);
                } catch (updateErr) {
                    console.warn('⚠️ Updating movement without received_by column:', updateErr.message);
                    await db.query(`
                        UPDATE inventory_movements 
                        SET status = 'completed', scanned_at = NOW(), received_at = NOW(), to_bin = $2
                        WHERE id = $1
                    `, [movement_id, bin_number]);
                }

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

            // Shift product between bins in the same warehouse
            if (action === 'shift-bin') {
                const { product_id, from_bin, to_bin, warehouse_id: reqWhId, quantity } = req.body;

                if (!product_id || !to_bin) {
                    return res.status(400).json({ message: 'product_id and to_bin are required' });
                }

                // Verify product exists and get its current state
                const prodRes = await db.query(`
                    SELECT * FROM products WHERE id = $1
                `, [product_id]);

                if (prodRes.rows.length === 0) {
                    return res.status(404).json({ message: 'Product not found' });
                }

                const sourceProd = prodRes.rows[0];
                const targetWhId = reqWhId || sourceProd.warehouse_id;
                const currentQty = parseInt(sourceProd.quantity) || 0;
                const moveQty = quantity ? Math.min(parseInt(quantity), currentQty) : currentQty;

                // Update product's bin_number and warehouse_id
                await db.query(`
                    UPDATE products 
                    SET bin_number = $1, warehouse_id = COALESCE($2, warehouse_id), updated_at = NOW() 
                    WHERE id = $3
                `, [to_bin, targetWhId, product_id]);

                // Log movement in inventory_movements
                try {
                    await db.query(`
                        INSERT INTO inventory_movements 
                        (product_id, from_warehouse_id, to_warehouse_id, movement_type, status, notes, created_by, shipped_at, received_at, quantity, from_bin_number, to_bin)
                        VALUES ($1, $2, $2, 'adjustment', 'completed', $3, $4, NOW(), NOW(), $5, $6, $7)
                    `, [
                        product_id,
                        targetWhId,
                        `Shifted ${moveQty} units from bin ${from_bin || sourceProd.bin_number || 'unassigned'} to bin ${to_bin}`,
                        decoded.id,
                        moveQty,
                        from_bin || sourceProd.bin_number || null,
                        to_bin
                    ]);
                } catch (logErr) {
                    console.warn('⚠️ Could not log internal bin movement in inventory_movements:', logErr.message);
                }

                return res.json({ 
                    success: true, 
                    message: `Successfully shifted ${moveQty} unit(s) of "${sourceProd.name}" to bin ${to_bin}` 
                });
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
                        SELECT name, description, price, category_id, barcode, image_url, condition_status 
                        FROM products WHERE part_number = $1 LIMIT 1
                    `, [part_number]);

                    if (productDetails.rows.length === 0) {
                        return res.status(404).json({ message: 'Product not found. Cannot add to inventory.' });
                    }

                    const details = productDetails.rows[0];

                    // Create new entry in warehouse
                    await db.query(`
                        INSERT INTO products (part_number, name, description, price, category_id, barcode, image_url, warehouse_id, bin_number, quantity, condition_status)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    `, [
                        part_number,
                        details.name,
                        details.description,
                        details.price,
                        details.category_id,
                        details.barcode,
                        details.image_url,
                        warehouse_id,
                        bin_number,
                        quantity,
                        details.condition_status || 'New'
                    ]);

                    resultMessage = `Created new inventory entry with ${quantity} units.`;
                    console.log(`📦 Unexpected receive: Created new entry for ${part_number} with ${quantity} units`);
                }

                return res.json({ message: resultMessage });
            }

            // Bulk Intake - Add multiple products (including new SKUs) to inventory in batch
            if (action === 'bulk-intake') {
                const { warehouse_id, items, default_bin } = req.body;

                if (!warehouse_id) {
                    return res.status(400).json({ message: 'Target warehouse ID is required' });
                }

                if (!Array.isArray(items) || items.length === 0) {
                    return res.status(400).json({ message: 'Items array cannot be empty' });
                }

                const client = await db.pool.connect();
                try {
                    await client.query('BEGIN');

                    let updatedCount = 0;
                    let createdCount = 0;
                    const processedItems = [];

                    for (const item of items) {
                        const rawSku = (item.part_number || item.barcode || '').trim();
                        const barcode = (item.barcode || rawSku).trim();
                        const partNumber = (item.part_number || rawSku).trim();
                        const qty = Math.max(1, parseInt(item.quantity) || 1);
                        const bin = (item.bin_number || default_bin || null)?.trim() || null;
                        const name = (item.name || `Part ${rawSku}`).trim();
                        const price = parseFloat(item.price) >= 0 ? parseFloat(item.price) : 0.00;
                        const categoryId = item.category_id ? parseInt(item.category_id) : null;
                        const condition = item.condition_status || 'New';
                        const description = item.description || null;

                        // Clean comparison helper string
                        const cleanCode = rawSku.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

                        // Check if product exists in the target warehouse
                        const localMatch = await client.query(`
                            SELECT id, quantity, name, part_number, barcode, bin_number 
                            FROM products
                            WHERE warehouse_id = $1 
                              AND (
                                part_number = $2 
                                OR barcode = $3 
                                OR REPLACE(REPLACE(part_number, '-', ''), ' ', '') = $4
                                OR REPLACE(REPLACE(barcode, '-', ''), ' ', '') = $4
                              )
                            ORDER BY quantity DESC, id DESC
                            LIMIT 1
                        `, [warehouse_id, partNumber, barcode, cleanCode]);

                        let finalProductId;

                        if (localMatch.rows.length > 0) {
                            // CASE 1: Product exists in this warehouse -> increment quantity
                            const target = localMatch.rows[0];
                            finalProductId = target.id;
                            const newQty = target.quantity + qty;

                            await client.query(`
                                UPDATE products 
                                SET quantity = $1, 
                                    bin_number = COALESCE($2, bin_number),
                                    updated_at = NOW()
                                WHERE id = $3
                            `, [newQty, bin, target.id]);

                            updatedCount++;
                            processedItems.push({
                                id: target.id,
                                part_number: target.part_number,
                                name: target.name,
                                quantity_added: qty,
                                total_quantity: newQty,
                                status: 'stock_incremented'
                            });
                        } else {
                            // Check if product exists globally in any other warehouse/catalog
                            const globalMatch = await client.query(`
                                SELECT id, name, description, price, category_id, barcode, part_number, image_url, condition_status, images
                                FROM products
                                WHERE part_number = $1 
                                   OR barcode = $2
                                   OR REPLACE(REPLACE(part_number, '-', ''), ' ', '') = $3
                                   OR REPLACE(REPLACE(barcode, '-', ''), ' ', '') = $3
                                ORDER BY id ASC
                                LIMIT 1
                            `, [partNumber, barcode, cleanCode]);

                            if (globalMatch.rows.length > 0) {
                                // CASE 2: Product exists in catalog/other warehouse -> create local warehouse inventory entry
                                const gm = globalMatch.rows[0];
                                const res = await client.query(`
                                    INSERT INTO products (
                                        part_number, name, description, price, category_id, barcode, 
                                        image_url, images, warehouse_id, bin_number, quantity, condition_status,
                                        created_at, updated_at
                                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
                                    RETURNING id, name, part_number, quantity
                                `, [
                                    gm.part_number || partNumber,
                                    name !== `Part ${rawSku}` ? name : gm.name,
                                    description || gm.description,
                                    price > 0 ? price : gm.price,
                                    categoryId || gm.category_id,
                                    gm.barcode || barcode,
                                    gm.image_url,
                                    gm.images ? JSON.stringify(gm.images) : '[]',
                                    warehouse_id,
                                    bin,
                                    qty,
                                    condition || gm.condition_status || 'New'
                                ]);

                                finalProductId = res.rows[0].id;
                                createdCount++;
                                processedItems.push({
                                    id: finalProductId,
                                    part_number: gm.part_number || partNumber,
                                    name: gm.name,
                                    quantity_added: qty,
                                    total_quantity: qty,
                                    status: 'warehouse_entry_created'
                                });
                            } else {
                                // CASE 3: Brand NEW SKU -> create fresh product record
                                const res = await client.query(`
                                    INSERT INTO products (
                                        name, description, part_number, barcode, condition_status, 
                                        price, quantity, category_id, warehouse_id, bin_number, 
                                        images, created_at, updated_at
                                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '[]'::jsonb, NOW(), NOW())
                                    RETURNING id, name, part_number, quantity
                                `, [
                                    name,
                                    description,
                                    partNumber,
                                    barcode,
                                    condition,
                                    price,
                                    qty,
                                    categoryId,
                                    warehouse_id,
                                    bin
                                ]);

                                finalProductId = res.rows[0].id;
                                createdCount++;
                                processedItems.push({
                                    id: finalProductId,
                                    part_number: partNumber,
                                    name: name,
                                    quantity_added: qty,
                                    total_quantity: qty,
                                    status: 'new_sku_created'
                                });
                            }
                        }

                        // Create inventory movement record for audit trail
                        try {
                            const adminId = decoded?.userId || decoded?.id || null;
                            await client.query(`
                                INSERT INTO inventory_movements (
                                    product_id, to_warehouse_id, to_bin, quantity, 
                                    movement_type, status, notes, scanned_at, received_at, received_by,
                                    created_at, updated_at
                                ) VALUES ($1, $2, $3, $4, 'receive', 'received', 'Bulk scan intake batch', NOW(), NOW(), $5, NOW(), NOW())
                            `, [finalProductId, warehouse_id, bin, qty, adminId]);
                        } catch (movErr) {
                            console.warn('⚠️ Could not log movement audit record:', movErr.message);
                        }
                    }

                    await client.query('COMMIT');

                    return res.json({
                        success: true,
                        message: `Successfully processed ${items.length} items (${updatedCount} stock updated, ${createdCount} created)`,
                        processedCount: items.length,
                        updatedCount,
                        createdCount,
                        items: processedItems
                    });
                } catch (txErr) {
                    await client.query('ROLLBACK');
                    console.error('❌ Bulk intake transaction failed:', txErr);
                    return res.status(500).json({ message: 'Bulk intake failed: ' + txErr.message });
                } finally {
                    client.release();
                }
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
