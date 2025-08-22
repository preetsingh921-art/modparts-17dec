const { supabaseAdmin } = require('../../lib/supabase')
const jwt = require('jsonwebtoken')
const { sendWelcomeEmail } = require('../../lib/emailService')

module.exports = async function handler(req, res) {
  console.log('🔍 Email verification API called')
  console.log('Request method:', req.method)
  console.log('Request query:', req.query)

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { token } = req.query

    if (!token) {
      return res.status(400).json({ 
        message: 'Verification token is required' 
      })
    }

    // Find user with this verification token
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, role, email_verified, email_verification_expires')
      .eq('email_verification_token', token)
      .single()

    if (error || !user) {
      console.error('User not found with token:', token)
      return res.status(400).json({ 
        message: 'Invalid verification token' 
      })
    }

    // Check if already verified
    if (user.email_verified) {
      console.log('User already verified:', user.email)
      return res.status(200).json({ 
        message: 'Email already verified',
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          email_verified: true
        },
        already_verified: true
      })
    }

    // Check if token has expired
    const now = new Date()
    const expiresAt = new Date(user.email_verification_expires)
    
    if (now > expiresAt) {
      console.log('Verification token expired for user:', user.email)
      return res.status(400).json({ 
        message: 'Verification token has expired. Please request a new verification email.',
        expired: true
      })
    }

    // Update user as verified, activate account, and clear verification fields
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        email_verified: true,
        status: 'active', // Automatically activate user after email verification
        email_verification_token: null,
        email_verification_expires: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating user verification status:', updateError)
      return res.status(500).json({ message: 'Failed to verify email' })
    }

    console.log('✅ Email verified successfully for user:', user.email)

    // Send welcome email
    try {
      await sendWelcomeEmail(user.email, user.first_name)
      console.log('✅ Welcome email sent successfully')
    } catch (emailError) {
      console.error('❌ Failed to send welcome email:', emailError)
      // Don't fail verification if welcome email fails
    }

    // Generate JWT token for the verified user
    const jwtToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    )

    console.log('🔑 JWT token generated for verified user')

    res.status(200).json({
      message: 'Email verified successfully! Welcome to Sardaarji Auto Parts.',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        email_verified: true
      },
      token: jwtToken,
      verified: true
    })

  } catch (error) {
    console.error('❌ Email verification error:', error)
    res.status(500).json({
      message: 'Internal server error during email verification',
      error: error.message
    })
  }
}
