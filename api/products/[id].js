const db = require('../../lib/db');
const { verifyAdminToken } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  // CORS is handled by dev-server middleware

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ message: 'Product ID is required' });
  }

  try {
    if (req.method === 'GET') {
      // Get single product with category name and multi-warehouse stock breakdown
      const query = `
        SELECT 
          p.id, p.name, p.description, p.condition_status, p.price, p.quantity, 
          p.image_url, 
          COALESCE(p.images, CASE WHEN p.image_url IS NOT NULL AND p.image_url != '' THEN json_build_array(p.image_url)::jsonb ELSE '[]'::jsonb END) as images,
          p.part_number, p.barcode, p.ref_no, p.created_at, p.updated_at, 
          p.category_id, p.warehouse_id, p.bin_number,
          c.name as category_name,
          w.name as warehouse_name,
          w.location as warehouse_location,
          w.country as warehouse_country,
          (
            SELECT COALESCE(SUM(p_tot.quantity), 0)
            FROM products p_tot
            WHERE (p_tot.part_number = p.part_number OR (p.part_number IS NULL AND p_tot.barcode = p.barcode))
          ) as total_stock,
          (
            SELECT json_agg(json_build_object(
              'warehouse_id', p_wh.warehouse_id,
              'warehouse_name', w_sub.name,
              'warehouse_code', w_sub.code,
              'country', w_sub.country,
              'bin_number', p_wh.bin_number,
              'quantity', p_wh.quantity
            ))
            FROM products p_wh
            LEFT JOIN warehouses w_sub ON p_wh.warehouse_id = w_sub.id
            WHERE (p_wh.part_number = p.part_number OR (p.part_number IS NULL AND p_wh.barcode = p.barcode))
          ) as warehouse_stock
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN warehouses w ON p.warehouse_id = w.id
        WHERE p.id = $1
      `;

      const { rows } = await db.query(query, [id]);

      if (rows.length === 0) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const product = rows[0];

      return res.status(200).json({
        message: 'Product retrieved successfully',
        data: {
          ...product,
          warehouse_stock: Array.isArray(product.warehouse_stock) ? product.warehouse_stock.filter(Boolean) : []
        }
      });

    } else if (req.method === 'PUT') {
      // Update product (admin only)
      const adminUser = verifyAdminToken(req);
      if (!adminUser) {
        return res.status(403).json({ message: 'Admin access required to update products' });
      }

      const { name, description, condition_status, price, quantity, category_id, image_url, images, part_number, barcode, ref_no, bin_number, warehouse_id } = req.body;

      console.log('[PRODUCT UPDATE] Updating product ID:', id);
      console.log('[PRODUCT UPDATE] Data received:', { name, price, quantity, part_number, barcode, bin_number, warehouse_id });

      // Retrieve current product state to compare changes and provide fallbacks
      const existing = await db.query('SELECT * FROM products WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ message: 'Product not found' });
      }
      const cur = existing.rows[0];
      const prevQty = parseInt(cur.quantity) || 0;

      let finalName = name !== undefined ? name : cur.name;
      let finalCondition = condition_status !== undefined ? condition_status : cur.condition_status;
      let finalPrice = price !== undefined ? price : cur.price;
      let finalQuantity = quantity !== undefined ? quantity : cur.quantity;
      let finalCategoryId = category_id !== undefined ? category_id : cur.category_id;
      let finalPartNumber = part_number !== undefined ? part_number : cur.part_number;
      let finalBarcode = barcode !== undefined ? barcode : cur.barcode;
      let finalRefNo = ref_no !== undefined ? ref_no : cur.ref_no;
      let finalImageUrl = image_url !== undefined ? image_url : cur.image_url;
      let finalImages = images !== undefined ? images : cur.images;
      let finalBinNumber = bin_number !== undefined ? bin_number : cur.bin_number;
      let finalWarehouseId = warehouse_id !== undefined ? warehouse_id : cur.warehouse_id;

      if (!finalName || !finalCondition || finalPrice < 0 || finalQuantity < 0) {
        return res.status(400).json({
          message: 'Name, condition status, valid price, and quantity are required'
        });
      }

      // Barcode logic: ALWAYS use part_number as barcode when available
      let generatedBarcode;
      if (finalPartNumber) {
        generatedBarcode = finalPartNumber;
      } else if (finalBarcode) {
        generatedBarcode = finalBarcode;
      } else {
        generatedBarcode = null;
      }

      // Format images array
      let formattedImages = [];
      if (Array.isArray(finalImages) && finalImages.length > 0) {
        formattedImages = finalImages.filter(Boolean);
      } else if (finalImageUrl) {
        formattedImages = [finalImageUrl];
      }
      const primaryImageUrl = formattedImages[0] || finalImageUrl || null;

      const updateQuery = `
        UPDATE products 
        SET 
          name = $1,
          description = $2,
          condition_status = $3,
          price = $4,
          quantity = $5,
          category_id = $6,
          image_url = $7,
          images = $8::jsonb,
          part_number = $9,
          barcode = $10,
          ref_no = $11,
          bin_number = $12,
          warehouse_id = $13,
          updated_at = NOW()
        WHERE id = $14
        RETURNING *
      `;

      const values = [
        finalName,
        description || null,
        finalCondition,
        parseFloat(finalPrice),
        parseInt(finalQuantity),
        finalCategoryId ? parseInt(finalCategoryId) : null,
        primaryImageUrl,
        JSON.stringify(formattedImages),
        finalPartNumber || null,
        generatedBarcode,
        finalRefNo || null,
        finalBinNumber || null,
        finalWarehouseId ? parseInt(finalWarehouseId) : null,
        id
      ];

      try {
        const { rows } = await db.query(updateQuery, values);

        if (rows.length === 0) {
          return res.status(404).json({ message: 'Product not found' });
        }

        console.log('[PRODUCT UPDATE SUCCESS] Product ID:', id);

        // Audit Trail: Log stock count changes if quantity was modified
        const newQty = parseInt(finalQuantity);
        if (prevQty !== newQty) {
          const delta = newQty - prevQty;
          try {
            await db.query(`
              INSERT INTO inventory_movements 
              (product_id, from_warehouse_id, to_warehouse_id, movement_type, status, notes, created_by, shipped_at, received_at, quantity, from_bin_number, to_bin)
              VALUES ($1, $2, $2, 'adjustment', 'completed', $3, $4, NOW(), NOW(), $5, $6, $6)
            `, [
              id,
              finalWarehouseId ? parseInt(finalWarehouseId) : null,
              `Manual stock adjustment: ${prevQty} → ${newQty} (${delta > 0 ? '+' : ''}${delta} units)`,
              adminUser.id,
              Math.abs(delta),
              finalBinNumber || null
            ]);
            console.log(`📝 Logged stock adjustment for product ${id}: ${prevQty} -> ${newQty}`);
          } catch (auditErr) {
            console.warn('⚠️ Could not log stock adjustment in inventory_movements:', auditErr.message);
          }
        }

        return res.status(200).json({
          message: 'Product updated successfully',
          data: rows[0]
        });
      } catch (err) {
        console.error('[PRODUCT UPDATE ERROR]', err);
        return res.status(500).json({ message: 'Failed to update product', error: err.message });
      }

    } else if (req.method === 'DELETE') {
      // Delete product (admin only)
      const adminUser = verifyAdminToken(req);
      if (!adminUser) {
        return res.status(403).json({ message: 'Admin access required to delete products' });
      }

      const deleteQuery = 'DELETE FROM products WHERE id = $1 RETURNING id';

      try {
        const { rows } = await db.query(deleteQuery, [id]);

        if (rows.length === 0) {
          return res.status(404).json({ message: 'Product not found' });
        }

        return res.status(200).json({
          message: 'Product deleted successfully'
        });
      } catch (err) {
        console.error('Error deleting product:', err);
        return res.status(500).json({ message: 'Failed to delete product' });
      }

    } else {
      return res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Product API error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
