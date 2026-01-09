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

  try {
    console.log('🔍 Orders API - User from JWT:', user);
    const userId = user.userId || user.id; // User ID from JWT (handle both formats)

    // Check if user exists in database
    const userCheckQuery = 'SELECT id, email, role FROM users WHERE id = $1';
    const { rows: userRows } = await db.query(userCheckQuery, [userId]);
    const existingUser = userRows[0];

    if (!existingUser) {
      console.error('❌ User not found in database. JWT user ID:', userId);
      return res.status(400).json({
        message: 'User account not found. Please log in again.',
        error: 'USER_NOT_FOUND'
      });
    }

    if (req.method === 'GET') {
      console.log('🔍 Fetching orders for user:', userId);

      // Build Query with JOINs and JSON aggregation
      let queryText = `
        SELECT 
          o.*, 
          u.email as user_email, u.first_name, u.last_name,
          COALESCE(
            json_agg(
              json_build_object(
                'id', oi.id,
                'product_id', oi.product_id,
                'quantity', oi.quantity,
                'price', oi.price,
                'product', json_build_object(
                  'id', p.id, 
                  'name', p.name, 
                  'image_url', p.image_url
                )
              )
            ) FILTER (WHERE oi.id IS NOT NULL), 
            '[]'
          ) as order_items
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE 1=1
      `;

      const queryParams = [];
      let paramCount = 1;

      // Filter by user role
      if (existingUser.role !== 'admin') {
        queryText += ` AND o.user_id = $${paramCount}`;
        queryParams.push(userId);
        paramCount++;
      }

      queryText += ` GROUP BY o.id, u.id ORDER BY o.created_at DESC`;

      const { rows: orders } = await db.query(queryText, queryParams);

      console.log(`✅ Successfully fetched ${orders.length} orders`);
      res.status(200).json({
        message: 'Orders retrieved successfully',
        data: orders
      });

    } else if (req.method === 'POST') {
      // Create new order
      console.log('=== ORDER CREATION REQUEST (Neon) ===');
      const {
        shipping_address,
        payment_method,
        items
      } = req.body;

      if (!shipping_address || !payment_method || !items || items.length === 0) {
        return res.status(400).json({
          message: 'Shipping address, payment method, and items are required'
        });
      }

      const client = await db.pool.connect();

      try {
        await client.query('BEGIN'); // Start Transaction

        // 1. Create Order
        const insertOrderQuery = `
          INSERT INTO orders (user_id, total_amount, status, shipping_address, payment_method, created_at)
          VALUES ($1, 0, 'pending', $2, $3, NOW())
          RETURNING id
        `;
        const { rows: orderRows } = await client.query(insertOrderQuery, [userId, shipping_address, payment_method]);
        const orderId = orderRows[0].id;
        console.log('📝 Created Order ID:', orderId);

        // 2. Process Items
        let totalAmount = 0;
        const processedItems = [];

        for (const item of items) {
          // Check Product Stock & Price
          const productQuery = 'SELECT id, price, quantity FROM products WHERE id = $1 FOR UPDATE';
          const { rows: productRows } = await client.query(productQuery, [item.product_id]);
          const product = productRows[0];

          if (!product) {
            throw new Error(`Product with ID ${item.product_id} not found`);
          }

          if (product.quantity < item.quantity) {
            throw new Error(`Insufficient quantity for product ID ${item.product_id}`);
          }

          const itemTotal = parseFloat(product.price) * item.quantity;
          totalAmount += itemTotal;

          // Insert Order Item
          const insertItemQuery = `
            INSERT INTO order_items (order_id, product_id, quantity, price)
            VALUES ($1, $2, $3, $4)
          `;
          await client.query(insertItemQuery, [orderId, item.product_id, item.quantity, product.price]);

          // Update Product Stock
          const updateStockQuery = `
            UPDATE products SET quantity = quantity - $1 WHERE id = $2
          `;
          await client.query(updateStockQuery, [item.quantity, item.product_id]);
        }

        // 3. Update Order Total
        const updateOrderTotalQuery = `
          UPDATE orders SET total_amount = $1 WHERE id = $2 RETURNING *
        `;
        const { rows: updatedOrderRows } = await client.query(updateOrderTotalQuery, [totalAmount, orderId]);

        // 4. Clear Cart
        await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

        await client.query('COMMIT'); // Commit Transaction

        console.log('✅ Order created successfully with items and stock updates');
        res.status(201).json({
          message: 'Order created successfully',
          data: updatedOrderRows[0],
          order_id: orderId
        });

      } catch (err) {
        await client.query('ROLLBACK'); // Rollback on error
        console.error('❌ Order creation failed (Rollback):', err.message);
        return res.status(500).json({
          message: 'Failed to create order',
          error: err.message
        });
      } finally {
        client.release();
      }

    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Orders API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
