# Google OAuth Setup Guide

Complete guide to set up Google OAuth authentication for your ModParts website.

## 🎯 Overview

This implementation adds Google OAuth login/registration to your existing authentication system while maintaining:
- ✅ **Admin approval workflow** - Google users still need admin approval
- ✅ **Existing JWT system** - Same token-based authentication
- ✅ **User data integrity** - All existing features preserved
- ✅ **Cart migration** - Automatic cart import on login

## 📋 Prerequisites

### 1. Database Schema Update
**IMPORTANT**: Add these columns to your `users` table in Supabase:

```sql
-- Run this in Supabase SQL Editor
ALTER TABLE users ADD COLUMN google_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'email';

-- Update existing users
UPDATE users SET auth_provider = 'email' WHERE auth_provider IS NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);
```

### 2. Google Cloud Console Setup

#### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing one
3. Name: "ModParts OAuth" (or your preference)

#### Step 2: Enable APIs
1. Navigate to **APIs & Services** → **Library**
2. Enable these APIs:
   - **Google+ API**
   - **People API**

#### Step 3: Configure OAuth Consent Screen
1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **"External"** user type
3. Fill in required information:
   - **App name**: ModParts
   - **User support email**: your email
   - **Developer contact**: your email
   - **App domain**: `partsformyrd350.com`
   - **Authorized domains**: `partsformyrd350.com`
4. Add scopes:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
5. Save and continue

#### Step 4: Create OAuth Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → **OAuth 2.0 Client IDs**
3. **Application type**: Web application
4. **Name**: "ModParts Web Client"
5. **Authorized JavaScript origins**:
   ```
   https://www.partsformyrd350.com
   http://localhost:3000
   ```
6. **Authorized redirect URIs**:
   ```
   https://www.partsformyrd350.com/auth/google/callback
   http://localhost:3000/auth/google/callback
   ```
7. Click **"Create"**

#### Step 5: Save Credentials
You'll receive:
- **Client ID**: `1234567890-abcdef.googleusercontent.com`
- **Client Secret**: `GOCSPX-abcdef123456`

## 🔧 Environment Configuration

### Update .env.local
Replace the placeholder values in `.env.local`:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-actual-client-id.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-client-secret
SESSION_SECRET=generate-a-random-32-character-string
```

### Generate Session Secret
Use this command to generate a secure session secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🚀 Testing the Implementation

### Local Development
1. **Update database schema** (run the SQL above)
2. **Add Google credentials** to `.env.local`
3. **Start development server**:
   ```bash
   npm run dev
   ```
4. **Test OAuth flow**:
   - Go to `http://localhost:3000/login`
   - Click "Sign in with Google"
   - Complete Google authentication
   - Verify user creation/login

### Production Deployment
1. **Add environment variables** to your hosting platform:
   ```
   GOOGLE_CLIENT_ID=your-production-client-id
   GOOGLE_CLIENT_SECRET=your-production-client-secret
   SESSION_SECRET=your-production-session-secret
   ```
2. **Deploy the code**:
   ```bash
   npm run deploy "Add Google OAuth authentication"
   ```

## 🔍 How It Works

### Authentication Flow
1. **User clicks "Sign in with Google"**
2. **Redirects to Google OAuth** (`/auth/google`)
3. **User authorizes on Google**
4. **Google redirects back** (`/auth/google/callback`)
5. **Backend processes user data**:
   - Creates new user if email doesn't exist
   - Links Google ID to existing user if email exists
   - Sets status to `pending_approval` for new users
6. **Generates JWT token** for approved users
7. **Redirects to frontend** with auth data
8. **Frontend processes callback** and logs user in

### User States
- **New Google User**: Created with `pending_approval` status
- **Existing Email User**: Google ID added to existing account
- **Approved User**: Immediate login with JWT token
- **Pending User**: Redirected to login with approval message

### Data Mapping
Google profile data maps to your user schema:
```javascript
{
  email: profile.emails[0].value,
  first_name: profile.name.givenName,
  last_name: profile.name.familyName,
  google_id: profile.id,
  auth_provider: 'google',
  status: 'pending_approval',
  email_verified: true
}
```

## 🛡️ Security Features

### Data Protection
- ✅ **Secure OAuth 2.0** implementation
- ✅ **JWT tokens** for session management
- ✅ **Session encryption** with secure secrets
- ✅ **HTTPS enforcement** in production
- ✅ **CSRF protection** via state parameters

### Admin Controls
- ✅ **Admin approval required** for all new users
- ✅ **Account status management** (active/suspended/rejected)
- ✅ **Audit trail** with auth_provider tracking
- ✅ **Email verification** (Google emails pre-verified)

## 🎨 User Experience

### Login Page
- **Google button** prominently displayed
- **"Or continue with email"** divider
- **Error handling** for OAuth failures
- **Status messages** for pending approval

### Registration Page
- **"Sign up with Google"** option
- **Same approval workflow** as email registration
- **Seamless integration** with existing UI

### Error Handling
- **OAuth failures**: Clear error messages
- **Account issues**: Specific status messages
- **Network errors**: Graceful fallbacks
- **Redirect handling**: Proper URL management

## 🔧 Troubleshooting

### Common Issues

#### "OAuth Error" on Login
- **Check Google credentials** in environment variables
- **Verify redirect URIs** in Google Console
- **Ensure APIs are enabled** (Google+, People API)

#### "Pending Approval" Loop
- **Check user status** in database
- **Admin must approve** new Google users
- **Verify admin approval workflow**

#### Database Errors
- **Ensure columns exist**: `google_id`, `auth_provider`
- **Check unique constraints** on `google_id`
- **Verify Supabase permissions**

#### Development vs Production
- **Different OAuth credentials** for each environment
- **Correct redirect URIs** for each domain
- **Environment variable** configuration

### Debug Mode
Enable detailed logging by checking browser console and server logs:
```javascript
// Look for these log messages:
// 🚀 Initiating Google OAuth flow
// 🔄 Handling Google OAuth callback
// ✅ OAuth authentication successful
// 🎫 JWT token generated
```

## 📊 Admin Management

### New User Workflow
1. **User signs up with Google**
2. **Account created** with `pending_approval` status
3. **Admin receives notification** (if configured)
4. **Admin approves/rejects** in admin panel
5. **User can login** once approved

### User Management
- **View auth provider** in admin panel
- **Manage Google users** same as email users
- **Track registration method** via `auth_provider`
- **Handle account linking** for existing emails

## 🎉 Success Indicators

Your Google OAuth is working when:
- ✅ **Google button appears** on login/register pages
- ✅ **OAuth flow completes** without errors
- ✅ **Users are created** with Google data
- ✅ **JWT tokens generated** for approved users
- ✅ **Cart migration works** on login
- ✅ **Admin approval workflow** functions

## 📞 Support

### Useful Resources
- **Google OAuth Documentation**: https://developers.google.com/identity/protocols/oauth2
- **Passport.js Google Strategy**: http://www.passportjs.org/packages/passport-google-oauth20/
- **Supabase Auth**: https://supabase.com/docs/guides/auth

### Files Modified
- `lib/passport-config.js` - OAuth strategy configuration
- `api/auth/google.js` - OAuth route handlers
- `frontend/src/pages/AuthCallback.jsx` - OAuth callback processor
- `frontend/src/components/auth/GoogleLoginButton.jsx` - UI component
- `frontend/src/pages/Login.jsx` - Updated login page
- `frontend/src/pages/Register.jsx` - Updated registration page
- `dev-server.js` - Development server OAuth support

**Your Google OAuth authentication is ready to go!** 🚀
