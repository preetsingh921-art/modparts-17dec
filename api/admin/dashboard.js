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

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed. Only GET requests are supported.'
    });
  }

  // Verify admin access
  const adminUser = verifyAdminToken(req);
  if (!adminUser) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  try {
    console.log('📊 Admin fetching dashboard data (Neon)...');

    // Get counts and stats using parallel queries
    const [
      productsResult,
      ordersResult,
      customersResult,
      revenueResult,
      recentOrdersResult,
      ordersByStatusResult,
      lowStockResult,
      inventoryStockResult,
      distinctPartsResult
    ] = await Promise.all([
      // Total products (distinct count)
      db.query('SELECT COUNT(*) FROM products'),
      // Total orders
      db.query('SELECT COUNT(*) FROM orders'),
      // Total customers (users with role 'customer')
      db.query("SELECT COUNT(*) FROM users WHERE role = 'customer'"),
      // Total revenue
      db.query('SELECT SUM(total_amount) as total FROM orders'),
      // Recent orders with user information
      db.query(`
        SELECT 
          o.id, o.total_amount, o.status, o.created_at,
          u.email, u.first_name, u.last_name
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
        LIMIT 5
      `),
      // Orders by status
      db.query('SELECT status, COUNT(*) as count FROM orders GROUP BY status'),
      // Low stock products
      db.query(`
        SELECT id, name, quantity 
        FROM products 
        WHERE quantity <= 5 
        ORDER BY quantity ASC 
        LIMIT 5
      `),
      // Full stock - total quantity of all items (including duplicates)
      db.query('SELECT COALESCE(SUM(quantity), 0) as full_stock FROM products'),
      // Distinct parts count
      db.query('SELECT COUNT(DISTINCT part_number) as distinct_parts FROM products')
    ]);

    // Process results
    const totalProducts = parseInt(productsResult.rows[0].count) || 0;
    const totalOrders = parseInt(ordersResult.rows[0].count) || 0;
    const totalCustomers = parseInt(customersResult.rows[0].count) || 0;
    const totalRevenue = parseFloat(revenueResult.rows[0].total) || 0;
    const fullStock = parseInt(inventoryStockResult.rows[0].full_stock) || 0;
    const distinctParts = parseInt(distinctPartsResult.rows[0].distinct_parts) || 0;

    // Format recent orders for frontend
    const recentOrders = recentOrdersResult.rows.map(order => ({
      id: order.id,
      total_amount: order.total_amount,
      status: order.status,
      created_at: order.created_at,
      users: {
        email: order.email,
        first_name: order.first_name,
        last_name: order.last_name
      }
    }));

    // Format orders by status
    const ordersStatusCounts = {};
    ordersByStatusResult.rows.forEach(row => {
      ordersStatusCounts[row.status] = parseInt(row.count);
    });

    const dashboardData = {
      total_products: totalProducts,
      total_orders: totalOrders,
      total_customers: totalCustomers,
      total_revenue: totalRevenue,
      orders_by_status: ordersStatusCounts,
      recent_orders: recentOrders,
      low_stock: lowStockResult.rows,
      full_stock: fullStock,
      distinct_parts: distinctParts
    };

    console.log('✅ Dashboard data fetched successfully from Neon');

    return res.status(200).json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Admin dashboard API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
