const { supabaseAdmin } = require('../../lib/supabase');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { isRecaptchaValid } = require('../../lib/recaptcha-verify');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Configure email transporter
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASSWORD || 'your-app-password'
    }
  });
};

module.exports = async function handler(req, res) {
  console.log('🔐 Password reset request:', req.method);

  if (req.method === 'POST') {
    // Handle password reset request
    const { email, recaptchaToken } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Verify reCAPTCHA
    console.log('🔐 Verifying reCAPTCHA for password reset...');
    const recaptchaValid = await isRecaptchaValid(recaptchaToken, {
      minScore: 0.5,
      allowedActions: ['password_reset']
    });

    if (!recaptchaValid) {
      console.log('❌ reCAPTCHA verification failed for password reset');
      return res.status(400).json({
        success: false,
        message: 'reCAPTCHA verification failed. Please try again.',
        code: 'RECAPTCHA_FAILED'
      });
    }

    console.log('✅ reCAPTCHA verification successful for password reset');

    try {
      console.log('📧 Processing password reset for:', email);

      // Check if user exists
      const { data: user, error: findError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (findError || !user) {
        console.log('❌ User not found:', email);
        // Don't reveal if email exists or not for security
        return res.status(200).json({
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.'
        });
      }

      console.log('✅ User found:', user.email, 'Auth provider:', user.auth_provider);

      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      console.log('🔑 Generated reset token for user:', user.id);

      // Save reset token to database
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          reset_token: resetToken,
          reset_token_expiry: resetTokenExpiry.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('❌ Error saving reset token:', updateError);
        return res.status(500).json({
          success: false,
          message: 'Failed to process password reset request'
        });
      }

      // Send reset email
      const resetUrl = process.env.NODE_ENV === 'production'
        ? `https://www.partsformyrd350.com/reset-password?token=${resetToken}`
        : `http://localhost:3000/reset-password?token=${resetToken}`;

      const emailContent = createResetEmailTemplate(user, resetUrl);

      try {
        const transporter = createEmailTransporter();
        
        await transporter.sendMail({
          from: process.env.EMAIL_USER || 'noreply@partsformyrd350.com',
          to: email,
          subject: 'Reset Your ModParts Password',
          html: emailContent
        });

        console.log('✅ Password reset email sent to:', email);

        return res.status(200).json({
          success: true,
          message: 'Password reset link has been sent to your email address.'
        });

      } catch (emailError) {
        console.error('❌ Error sending reset email:', emailError);
        return res.status(500).json({
          success: false,
          message: 'Failed to send password reset email. Please try again.'
        });
      }

    } catch (error) {
      console.error('❌ Password reset error:', error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred while processing your request'
      });
    }

  } else if (req.method === 'PUT') {
    // Handle password reset confirmation
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    try {
      console.log('🔄 Processing password reset confirmation');

      // Find user with valid reset token
      const { data: user, error: findError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('reset_token', token)
        .gt('reset_token_expiry', new Date().toISOString())
        .single();

      if (findError || !user) {
        console.log('❌ Invalid or expired reset token');
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token'
        });
      }

      console.log('✅ Valid reset token for user:', user.email);

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password and clear reset token
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          password: hashedPassword,
          reset_token: null,
          reset_token_expiry: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('❌ Error updating password:', updateError);
        return res.status(500).json({
          success: false,
          message: 'Failed to update password'
        });
      }

      console.log('✅ Password updated successfully for user:', user.email);

      return res.status(200).json({
        success: true,
        message: 'Password has been reset successfully. You can now log in with your new password.'
      });

    } catch (error) {
      console.error('❌ Password reset confirmation error:', error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred while resetting your password'
      });
    }

  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};

// Email template for password reset
function createResetEmailTemplate(user, resetUrl) {
  const isGoogleUser = user.auth_provider === 'google';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password - ModParts</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .button { display: inline-block; background: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { background: #333; color: white; padding: 20px; text-align: center; font-size: 12px; }
        .warning { background: #fef3cd; border: 1px solid #fecaca; padding: 15px; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Password Reset Request</h1>
          <p>ModParts - Yamaha RD350 Parts</p>
        </div>
        
        <div class="content">
          <h2>Hello ${user.first_name || 'Customer'},</h2>
          
          <p>We received a request to reset the password for your ModParts account associated with <strong>${user.email}</strong>.</p>
          
          ${isGoogleUser ? `
          <div class="warning">
            <strong>📝 Note:</strong> Your account was originally created using Google Sign-In. 
            Setting a password will allow you to log in using either Google or email/password in the future.
          </div>
          ` : ''}
          
          <p>Click the button below to reset your password:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset My Password</a>
          </div>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 5px;">
            ${resetUrl}
          </p>
          
          <div class="warning">
            <strong>⚠️ Important:</strong>
            <ul>
              <li>This link will expire in <strong>1 hour</strong></li>
              <li>If you didn't request this reset, please ignore this email</li>
              <li>Your password will remain unchanged until you complete the reset process</li>
            </ul>
          </div>
          
          <p>If you're having trouble with the button above, copy and paste the URL into your web browser.</p>
          
          <p>Best regards,<br>The ModParts Team</p>
        </div>
        
        <div class="footer">
          <p>© 2024 ModParts - Yamaha RD350 Parts</p>
          <p>This is an automated email. Please do not reply to this message.</p>
          <p>If you need help, contact us at support@partsformyrd350.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
