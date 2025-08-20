const { createClient } = require('@supabase/supabase-js')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// JWT secret for token verification
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Helper function to verify JWT token and check admin role
function verifyAdminToken(req) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    
    // Check if user has admin role (you may need to adjust this based on your user structure)
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
  // CORS is handled by dev-server middleware

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
      // Get all users
      console.log('🔍 Admin fetching all users...')
      
      const { data: users, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role, status, created_at, approved_at, phone, address')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching users:', error)
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch users',
          error: error.message
        })
      }

      console.log(`✅ Successfully fetched ${users.length} users`)
      
      return res.status(200).json({
        success: true,
        data: users,
        count: users.length
      })

    } else if (req.method === 'POST') {
      // Create new user
      const { email, password, first_name, last_name, role = 'customer' } = req.body

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        })
      }

      console.log('👤 Admin creating new user:', email)

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10)

      const { data: user, error } = await supabase
        .from('users')
        .insert([{
          email,
          password: hashedPassword,
          first_name,
          last_name,
          role
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating user:', error)
        return res.status(500).json({
          success: false,
          message: 'Failed to create user',
          error: error.message
        })
      }

      console.log('✅ User created successfully:', user.id)

      return res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user
      })

    } else if (req.method === 'PUT') {
      // Update user
      const { id, email, first_name, last_name, role } = req.body

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        })
      }

      console.log('📝 Admin updating user:', id)

      const updateData = {}
      if (email) updateData.email = email
      if (first_name) updateData.first_name = first_name
      if (last_name) updateData.last_name = last_name
      if (role) updateData.role = role

      const { data: user, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating user:', error)
        return res.status(500).json({
          success: false,
          message: 'Failed to update user',
          error: error.message
        })
      }

      console.log('✅ User updated successfully:', user.id)

      return res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: user
      })

    } else if (req.method === 'DELETE') {
      // Delete user
      const userId = req.query.id || req.body.id

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        })
      }

      console.log('🗑️ Admin deleting user:', userId)

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (error) {
        console.error('Error deleting user:', error)
        return res.status(500).json({
          success: false,
          message: 'Failed to delete user',
          error: error.message
        })
      }

      console.log('✅ User deleted successfully:', userId)

      return res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      })

    } else {
      return res.status(405).json({
        success: false,
        message: 'Method not allowed'
      })
    }

  } catch (error) {
    console.error('Admin users API error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    })
  }
}
