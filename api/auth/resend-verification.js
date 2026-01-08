const db = require('../../lib/db');
const { generateVerificationToken, getExpirationTime, sendVerificationEmail } = require('../../lib/emailService');

module.exports = async function handler(req, res) {
  console.log('🔍 Resend verification API (Neon) called');

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user with this email
    const query = `
      SELECT id, email, first_name, email_verified, email_verification_sent_at 
      FROM users 
      WHERE email = $1
    `;
    const { rows } = await db.query(query, [email]);
    const user = rows[0];

    if (!user) {
      // Don't reveal if user exists or not for security
      return res.status(200).json({
        message: 'If an account with this email exists, a verification email has been sent.'
      });
    }

    // Check if already verified
    if (user.email_verified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Check rate limiting - don't allow resend within 1 minute
    if (user.email_verification_sent_at) {
      const lastSent = new Date(user.email_verification_sent_at);
      const now = new Date();
      const timeDiff = (now - lastSent) / 1000 / 60; // minutes

      if (timeDiff < 1) {
        return res.status(429).json({
          message: 'Please wait at least 1 minute before requesting another verification email.',
          retry_after: Math.ceil(60 - (timeDiff * 60)) // seconds
        });
      }
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const verificationExpires = getExpirationTime();

    // Update user with new verification token
    const updateQuery = `
      UPDATE users 
      SET 
        email_verification_token = $1,
        email_verification_expires = $2,
        email_verification_sent_at = NOW()
      WHERE id = $3
    `;

    await db.query(updateQuery, [
      verificationToken,
      verificationExpires.toISOString(),
      user.id
    ]);

    // Send verification email
    try {
      await sendVerificationEmail(user.email, user.first_name, verificationToken);
      console.log('✅ Verification email resent successfully to:', user.email);
    } catch (emailError) {
      console.error('❌ Failed to resend verification email:', emailError);
      return res.status(500).json({ message: 'Failed to send verification email' });
    }

    res.status(200).json({
      message: 'Verification email sent successfully! Please check your inbox.',
      email_sent: true
    });

  } catch (error) {
    console.error('❌ Resend verification error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
