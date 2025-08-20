const { supabaseAdmin } = require('../../lib/supabase')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

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
    if (req.method === 'GET') {
      // Get user profile
      const { data: userProfile, error } = await supabaseAdmin
        .from('users')
        .select('id, email, first_name, last_name, address, city, state, zip_code, phone, role, created_at')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        return res.status(500).json({ message: 'Failed to fetch user profile' })
      }

      res.status(200).json({
        message: 'User profile retrieved successfully',
        data: userProfile
      })

    } else if (req.method === 'PUT') {
      // Update user profile
      const { 
        first_name, 
        last_name, 
        address, 
        city, 
        state, 
        zip_code, 
        phone, 
        current_password, 
        new_password 
      } = req.body

      // If changing password, verify current password
      if (new_password) {
        if (!current_password) {
          return res.status(400).json({ 
            message: 'Current password is required to change password' 
          })
        }

        // Get current user data with password
        const { data: currentUser, error: userError } = await supabaseAdmin
          .from('users')
          .select('password')
          .eq('id', user.id)
          .single()

        if (userError || !currentUser) {
          return res.status(404).json({ message: 'User not found' })
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(current_password, currentUser.password)
        if (!isValidPassword) {
          return res.status(400).json({ message: 'Current password is incorrect' })
        }

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(new_password, 10)

        // Update user with new password
        const { data: updatedUser, error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            first_name: first_name || undefined,
            last_name: last_name || undefined,
            address: address || undefined,
            city: city || undefined,
            state: state || undefined,
            zip_code: zip_code || undefined,
            phone: phone || undefined,
            password: hashedNewPassword
          })
          .eq('id', user.id)
          .select('id, email, first_name, last_name, address, city, state, zip_code, phone, role')
          .single()

        if (updateError) {
          console.error('Error updating user profile:', updateError)
          return res.status(500).json({ message: 'Failed to update user profile' })
        }

        res.status(200).json({
          message: 'User profile and password updated successfully',
          data: updatedUser
        })
      } else {
        // Update user without password change
        const { data: updatedUser, error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            first_name: first_name || undefined,
            last_name: last_name || undefined,
            address: address || undefined,
            city: city || undefined,
            state: state || undefined,
            zip_code: zip_code || undefined,
            phone: phone || undefined
          })
          .eq('id', user.id)
          .select('id, email, first_name, last_name, address, city, state, zip_code, phone, role')
          .single()

        if (updateError) {
          console.error('Error updating user profile:', updateError)
          return res.status(500).json({ message: 'Failed to update user profile' })
        }

        res.status(200).json({
          message: 'User profile updated successfully',
          data: updatedUser
        })
      }

    } else {
      res.status(405).json({ message: 'Method not allowed' })
    }

  } catch (error) {
    console.error('User profile API error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
