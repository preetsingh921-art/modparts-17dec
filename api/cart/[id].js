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

  const userId = user.userId || user.id;
  const { id } = req.query;

  try {
    if (req.method === 'PUT') {
      // Update cart item quantity
      const { quantity } = req.body;

      if (!quantity || quantity <= 0) {
        return res.status(400).json({ message: 'Valid quantity is required' });
      }

      // 1. Get cart item details with product stock
      const query = `
        SELECT ci.id, ci.quantity, p.quantity as stock_quantity 
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.id = $1 AND ci.user_id = $2
      `;
      const { rows } = await db.query(query, [id, userId]);
      const cartItem = rows[0];

      if (!cartItem) {
        return res.status(404).json({ message: 'Cart item not found' });
      }

      // 2. Check stock availability
      if (cartItem.stock_quantity < quantity) {
        return res.status(400).json({
          message: `Insufficient product quantity. Only ${cartItem.stock_quantity} available.`
        });
      }

      // 3. Update cart item
      const updateQuery = `
        UPDATE cart_items 
        SET quantity = $1, updated_at = NOW() 
        WHERE id = $2 AND user_id = $3
        RETURNING *
      `;
      const { rows: updatedRows } = await db.query(updateQuery, [quantity, id, userId]);
      const updatedItem = updatedRows[0];

      res.status(200).json({
        message: 'Cart item updated successfully',
        data: updatedItem
      });

    } else if (req.method === 'DELETE') {
      // Remove item from cart
      console.log('🗑️ Removing cart item (Neon):', id, 'for user:', userId);

      const query = 'DELETE FROM cart_items WHERE id = $1 AND user_id = $2 RETURNING id';
      const { rows } = await db.query(query, [id, userId]);

      if (rows.length === 0) {
        return res.status(404).json({ message: 'Cart item not found or already removed' });
      }

      res.status(200).json({
        message: 'Cart item removed successfully'
      });

    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Cart item API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
