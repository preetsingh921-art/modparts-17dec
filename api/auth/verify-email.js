const db = require('../../lib/db');
const jwt = require('jsonwebtoken');
const { sendWelcomeEmail } = require('../../lib/emailService');

module.exports = async function handler(req, res) {
  console.log('🔍 Email verification API called (Neon)');
  console.log('Request method:', req.method);

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    // Find user with this verification token
    const query = `
      SELECT id, email, first_name, last_name, role, email_verified, email_verification_expires 
      FROM users 
      WHERE email_verification_token = $1
    `;
    const { rows } = await db.query(query, [token]);
    const user = rows[0];

    if (!user) {
      console.error('User not found with token:', token);
      return res.status(400).json({ message: 'Invalid verification token' });
    }

    // Check if already verified
    if (user.email_verified) {
      console.log('User already verified:', user.email);
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
      });
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(user.email_verification_expires);

    if (now > expiresAt) {
      console.log('Verification token expired for user:', user.email);
      return res.status(400).json({
        message: 'Verification token has expired. Please request a new verification email.',
        expired: true
      });
    }

    // Update user as verified, activate account, and clear verification fields
    const updateQuery = `
      UPDATE users SET
        email_verified = true,
        status = 'active',
        email_verification_token = NULL,
        email_verification_expires = NULL,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const { rows: updatedRows } = await db.query(updateQuery, [user.id]);
    const updatedUser = updatedRows[0];

    if (!updatedUser) {
      console.error('Error updating user verification status');
      return res.status(500).json({ message: 'Failed to verify email' });
    }

    console.log('✅ Email verified successfully for user:', user.email);

    // Send welcome email
    try {
      await sendWelcomeEmail(user.email, user.first_name);
      console.log('✅ Welcome email sent successfully');
    } catch (emailError) {
      console.error('❌ Failed to send welcome email:', emailError);
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        id: user.id,
        userId: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

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
    });

  } catch (error) {
    console.error('❌ Email verification error:', error);
    res.status(500).json({
      message: 'Internal server error during email verification',
      error: error.message
    });
  }
};
