const { createClient } = require('@supabase/supabase-js')
const jwt = require('jsonwebtoken')

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

// JWT secret for token verification
const JWT_SECRET = process.env.JWT_SECRET

// Helper function to verify JWT token and check admin role
function verifyAdminToken(req) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    
    // Check if user has admin role
    if (decoded.role !== 'admin') {
      return null
    }
    
    return decoded
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Verify admin access
  const adminUser = verifyAdminToken(req)
  if (!adminUser) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    })
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    })
  }

  try {
    console.log('📊 Admin fetching dashboard statistics...')

    // Get total products
    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })

    // Get total orders
    const { count: totalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })

    // Get total customers
    const { count: totalCustomers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer')

    // Get total revenue
    const { data: revenueData } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('status', 'completed')

    const totalRevenue = revenueData?.reduce((sum, order) => sum + order.total_amount, 0) || 0

    // Get recent orders
    const { data: recentOrders } = await supabase
      .from('orders')
      .select(`
        *,
        users (
          email,
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    // Get low stock products
    const { data: lowStockProducts } = await supabase
      .from('products')
      .select('*')
      .lt('quantity', 10)
      .order('quantity', { ascending: true })
      .limit(5)

    console.log('✅ Dashboard statistics fetched successfully')

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          totalProducts: totalProducts || 0,
          totalOrders: totalOrders || 0,
          totalCustomers: totalCustomers || 0,
          totalRevenue: totalRevenue
        },
        recentOrders: recentOrders || [],
        lowStockProducts: lowStockProducts || []
      }
    })

  } catch (error) {
    console.error('Admin dashboard API error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    })
  }
}
