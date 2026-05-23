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

  try {
    if (req.method === 'GET') {
      // Get cart items for user
      const user = verifyToken(req)
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' })
      }

      const { data: cartItems, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          products (
            id,
            name,
            price,
            image_url,
            quantity as stock_quantity
          )
        `)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error fetching cart:', error)
        return res.status(500).json({ message: 'Failed to fetch cart' })
      }

      return res.status(200).json({
        message: 'Cart retrieved successfully',
        data: cartItems || []
      })

    } else if (req.method === 'POST') {
      // Add item to cart
      const user = verifyToken(req)
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' })
      }

      const { product_id, quantity = 1 } = req.body

      if (!product_id) {
        return res.status(400).json({ message: 'Product ID is required' })
      }

      // Check if item already exists in cart
      const { data: existingItem } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', product_id)
        .single()

      if (existingItem) {
        // Update quantity
        const { data: updatedItem, error } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + parseInt(quantity) })
          .eq('id', existingItem.id)
          .select()
          .single()

        if (error) {
          console.error('Error updating cart item:', error)
          return res.status(500).json({ message: 'Failed to update cart item' })
        }

        return res.status(200).json({
          message: 'Cart item updated successfully',
          data: updatedItem
        })
      } else {
        // Add new item
        const { data: newItem, error } = await supabase
          .from('cart_items')
          .insert([{
            user_id: user.id,
            product_id: parseInt(product_id),
            quantity: parseInt(quantity)
          }])
          .select()
          .single()

        if (error) {
          console.error('Error adding cart item:', error)
          return res.status(500).json({ message: 'Failed to add cart item' })
        }

        return res.status(201).json({
          message: 'Item added to cart successfully',
          data: newItem
        })
      }

    } else if (req.method === 'PUT') {
      // Update cart item quantity
      const user = verifyToken(req)
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' })
      }

      const { id, quantity } = req.body

      if (!id || quantity < 0) {
        return res.status(400).json({ message: 'Valid item ID and quantity are required' })
      }

      if (quantity === 0) {
        // Remove item if quantity is 0
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id)

        if (error) {
          console.error('Error removing cart item:', error)
          return res.status(500).json({ message: 'Failed to remove cart item' })
        }

        return res.status(200).json({ message: 'Item removed from cart' })
      } else {
        // Update quantity
        const { data: updatedItem, error } = await supabase
          .from('cart_items')
          .update({ quantity: parseInt(quantity) })
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single()

        if (error) {
          console.error('Error updating cart item:', error)
          return res.status(500).json({ message: 'Failed to update cart item' })
        }

        return res.status(200).json({
          message: 'Cart item updated successfully',
          data: updatedItem
        })
      }

    } else if (req.method === 'DELETE') {
      // Clear cart or remove specific item
      const user = verifyToken(req)
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' })
      }

      const { id } = req.query

      if (id) {
        // Remove specific item
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id)

        if (error) {
          console.error('Error removing cart item:', error)
          return res.status(500).json({ message: 'Failed to remove cart item' })
        }

        return res.status(200).json({ message: 'Item removed from cart' })
      } else {
        // Clear entire cart
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.id)

        if (error) {
          console.error('Error clearing cart:', error)
          return res.status(500).json({ message: 'Failed to clear cart' })
        }

        return res.status(200).json({ message: 'Cart cleared successfully' })
      }

    } else {
      return res.status(405).json({ message: 'Method not allowed' })
    }

  } catch (error) {
    console.error('Cart API error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
