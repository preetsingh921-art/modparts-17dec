const db = require('../../lib/db');
const jwt = require('jsonwebtoken');

// JWT secret for token verification
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper function to verify JWT token and check admin role
function verifyAdminToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if user has admin role
    if (decoded.role !== 'admin') {
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

module.exports = async (req, res) => {
  // CORS is handled by dev-server middleware

  // Verify admin access
  const adminUser = verifyAdminToken(req);
  if (!adminUser) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  try {
    if (req.method === 'GET') {
      // Get all orders with user information
      console.log('📋 Admin fetching all orders (Neon)...');

      const query = `
        SELECT 
          o.*,
          u.id as user_db_id, u.email as user_email, u.first_name, u.last_name, u.phone as user_phone,
          COALESCE(
            json_agg(
              json_build_object(
                'id', oi.id,
                'product_id', oi.product_id,
                'quantity', oi.quantity,
                'price', oi.price,
                'product', json_build_object('id', p.id, 'name', p.name, 'image_url', p.image_url)
              )
            ) FILTER (WHERE oi.id IS NOT NULL),
            '[]'
          ) as order_items
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id
        GROUP BY o.id, u.id
        ORDER BY o.created_at DESC
      `;

      const { rows: orders } = await db.query(query);

      // Format response for frontend compatibility
      const ordersWithUsers = orders.map(order => ({
        ...order,
        user: {
          id: order.user_db_id,
          email: order.user_email,
          first_name: order.first_name,
          last_name: order.last_name,
          phone: order.user_phone
        },
        customer_name: `${order.first_name || ''} ${order.last_name || ''}`.trim() || 'Unknown Customer',
        customer_email: order.user_email || 'No email provided',
        customer_phone: order.user_phone || null
      }));

      console.log(`✅ Successfully fetched ${ordersWithUsers.length} orders from Neon`);

      return res.status(200).json({
        success: true,
        data: ordersWithUsers,
        count: ordersWithUsers.length
      });

    } else if (req.method === 'PUT') {
      // Update order status
      const { id, status } = req.body;

      if (!id || !status) {
        return res.status(400).json({
          success: false,
          message: 'Order ID and status are required'
        });
      }

      console.log('📝 Admin updating order status:', id, 'to', status);

      const updateQuery = `
        UPDATE orders 
        SET status = $1, updated_at = NOW() 
        WHERE id = $2 
        RETURNING *
      `;

      const { rows } = await db.query(updateQuery, [status, id]);

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      const order = rows[0];
      console.log('✅ Order updated successfully:', order.id);

      return res.status(200).json({
        success: true,
        message: 'Order updated successfully',
        data: order
      });

    } else if (req.method === 'DELETE') {
      // Delete order
      const orderId = req.query.id || req.body.id;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Order ID is required'
        });
      }

      console.log('🗑️ Admin deleting order:', orderId);

      // Use transaction to delete order items first, then order
      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');

        // Delete order items first
        await client.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);

        // Delete the order
        await client.query('DELETE FROM orders WHERE id = $1', [orderId]);

        await client.query('COMMIT');

        console.log('✅ Order deleted successfully:', orderId);

        return res.status(200).json({
          success: true,
          message: 'Order deleted successfully'
        });

      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

    } else {
      return res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Admin orders API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
