const { supabase, supabaseAdmin } = require('../../lib/supabase')
const jwt = require('jsonwebtoken')

// Helper function to verify JWT token
function verifyToken(req) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  
  const token = authHeader.substring(7)
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret')
  } catch (error) {
    return null
  }
}

module.exports = async function handler(req, res) {
  // CORS is handled by dev-server middleware

  // Verify authentication
  const user = verifyToken(req)
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    console.log('🔍 Orders API - User from JWT:', user)

    // Check if user exists in database
    // User IDs are UUIDs (strings), so use them as-is
    const userId = user.id;

    const { data: existingUser, error: userCheckError } = await supabaseAdmin
      .from('users')
      .select('id, email, role')
      .eq('id', userId)
      .single()

    console.log('🔍 Database user check result:', { existingUser, userCheckError })

    if (userCheckError) {
      console.error('❌ User not found in database. JWT user ID:', user.id, 'Type:', typeof user.id)
      console.error('❌ Database error:', userCheckError)

      // Instead of creating a user, return a more helpful error
      return res.status(400).json({
        message: 'User account not found. Please log in again.',
        error: 'USER_NOT_FOUND',
        details: 'The user ID from your session does not exist in the database. Please log out and log in again.',
        debug: {
          userId: user.id,
          userIdType: typeof user.id,
          error: userCheckError.message
        }
      })
    }
    if (req.method === 'GET') {
      // Get orders - simplified query to avoid foreign key relationship issues
      console.log('🔍 Fetching orders for user:', user.id)

      let query = supabaseAdmin
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      // If not admin, only show user's own orders
      if (user.role !== 'admin') {
        query = query.eq('user_id', userId)
      }

      const { data: orders, error } = await query

      if (error) {
        console.error('Error fetching orders:', error)
        return res.status(500).json({ message: 'Failed to fetch orders' })
      }

      // Use optimized query with joins to fetch all data at once
      console.log('🚀 Using optimized query with joins for better performance')

      let enrichedQuery = supabaseAdmin
        .from('orders')
        .select(`
          *,
          users!orders_user_id_fkey (
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
              image_url
            )
          )
        `)
        .order('created_at', { ascending: false })

      // If not admin, only show user's own orders
      if (user.role !== 'admin') {
        enrichedQuery = enrichedQuery.eq('user_id', userId)
      }

      const { data: enrichedOrders, error: enrichedError } = await enrichedQuery

      if (enrichedError) {
        console.error('❌ Error with optimized query, falling back to basic orders:', enrichedError)
        // Fallback to basic orders if join fails
        const fallbackOrders = orders?.map(order => ({
          ...order,
          user: null,
          order_items: []
        })) || []

        console.log(`✅ Fallback: fetched ${fallbackOrders.length} basic orders`)
        res.status(200).json({
          success: true,
          data: fallbackOrders
        })
        return
      }

      console.log(`✅ Successfully fetched ${enrichedOrders.length} orders`)
      res.status(200).json({
        message: 'Orders retrieved successfully',
        data: enrichedOrders
      })

    } else if (req.method === 'POST') {
      // Create new order
      console.log('=== ORDER CREATION REQUEST ===')
      console.log('Request body:', req.body)
      console.log('User:', user)

      const {
        shipping_address,
        payment_method,
        items,
        payment_status,
        transaction_id,
        reference_number,
        order_number,
        first_name,
        last_name,
        email,
        city,
        state,
        zip_code,
        phone
      } = req.body

      console.log('Extracted fields:', {
        shipping_address,
        payment_method,
        items: items?.length,
        payment_status,
        transaction_id,
        reference_number,
        order_number,
        first_name,
        last_name,
        email,
        city,
        state,
        zip_code,
        phone
      })

      // Note: Additional fields like payment_status, transaction_id, etc. are received from frontend
      // but not stored in the current database schema. Only core order fields are stored.

      if (!shipping_address || !payment_method || !items || items.length === 0) {
        console.log('Validation failed:', { shipping_address: !!shipping_address, payment_method: !!payment_method, items: items?.length })
        return res.status(400).json({
          message: 'Shipping address, payment method, and items are required'
        })
      }

      // Start a transaction
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert([
          {
            user_id: userId, // Use the properly typed user ID
            total_amount: 0, // Will be calculated
            status: 'pending',
            shipping_address,
            payment_method
          }
        ])
        .select()
        .single()

      if (orderError) {
        console.error('Error creating order:', orderError)
        console.error('Order data that failed:', {
          user_id: userId,
          original_user_id: user.id,
          user_id_type: typeof userId,
          shipping_address,
          payment_method
        })
        return res.status(500).json({
          message: 'Failed to create order',
          error: orderError.message,
          debug: {
            userId: userId,
            originalUserId: user.id,
            userIdType: typeof userId
          }
        })
      }

      // Add order items and calculate total
      let totalAmount = 0
      const orderItems = []

      for (const item of items) {
        // Get current product price and check availability
        const { data: product, error: productError } = await supabaseAdmin
          .from('products')
          .select('id, price, quantity')
          .eq('id', item.product_id)
          .single()

        if (productError || !product) {
          // Rollback by deleting the order
          await supabaseAdmin.from('orders').delete().eq('id', order.id)
          return res.status(404).json({
            message: `Product with ID ${item.product_id} not found`
          })
        }

        if (product.quantity < item.quantity) {
          // Rollback by deleting the order
          await supabaseAdmin.from('orders').delete().eq('id', order.id)
          return res.status(400).json({
            message: `Insufficient quantity for product ID ${item.product_id}`
          })
        }

        const itemTotal = product.price * item.quantity
        totalAmount += itemTotal

        orderItems.push({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: product.price
        })

        // Update product quantity
        await supabaseAdmin
          .from('products')
          .update({ quantity: product.quantity - item.quantity })
          .eq('id', item.product_id)
      }

      // Insert order items
      const { error: itemsError } = await supabaseAdmin
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        console.error('Error creating order items:', itemsError)
        // Rollback by deleting the order
        await supabaseAdmin.from('orders').delete().eq('id', order.id)
        return res.status(500).json({ message: 'Failed to create order items' })
      }

      // Update order total
      const { data: updatedOrder, error: updateError } = await supabaseAdmin
        .from('orders')
        .update({ total_amount: totalAmount })
        .eq('id', order.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating order total:', updateError)
        return res.status(500).json({ message: 'Failed to update order total' })
      }

      // Clear user's cart
      await supabaseAdmin
        .from('cart_items')
        .delete()
        .eq('user_id', userId)

      res.status(201).json({
        message: 'Order created successfully',
        data: updatedOrder,
        order_id: updatedOrder.id
      })

    } else {
      res.status(405).json({ message: 'Method not allowed' })
    }

  } catch (error) {
    console.error('Orders API error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
