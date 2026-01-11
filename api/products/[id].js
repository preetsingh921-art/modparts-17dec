const db = require('../../lib/db');

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
          p.image_url, p.part_number, p.barcode, p.created_at, p.updated_at, 
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
      const { name, description, condition_status, price, quantity, category_id, image_url, part_number, barcode } = req.body;

      console.log('[PRODUCT UPDATE] Updating product ID:', id);
      console.log('[PRODUCT UPDATE] Data received:', { name, price, quantity, part_number, barcode });

      if (!name || !condition_status || price < 0 || quantity < 0) {
        return res.status(400).json({
          message: 'Name, condition status, valid price, and quantity are required'
        });
      }

      // Barcode logic: ALWAYS use part_number as barcode when available
      // This ensures scanning the barcode returns the part number
      let generatedBarcode;
      if (part_number) {
        generatedBarcode = part_number;
      } else if (barcode) {
        generatedBarcode = barcode;
      } else {
        // Keep existing barcode if neither part_number nor barcode is provided
        generatedBarcode = null;
      }

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
          part_number = $8,
          barcode = $9,
          updated_at = NOW()
        WHERE id = $10
        RETURNING *
      `;

      const values = [
        name,
        description || null,
        condition_status,
        parseFloat(price),
        parseInt(quantity),
        category_id ? parseInt(category_id) : null,
        image_url || null,
        part_number || null,
        generatedBarcode,
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
