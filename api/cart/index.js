const db = require('../../lib/db');
const jwt = require('jsonwebtoken');

// Helper function to verify JWT token
function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
  } catch (error) {
    return null;
  }
}

module.exports = async function handler(req, res) {
  // CORS is handled by dev-server middleware

  // Verify authentication
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Handle different user ID formats (numeric vs string/UUID)
  const userId = user.userId || user.id;

  console.log('🔑 Cart API (Neon) - User:', { id: userId, email: user.email });

  try {
    if (req.method === 'GET') {
      // Get user's cart items with product details
      const query = `
        SELECT 
          ci.id, 
          ci.product_id, 
          ci.quantity, 
          ci.created_at,
          p.name, 
          p.price, 
          p.image_url, 
          p.quantity as stock_quantity,
          c.name as category_name
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE ci.user_id = $1
        ORDER BY ci.created_at DESC
      `;

      const { rows } = await db.query(query, [userId]);

      // Calculate total
      const total = rows.reduce((sum, item) => {
        return sum + (Number(item.price) * item.quantity);
      }, 0);

      // Transform items to match frontend expectations
      const transformedItems = rows.map(item => ({
        id: item.id,
        product_id: item.product_id,
        name: item.name,
        price: Number(item.price),
        quantity: item.quantity,
        image_url: item.image_url,
        stock_quantity: item.stock_quantity,
        category_name: item.category_name,
        subtotal: Number(item.price) * item.quantity
      }));

      console.log(`✅ Returning ${rows.length} cart items with total $${total.toFixed(2)}`);

      res.status(200).json({
        message: 'Cart retrieved successfully',
        items: transformedItems,
        data: transformedItems, // Backward compliance
        total: total,
        count: rows.length
      });

    } else if (req.method === 'POST') {
      // Add item to cart
      const { product_id, quantity = 1 } = req.body;

      if (!product_id || quantity <= 0) {
        return res.status(400).json({
          message: 'Product ID and valid quantity are required'
        });
      }

      // 1. Check product stock
      const productQuery = 'SELECT id, quantity, price, name FROM products WHERE id = $1';
      const { rows: products } = await db.query(productQuery, [product_id]);
      const product = products[0];

      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      if (product.quantity < quantity) {
        return res.status(400).json({
          message: `Sorry, only ${product.quantity} items available in stock. You requested ${quantity}.`,
          availableQuantity: product.quantity,
          requestedQuantity: quantity
        });
      }

      // 2. Check existing cart item
      const checkCartQuery = 'SELECT id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2';
      const { rows: existingItems } = await db.query(checkCartQuery, [userId, product_id]);
      const existingItem = existingItems[0];

      if (existingItem) {
        // Update quantity
        const newQuantity = existingItem.quantity + quantity;

        if (product.quantity < newQuantity) {
          const maxCanAdd = Math.max(0, product.quantity - existingItem.quantity);
          const message = maxCanAdd === 0
            ? `This item is already at maximum quantity in your cart (${existingItem.quantity}/${product.quantity}).`
            : `Cannot add ${quantity} more items. You have ${existingItem.quantity} in cart and only ${product.quantity} available in stock. You can add ${maxCanAdd} more.`;

          return res.status(400).json({
            message,
            currentInCart: existingItem.quantity,
            availableStock: product.quantity,
            requestedToAdd: quantity,
            maxCanAdd
          });
        }

        const updateQuery = `
          UPDATE cart_items 
          SET quantity = $1, updated_at = NOW() 
          WHERE id = $2 
          RETURNING *
        `;
        const { rows: updatedRows } = await db.query(updateQuery, [newQuantity, existingItem.id]);

        console.log('✅ Cart item updated successfully');
        return res.status(200).json({
          message: 'Cart item updated successfully',
          data: updatedRows[0]
        });

      } else {
        // Insert new item
        const insertQuery = `
          INSERT INTO cart_items (user_id, product_id, quantity, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW())
          RETURNING *
        `;
        const { rows: newItems } = await db.query(insertQuery, [userId, product_id, quantity]);

        console.log('✅ Item added to cart successfully');
        res.status(201).json({
          message: 'Item added to cart successfully',
          data: newItems[0]
        });
      }

    } else if (req.method === 'PUT') {
      // Import cart items logic
      const { items, import_mode } = req.body;

      if (import_mode === 'import' && Array.isArray(items)) {
        console.log('🔄 Importing cart items (Neon) for user:', userId, 'Items:', items.length);

        // Begin transaction
        const client = await db.pool.connect();
        try {
          await client.query('BEGIN');

          // Clear existing cart
          await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

          let successCount = 0;
          let errorCount = 0;

          // Insert items
          for (const item of items) {
            if (item.product_id && item.quantity > 0) {
              // Check availability
              const res = await client.query('SELECT quantity FROM products WHERE id = $1', [item.product_id]);
              const product = res.rows[0];

              if (product) {
                const qtyToAdd = Math.min(item.quantity, product.quantity);
                await client.query(
                  'INSERT INTO cart_items (user_id, product_id, quantity, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
                  [userId, item.product_id, qtyToAdd]
                );
                successCount++;
              } else {
                errorCount++;
              }
            } else {
              errorCount++;
            }
          }

          await client.query('COMMIT');
          console.log(`✅ Cart import completed: ${successCount} success, ${errorCount} errors`);

          res.status(200).json({
            message: 'Cart imported successfully',
            success_count: successCount,
            error_count: errorCount
          });

        } catch (err) {
          await client.query('ROLLBACK');
          console.error('Cart import transaction failed:', err);
          throw err;
        } finally {
          client.release();
        }
      } else {
        return res.status(400).json({ message: 'Invalid import request' });
      }

    } else if (req.method === 'DELETE') {
      const { cart_item_id, product_id, clear_all } = req.query;

      if (clear_all === 'true' || (!cart_item_id && !product_id)) {
        await db.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
        console.log('🗑️ Cleared cart for user:', userId);
        res.status(200).json({ message: 'Cart cleared successfully' });

      } else if (cart_item_id) {
        await db.query('DELETE FROM cart_items WHERE id = $1 AND user_id = $2', [cart_item_id, userId]);
        console.log('🗑️ Removed cart item:', cart_item_id);
        res.status(200).json({ message: 'Item removed from cart successfully' });

      } else if (product_id) {
        await db.query('DELETE FROM cart_items WHERE product_id = $1 AND user_id = $2', [product_id, userId]);
        console.log('🗑️ Removed product from cart:', product_id);
        res.status(200).json({ message: 'Product removed from cart successfully' });
      } else {
        res.status(400).json({ message: 'Missing required parameter' });
      }

    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Cart API error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
