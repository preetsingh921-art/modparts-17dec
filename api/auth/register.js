const { supabaseAdmin } = require('../../lib/supabase')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { getRateLimiter } = require('../../lib/rate-limiter')
const { validatePassword } = require('../../lib/passwordValidator')

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
    const { email, password, first_name, last_name, phone, address } = req.body

    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({
        message: 'Email, password, first name, and last name are required'
      })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: 'Please enter a valid email address'
      })
    }

    // Validate password strength
    const passwordValidation = validatePassword(password, {
      firstName: first_name,
      lastName: last_name,
      email: email,
      phone: phone
    })

    if (!passwordValidation.isValid) {
      return res.status(400).json({
        message: 'Password does not meet security requirements',
        errors: passwordValidation.errors,
        requirements: passwordValidation.requirements
      })
    }

    console.log('✅ Password validation passed:', passwordValidation.strength)



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

    console.log('✅ Password hashed successfully')

    // Generate email verification token if email service is available
    let verificationToken = null
    let verificationExpires = null

    if (emailService) {
      verificationToken = emailService.generateVerificationToken()
      verificationExpires = emailService.getExpirationTime()
    }

    // Prepare user data - start with basic required fields
    const userData = {
      email,
      password: hashedPassword, // Using 'password' column name
      first_name,
      last_name,
      phone: phone || null,
      address: address || null,
      role: 'customer',
      created_at: new Date().toISOString()
    }

    // Add email verification fields only if email service is available
    if (emailService) {
      userData.status = 'pending_verification'
      userData.email_verified = false
      userData.email_verification_token = verificationToken
      userData.email_verification_expires = verificationExpires
      userData.email_verification_sent_at = new Date().toISOString()
      console.log('📧 Email verification enabled - user will need to verify email')
    } else {
      // No email service - make user active immediately
      userData.status = 'active'
      userData.email_verified = true
      console.log('📧 Email verification disabled - user will be active immediately')
    }

    console.log('📋 Final user data:', { ...userData, password: '[HIDDEN]' })

    // Create user in Supabase using admin client to bypass RLS
    console.log('🔄 Attempting to create user in database...')
    let { data: newUser, error } = await supabaseAdmin
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

      // If email verification columns don't exist, try with basic data only
      if (error.message?.includes('column') && (userData.email_verified !== undefined || userData.status !== undefined)) {
        console.log('⚠️ Email verification columns may not exist, trying basic registration...')
        const basicUserData = {
          email,
          password: hashedPassword,
          first_name,
          last_name,
          phone: phone || null,
          address: address || null,
          role: 'customer'
        }

        const { data: basicUser, error: basicError } = await supabaseAdmin
          .from('users')
          .insert([basicUserData])
          .select()
          .single()

        if (basicError) {
          console.error('❌ Basic registration also failed:', basicError)
          return res.status(500).json({
            message: 'Failed to create user',
            error: process.env.NODE_ENV === 'development' ? basicError.message : undefined
          })
        }

        console.log('✅ Basic user created successfully:', { id: basicUser.id, email: basicUser.email })
        newUser = basicUser
        error = null // Clear the error since basic registration succeeded
      } else {
        return res.status(500).json({
          message: 'Failed to create user',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
      }
    } else {
      console.log('✅ User created successfully:', { id: newUser.id, email: newUser.email })
    }

    console.log('✅ User created successfully:', { id: newUser.id, email: newUser.email })

    // Send verification email if email service is available
    if (emailService && verificationToken) {
      try {
        await emailService.sendVerificationEmail(
          newUser.email,
          newUser.first_name,
          verificationToken
        )
        console.log('✅ Verification email sent successfully')
      } catch (emailError) {
        console.error('❌ Failed to send verification email:', emailError)
        // Don't fail registration if email fails - user can request resend
      }
    }

    // Generate JWT token for immediate login if no email verification required
    let token = null
    if (!emailService) {
      token = jwt.sign(
        {
          userId: newUser.id,
          email: newUser.email,
          role: newUser.role
        },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '7d' }
      )
    }

    const responseMessage = emailService
      ? 'Registration successful! Please check your email to verify your account.'
      : 'Registration successful! You are now logged in.'

    console.log('✅ Registration completed:', emailService ? 'pending email verification' : 'active')

    res.status(201).json({
      message: responseMessage,
      user: {
        id: newUser.id,
        email: newUser.email,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        role: newUser.role,
        status: newUser.status
      },
      verification_required: !!emailService,
      token: token // Include token if no email verification required
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
