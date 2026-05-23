const { createClient } = require('@supabase/supabase-js')
const jwt = require('jsonwebtoken')

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

// Helper function to verify JWT token
function verifyToken(req) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  
  const token = authHeader.substring(7)
  try {
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch (error) {
    return null
  }
}

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const user = verifyToken(req)
  if (!user) {
    return res.status(401).json({ message: 'Authentication required' })
  }

  try {
    if (req.method === 'GET') {
      // Get user's orders
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (
              id,
              name,
              price,
              image_url
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching orders:', error)
        return res.status(500).json({ message: 'Failed to fetch orders' })
      }

      return res.status(200).json({
        message: 'Orders retrieved successfully',
        data: orders || []
      })

    } else if (req.method === 'POST') {
      // Create new order from cart
      const { shipping_address, payment_method = 'pending' } = req.body

      if (!shipping_address) {
        return res.status(400).json({ message: 'Shipping address is required' })
      }

      // Get cart items
      const { data: cartItems, error: cartError } = await supabase
        .from('cart_items')
        .select(`
          *,
          products (
            id,
            name,
            price,
            quantity as stock_quantity
          )
        `)
        .eq('user_id', user.id)

      if (cartError || !cartItems || cartItems.length === 0) {
        return res.status(400).json({ message: 'Cart is empty' })
      }

      // Calculate total
      const total_amount = cartItems.reduce((sum, item) => {
        return sum + (item.products.price * item.quantity)
      }, 0)

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id: user.id,
          total_amount,
          status: 'pending',
          shipping_address,
          payment_method
        }])
        .select()
        .single()

      if (orderError) {
        console.error('Error creating order:', orderError)
        return res.status(500).json({ message: 'Failed to create order' })
      }

      // Create order items
      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.products.price
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        console.error('Error creating order items:', itemsError)
        return res.status(500).json({ message: 'Failed to create order items' })
      }

      // Clear cart
      await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)

      return res.status(201).json({
        message: 'Order created successfully',
        data: order,
        order_id: order.id
      })

    } else {
      return res.status(405).json({ message: 'Method not allowed' })
    }

  } catch (error) {
    console.error('Orders API error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
