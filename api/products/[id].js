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
      // Get single product with category name
      const query = `
        SELECT 
          p.id, p.name, p.description, p.condition_status, p.price, p.quantity, 
          p.image_url, 
          COALESCE(p.images, CASE WHEN p.image_url IS NOT NULL AND p.image_url != '' THEN json_build_array(p.image_url)::jsonb ELSE '[]'::jsonb END) as images,
          p.part_number, p.barcode, p.ref_no, p.created_at, p.updated_at, 
          p.category_id,
          c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = $1
      `;

      const { rows } = await db.query(query, [id]);

      if (rows.length === 0) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const product = rows[0];

      return res.status(200).json({
        message: 'Product retrieved successfully',
        data: product
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

      let finalName = name;
      let finalCondition = condition_status;
      let finalPrice = price;
      let finalQuantity = quantity;
      let finalCategoryId = category_id;
      let finalPartNumber = part_number;
      let finalBarcode = barcode;
      let finalRefNo = ref_no;
      let finalImageUrl = image_url;
      let finalImages = images;
      let finalBinNumber = bin_number;
      let finalWarehouseId = warehouse_id;

      // Support partial update (e.g. updating bin_number or stock only)
      if (!finalName || !finalCondition || finalPrice === undefined || finalQuantity === undefined) {
        const existing = await db.query('SELECT * FROM products WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
          return res.status(404).json({ message: 'Product not found' });
        }
        const cur = existing.rows[0];
        finalName = finalName || cur.name;
        finalCondition = finalCondition || cur.condition_status;
        finalPrice = finalPrice !== undefined ? finalPrice : cur.price;
        finalQuantity = finalQuantity !== undefined ? finalQuantity : cur.quantity;
        finalCategoryId = finalCategoryId !== undefined ? finalCategoryId : cur.category_id;
        finalPartNumber = finalPartNumber !== undefined ? finalPartNumber : cur.part_number;
        finalBarcode = finalBarcode !== undefined ? finalBarcode : cur.barcode;
        finalRefNo = finalRefNo !== undefined ? finalRefNo : cur.ref_no;
        finalImageUrl = finalImageUrl !== undefined ? finalImageUrl : cur.image_url;
        finalImages = finalImages !== undefined ? finalImages : cur.images;
        finalBinNumber = finalBinNumber !== undefined ? finalBinNumber : cur.bin_number;
        finalWarehouseId = finalWarehouseId !== undefined ? finalWarehouseId : cur.warehouse_id;
      }

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
