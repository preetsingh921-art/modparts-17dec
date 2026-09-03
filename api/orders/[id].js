const db = require('../../lib/db');
const { verifyToken, isSuperAdmin } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  // Verify authentication
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const userId = user.userId || user.id;
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ success: false, message: 'Order ID is required' });
  }

  try {
    if (req.method === 'GET') {
      console.log(`🔍 Fetching order detail for ID: ${id}, requested by user: ${userId} (${user.role})`);

      // Query order with items and product details
      const query = `
        SELECT 
          o.*,
          u.email as user_email,
          u.first_name,
          u.last_name,
          u.phone as user_phone,
          COALESCE(
            json_agg(
              json_build_object(
                'id', oi.id,
                'product_id', oi.product_id,
                'quantity', oi.quantity,
                'price', oi.price,
                'product_name', p.name,
                'part_number', p.part_number,
                'image_url', p.image_url,
                'product', json_build_object(
                  'id', p.id,
                  'name', p.name,
                  'part_number', p.part_number,
                  'image_url', p.image_url,
                  'price', p.price
                )
              )
            ) FILTER (WHERE oi.id IS NOT NULL),
            '[]'
          ) as items
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE o.id = $1
        GROUP BY o.id, u.email, u.first_name, u.last_name, u.phone
      `;

      const { rows } = await db.query(query, [id]);

      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      const order = rows[0];

      // Access control: customer can only view their own order
      const isAdmin = user.role === 'admin' || user.role === 'superadmin';
      if (!isAdmin && String(order.user_id) !== String(userId)) {
        return res.status(403).json({ success: false, message: 'Access denied to this order' });
      }

      return res.status(200).json({
        success: true,
        data: order
      });

    } else {
      return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Order Detail API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
