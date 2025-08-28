const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Create email transporter with multiple service support
const createTransporter = () => {
  // Check which email service to use
  const emailService = process.env.EMAIL_SERVICE || 'sendgrid';

  switch (emailService.toLowerCase()) {
    case 'sendgrid':
      return nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY,
        },
      });

    case 'mailgun':
      return nodemailer.createTransport({
        host: 'smtp.mailgun.org',
        port: 587,
        secure: false,
        auth: {
          user: process.env.MAILGUN_SMTP_USER,
          pass: process.env.MAILGUN_SMTP_PASS,
        },
      });

    case 'gmail':
    default:
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
  }
};

// Generate verification token
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Calculate expiration time
const getExpirationTime = () => {
  const hours = parseInt(process.env.EMAIL_VERIFICATION_EXPIRES_HOURS) || 24;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
};

// Generate password reset token
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Calculate reset token expiration (1 hour)
const getResetTokenExpiration = () => {
  return new Date(Date.now() + 60 * 60 * 1000); // 1 hour
};

// Send verification email
const sendVerificationEmail = async (email, firstName, verificationToken) => {
  try {
    const transporter = createTransporter();
    
    const verificationUrl = `${process.env.EMAIL_VERIFICATION_URL}?token=${verificationToken}`;
    
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'Sardaarji Auto Parts'}" <${process.env.SMTP_FROM}>`,
      to: email,
      replyTo: process.env.SMTP_REPLY_TO || process.env.SMTP_FROM,
      subject: 'Verify Your Email Address - Sardaarji Auto Parts',
      headers: {
        'X-Mailer': 'Sardaarji Auto Parts',
        'X-Priority': '1',
        'X-MSMail-Priority': 'High'
      },
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .button { 
              display: inline-block; 
              background: #1e40af; 
              color: white; 
              padding: 12px 30px; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
            }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚗 Sardaarji Auto Parts</h1>
            </div>
            <div class="content">
              <h2>Welcome ${firstName}!</h2>
              <p>Thank you for registering with Sardaarji Auto Parts. To complete your registration and start shopping for quality auto parts, please verify your email address.</p>
              
              <p>Click the button below to verify your email:</p>
              
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #1e40af;">${verificationUrl}</p>
              
              <p><strong>This link will expire in 24 hours.</strong></p>
              
              <p>If you didn't create an account with us, please ignore this email.</p>
              
              <p>Best regards,<br>The Sardaarji Auto Parts Team</p>
            </div>
            <div class="footer">
              <p>© 2024 Sardaarji Auto Parts. All rights reserved.</p>
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome ${firstName}!
        
        Thank you for registering with Sardaarji Auto Parts. To complete your registration, please verify your email address.
        
        Click this link to verify: ${verificationUrl}
        
        This link will expire in 24 hours.
        
        If you didn't create an account with us, please ignore this email.
        
        Best regards,
        The Sardaarji Auto Parts Team
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

// Send welcome email after verification
const sendWelcomeEmail = async (email, firstName) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'Sardaarji Auto Parts'}" <${process.env.SMTP_FROM}>`,
      to: email,
      replyTo: process.env.SMTP_REPLY_TO || process.env.SMTP_FROM,
      subject: 'Welcome to Sardaarji Auto Parts! 🚗',
      headers: {
        'X-Mailer': 'Sardaarji Auto Parts',
        'X-Priority': '3'
      },
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #16a34a; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .button { 
              display: inline-block; 
              background: #16a34a; 
              color: white; 
              padding: 12px 30px; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
            }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to Sardaarji Auto Parts!</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName}!</h2>
              <p>Your email has been successfully verified! Welcome to Sardaarji Auto Parts - your trusted source for quality automotive parts.</p>
              
              <p>You can now:</p>
              <ul>
                <li>Browse our extensive catalog of auto parts</li>
                <li>Add items to your wishlist</li>
                <li>Place orders and track deliveries</li>
                <li>Manage your account and preferences</li>
              </ul>
              
              <a href="${process.env.EMAIL_VERIFICATION_URL?.replace('/verify-email', '/products') || 'https://sardaarjiautoparts.onrender.com/products'}" class="button">Start Shopping</a>
              
              <p>If you have any questions, feel free to contact our support team.</p>
              
              <p>Happy shopping!<br>The Sardaarji Auto Parts Team</p>
            </div>
            <div class="footer">
              <p>© 2024 Sardaarji Auto Parts. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    // Don't throw error for welcome email - it's not critical
    return { success: false, error: error.message };
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, firstName, resetToken, isGoogleUser = false) => {
  try {
    const transporter = createTransporter();

    // Generate reset URL based on environment
    const resetUrl = process.env.NODE_ENV === 'production'
      ? `https://www.partsformyrd350.com/reset-password?token=${resetToken}`
      : `http://localhost:3000/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'ModParts'}" <${process.env.SMTP_FROM}>`,
      to: email,
      replyTo: process.env.SMTP_REPLY_TO || process.env.SMTP_FROM,
      subject: 'Reset Your ModParts Password',
      headers: {
        'X-Mailer': 'ModParts',
        'X-Priority': '1',
        'X-MSMail-Priority': 'High'
      },
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password - ModParts</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
            .content { padding: 40px 30px; }
            .content h2 { color: #1e40af; margin-top: 0; }
            .button { display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; box-shadow: 0 4px 15px rgba(30, 64, 175, 0.3); }
            .button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(30, 64, 175, 0.4); }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0; }
            .warning strong { color: #92400e; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; background: #f8f9fa; }
            .url-box { background: #e5e7eb; padding: 15px; border-radius: 8px; word-break: break-all; font-family: monospace; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 ModParts</h1>
            </div>

            <div class="content">
              <h2>Hello ${firstName || 'Customer'},</h2>

              <p>We received a request to reset the password for your ModParts account associated with <strong>${email}</strong>.</p>

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
              <div class="url-box">${resetUrl}</div>

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
              <p>© 2024 ModParts - Quality Auto Parts</p>
              <p>This is an automated email. Please do not reply to this message.</p>
              <p>If you need help, contact us at support@partsformyrd350.com</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

module.exports = {
  generateVerificationToken,
  getExpirationTime,
  sendVerificationEmail,
  sendWelcomeEmail,
  generateResetToken,
  getResetTokenExpiration,
  sendPasswordResetEmail
};
