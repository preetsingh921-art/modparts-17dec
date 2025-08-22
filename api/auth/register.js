const { supabaseAdmin } = require('../../lib/supabase')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { isRecaptchaValid } = require('../../lib/recaptcha-verify')
const { getRateLimiter } = require('../../lib/rate-limiter')

// Email verification is optional - only load if nodemailer is available
let emailService = null
try {
  emailService = require('../../lib/emailService')
} catch (error) {
  console.log('📧 Email service not available - email verification disabled')
}

module.exports = async function handler(req, res) {
  // CORS is handled by dev-server middleware
  console.log('🔍 Registration API called')
  console.log('Request method:', req.method)
  console.log('Request body:', req.body)

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { email, password, first_name, last_name, phone, address, recaptchaToken } = req.body

    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({
        message: 'Email, password, first name, and last name are required'
      })
    }

    // Verify reCAPTCHA
    console.log('🔐 Verifying reCAPTCHA for registration...')
    const recaptchaValid = await isRecaptchaValid(recaptchaToken, {
      minScore: 0.5,
      allowedActions: ['register']
    })

    if (!recaptchaValid) {
      console.log('❌ reCAPTCHA verification failed for registration')
      return res.status(400).json({
        message: 'reCAPTCHA verification failed. Please try again.',
        code: 'RECAPTCHA_FAILED'
      })
    }

    console.log('✅ reCAPTCHA verification successful for registration')

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Prepare user data with admin approval system
    const userData = {
      email,
      password: hashedPassword,
      first_name,
      last_name,
      phone: phone || null,
      address: address || null,
      role: 'customer',
      status: 'pending_verification', // New users need email verification
      email_verified: false, // Require email verification
      created_at: new Date().toISOString()
    }

    // Create user in Supabase using admin client to bypass RLS
    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert([userData])
      .select()
      .single()

    if (error) {
      console.error('❌ Registration error:', error)
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return res.status(500).json({
        message: 'Failed to create user',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }

    console.log('✅ User created successfully:', { id: newUser.id, email: newUser.email })

    // Don't generate JWT token - user needs admin approval first
    console.log('✅ Registration completed - pending admin approval')

    res.status(201).json({
      message: 'Registration successful! Your account is pending admin approval. You will be notified once approved.',
      user: {
        id: newUser.id,
        email: newUser.email,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        role: newUser.role,
        status: 'pending_verification'
      },
      verification_required: true
    })

  } catch (error) {
    console.error('❌ Registration error:', error)
    console.error('❌ Error stack:', error.stack)
    console.error('❌ Error message:', error.message)
    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}
