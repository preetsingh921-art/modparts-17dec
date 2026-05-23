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

  try {
    if (req.method === 'GET') {
      // Get all orders with user information
      console.log('📦 Admin fetching all orders...')
      
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          users (
            id,
            email,
            first_name,
            last_name
          ),
          order_items (
            *,
            products (
              id,
              name,
              price
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching orders:', error)
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch orders',
          error: error.message
        })
      }

      console.log(`✅ Successfully fetched ${orders.length} orders`)
      
      return res.status(200).json({
        success: true,
        data: orders,
        count: orders.length
      })

    } else if (req.method === 'PUT') {
      // Update order status
      const { id, status } = req.body

      if (!id || !status) {
        return res.status(400).json({
          success: false,
          message: 'Order ID and status are required'
        })
      }

      console.log('📝 Admin updating order status:', id, 'to', status)

      const { data: order, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating order:', error)
        return res.status(500).json({
          success: false,
          message: 'Failed to update order',
          error: error.message
        })
      }

      console.log('✅ Order status updated successfully:', order.id)

      return res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        data: order
      })

    } else if (req.method === 'DELETE') {
      // Delete order
      const orderId = req.query.id || req.body.id

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Order ID is required'
        })
      }

      console.log('🗑️ Admin deleting order:', orderId)

      // Delete order items first (due to foreign key constraint)
      await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId)

      // Then delete the order
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)

      if (error) {
        console.error('Error deleting order:', error)
        return res.status(500).json({
          success: false,
          message: 'Failed to delete order',
          error: error.message
        })
      }

      console.log('✅ Order deleted successfully:', orderId)

      return res.status(200).json({
        success: true,
        message: 'Order deleted successfully'
      })

    } else {
      return res.status(405).json({
        success: false,
        message: 'Method not allowed'
      })
    }

  } catch (error) {
    console.error('Admin orders API error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    })
  }
}
