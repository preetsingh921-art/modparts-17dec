const db = require('../../lib/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validatePassword } = require('../../lib/passwordValidator');

// Email verification is optional - only load if nodemailer is available
let emailService = null;
try {
  emailService = require('../../lib/emailService');
} catch (error) {
  console.log('📧 Email service not available - email verification disabled');
}

module.exports = async function handler(req, res) {
  // CORS is handled by dev-server middleware
  console.log('🔍 Registration API called (Neon)');
  console.log('Request method:', req.method);

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, password, first_name, last_name, phone, address } = req.body;

    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({
        message: 'Email, password, first name, and last name are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: 'Please enter a valid email address'
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password, {
      firstName: first_name,
      lastName: last_name,
      email: email,
      phone: phone
    });

    if (!passwordValidation.isValid) {
      return res.status(400).json({
        message: 'Password does not meet security requirements',
        errors: passwordValidation.errors,
        requirements: passwordValidation.requirements
      });
    }

    // Check if user already exists
    const checkUserQuery = 'SELECT id FROM users WHERE email = $1';
    const { rows: existingUsers } = await db.query(checkUserQuery, [email]);

    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate email verification token if email service is available
    let verificationToken = null;
    let verificationExpires = null;

    if (emailService) {
      verificationToken = emailService.generateVerificationToken();
      verificationExpires = emailService.getExpirationTime();
    }

    // Prepare user data
    let isApproved = true;
    let emailVerified = true;

    if (emailService) {
      isApproved = false;
      emailVerified = false;
      console.log('📧 Email verification enabled - user is_approved: false');
    } else {
      console.log('📧 Email verification disabled - user will be active immediately');
    }

    // Create user in Neon DB - using correct column names from schema
    const insertUserQuery = `
      INSERT INTO users (
        email, password, first_name, last_name, phone, address, 
        role, is_approved, email_verified, 
        email_verification_token, email_verification_expires, email_verification_sent_at,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING id, email, first_name, last_name, role, is_approved
    `;

    const values = [
      email,
      hashedPassword,
      first_name,
      last_name,
      phone || null,
      address || null,
      'customer',
      isApproved,
      emailVerified,
      verificationToken || null,
      verificationExpires || null,
      emailService ? new Date().toISOString() : null
    ];

    const { rows: newUsers } = await db.query(insertUserQuery, values);
    const newUser = newUsers[0];

    console.log('✅ User created successfully (Neon):', { id: newUser.id, email: newUser.email });

    // Send verification email if email service is available
    if (emailService && verificationToken) {
      try {
        await emailService.sendVerificationEmail(
          newUser.email,
          newUser.first_name,
          verificationToken
        );
        console.log('✅ Verification email sent successfully');
      } catch (emailError) {
        console.error('❌ Failed to send verification email:', emailError);
      }
    }

    // Generate JWT token for immediate login if no email verification required
    let token = null;
    if (!emailService) {
      token = jwt.sign(
        {
          id: newUser.id, // Using numeric ID from Neon (bigint usually treated as string in JS if too large, but pg driver handles appropriately)
          userId: newUser.id, // Backwards compatibility if expected
          email: newUser.email,
          role: newUser.role
        },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '7d' }
      );
    }

    const responseMessage = emailService
      ? 'Registration successful! Please check your email to verify your account.'
      : 'Registration successful! You are now logged in.';

    res.status(201).json({
      message: responseMessage,
      user: newUser,
      verification_required: !!emailService,
      token: token
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
