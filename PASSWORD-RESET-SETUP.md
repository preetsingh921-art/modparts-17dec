# Password Reset Setup Guide

Complete guide to set up password reset functionality for your ModParts website.

## 🎯 Overview

This implementation adds secure password reset functionality that works for both email and Google OAuth users:
- ✅ **Secure Token System** - Cryptographically secure reset tokens
- ✅ **Email Integration** - Professional HTML email templates
- ✅ **Google User Support** - Google users can set email passwords
- ✅ **Time-Limited Tokens** - 1-hour expiration for security
- ✅ **Professional UI** - Clean, responsive design

## 📋 Prerequisites

### 1. Database Schema Update
**IMPORTANT**: Add password reset fields to your `users` table in Supabase:

```sql
-- Run this in Supabase SQL Editor
ALTER TABLE users ADD COLUMN reset_token TEXT;
ALTER TABLE users ADD COLUMN reset_token_expiry TIMESTAMPTZ;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);
CREATE INDEX IF NOT EXISTS idx_users_reset_token_expiry ON users(reset_token_expiry);
```

### 2. Email Configuration
Set up Gmail App Password for sending reset emails:

#### Step 1: Enable 2-Factor Authentication
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Navigate to **Security** → **2-Step Verification**
3. Enable 2-Factor Authentication if not already enabled

#### Step 2: Generate App Password
1. Go to **Security** → **App passwords**
2. Select **Mail** and **Other (Custom name)**
3. Enter "ModParts Password Reset"
4. Copy the generated 16-character password

#### Step 3: Update Environment Variables
Add these to your `.env.local` and production environment:
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-character-app-password
```

## 🚀 Features Implemented

### 🔐 Password Reset Flow
1. **User clicks "Forgot Password?"** on login page
2. **Enters email address** on forgot password page
3. **System generates secure token** and saves to database
4. **Email sent with reset link** (expires in 1 hour)
5. **User clicks link** and enters new password
6. **Password updated** and token cleared
7. **User can login** with new password

### 👥 User Support
- **Email Users**: Standard password reset flow
- **Google Users**: Can set email password for dual login options
- **All Users**: Professional email templates with clear instructions

### 🛡️ Security Features
- **Secure Tokens**: 32-byte cryptographically secure random tokens
- **Time Expiration**: 1-hour token validity
- **Single Use**: Tokens cleared after successful reset
- **No Email Enumeration**: Same response for valid/invalid emails
- **HTTPS Enforcement**: Secure reset links in production

## 📁 Files Created/Modified

### New Files
- `api/auth/reset-password.js` - Password reset API endpoint
- `frontend/src/pages/ForgotPassword.jsx` - Request reset page
- `frontend/src/pages/ResetPassword.jsx` - Set new password page
- `scripts/add-reset-password-fields.sql` - Database schema update
- `scripts/update-database-reset-password.js` - Schema check script

### Modified Files
- `frontend/src/pages/Login.jsx` - Added "Forgot Password?" link
- `frontend/src/App.jsx` - Added new routes
- `.env.local` - Added email configuration

## 🎨 User Experience

### Forgot Password Page
- **Clean Design**: Professional form with clear instructions
- **Email Validation**: Real-time validation feedback
- **Loading States**: Smooth transitions during processing
- **Success Confirmation**: Clear next steps after submission

### Reset Password Page
- **Token Validation**: Automatic validation of reset links
- **Password Requirements**: Clear password strength requirements
- **Confirmation Field**: Prevents password typos
- **Error Handling**: Clear messages for expired/invalid tokens

### Email Template
- **Professional Design**: Branded HTML email template
- **Clear Instructions**: Step-by-step reset process
- **Security Warnings**: Important security information
- **Mobile Responsive**: Works on all email clients

## 🔧 API Endpoints

### POST /api/auth/reset-password
Request password reset email
```javascript
{
  "email": "user@example.com"
}
```

### PUT /api/auth/reset-password
Reset password with token
```javascript
{
  "token": "secure-reset-token",
  "newPassword": "newpassword123"
}
```

## 🌐 Routes Added

- `/forgot-password` - Request password reset
- `/reset-password?token=xyz` - Reset password with token

## 📧 Email Template Features

### Professional Design
- **Branded Header**: ModParts branding and colors
- **Clear Call-to-Action**: Prominent reset button
- **Security Information**: Important warnings and tips
- **Mobile Responsive**: Works on all devices

### Google User Handling
- **Special Notice**: Explains dual login options for Google users
- **Clear Benefits**: Why setting a password is useful
- **Same Process**: Consistent experience for all users

## 🔍 Testing the Implementation

### Local Development
1. **Update database schema** (run the SQL above)
2. **Configure email settings** in `.env.local`
3. **Start development server**: `npm run dev`
4. **Test reset flow**:
   - Go to `/login`
   - Click "Forgot your password?"
   - Enter email and submit
   - Check email for reset link
   - Click link and set new password

### Production Deployment
1. **Add environment variables** to hosting platform:
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   ```
2. **Deploy the code**
3. **Test with real email addresses**

## 🛠️ Environment Variables

### Required Variables
```env
# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password

# Existing variables (keep these)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
```

## 🔧 Troubleshooting

### Common Issues

#### "Failed to send email"
- **Check Gmail App Password**: Ensure 2FA is enabled and app password is correct
- **Verify email settings**: Make sure EMAIL_USER and EMAIL_PASSWORD are set
- **Check Gmail security**: Ensure "Less secure app access" is not blocking

#### "Invalid or expired token"
- **Check token expiry**: Tokens expire after 1 hour
- **Verify database**: Ensure reset_token fields exist in users table
- **Check URL**: Ensure token parameter is correctly passed

#### Database errors
- **Run schema update**: Ensure reset_token columns exist
- **Check permissions**: Verify Supabase service role permissions
- **Verify indexes**: Ensure performance indexes are created

## 📊 Security Considerations

### Token Security
- **Cryptographically Secure**: Uses Node.js crypto.randomBytes()
- **Sufficient Length**: 32-byte tokens (64 hex characters)
- **Single Use**: Tokens cleared after successful reset
- **Time Limited**: 1-hour expiration prevents abuse

### Email Security
- **No Enumeration**: Same response for valid/invalid emails
- **HTTPS Links**: All reset links use HTTPS in production
- **Clear Warnings**: Email includes security best practices

### Database Security
- **Indexed Lookups**: Efficient token validation
- **Automatic Cleanup**: Expired tokens can be cleaned up
- **Secure Storage**: Tokens stored as plain text (single-use, time-limited)

## 🎉 Success Indicators

Your password reset is working when:
- ✅ **"Forgot Password?" link** appears on login page
- ✅ **Email sending works** without errors
- ✅ **Reset emails received** in inbox (check spam)
- ✅ **Reset links work** and redirect properly
- ✅ **Password updates** successfully
- ✅ **Login works** with new password

## 📞 Support

### Useful Resources
- **Gmail App Passwords**: https://support.google.com/accounts/answer/185833
- **Nodemailer Documentation**: https://nodemailer.com/about/
- **Supabase Auth**: https://supabase.com/docs/guides/auth

### Next Steps
1. **Update database schema** in Supabase
2. **Configure Gmail App Password**
3. **Update environment variables**
4. **Test the complete flow**
5. **Deploy to production**

**Your password reset functionality is ready to go!** 🚀
