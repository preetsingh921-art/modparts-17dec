# Bot Protection Setup Guide

Complete guide to set up advanced bot protection for your ModParts website using Google reCAPTCHA and rate limiting.

## 🎯 Overview

This implementation adds comprehensive bot protection that includes:
- ✅ **Google reCAPTCHA v2** - Visual verification for human users
- ✅ **Rate Limiting** - Prevents brute force and spam attacks
- ✅ **Smart Integration** - Works seamlessly with existing auth flow
- ✅ **Production Ready** - Configurable for development and production

## 📋 Prerequisites

### 1. Google reCAPTCHA Setup

#### Step 1: Create reCAPTCHA Site
1. **Go to Google reCAPTCHA Console**: https://www.google.com/recaptcha/admin
2. **Click "Create"** to add a new site
3. **Fill in site details**:
   - **Label**: ModParts Bot Protection
   - **reCAPTCHA type**: reCAPTCHA v2 → "I'm not a robot" Checkbox
   - **Domains**: 
     - `partsformyrd350.com`
     - `www.partsformyrd350.com`
     - `localhost` (for development)
4. **Accept Terms of Service**
5. **Click "Submit"**

#### Step 2: Get Your Keys
After creation, you'll receive:
- **Site Key**: `6Lc...` (for frontend)
- **Secret Key**: `6Lc...` (for backend)

**Keep these secure!**

### 2. Environment Variables Setup

#### Development (.env.local)
```env
# reCAPTCHA Configuration
RECAPTCHA_SECRET_KEY=your-actual-secret-key
REACT_APP_RECAPTCHA_SITE_KEY=your-actual-site-key
```

#### Production (Render Environment Variables)
Add these to your Render environment:
- **RECAPTCHA_SECRET_KEY**: Your secret key
- **REACT_APP_RECAPTCHA_SITE_KEY**: Your site key

## 🚀 Features Implemented

### 🔐 reCAPTCHA Protection

#### **Registration Form**
- **Visual reCAPTCHA**: Users must complete "I'm not a robot" verification
- **Smart Validation**: Form won't submit without reCAPTCHA completion
- **Error Handling**: Clear messages for verification failures
- **Auto Reset**: reCAPTCHA resets on form errors

#### **Login Form**
- **Same Protection**: Consistent reCAPTCHA verification
- **Seamless UX**: Integrated with existing login flow
- **Google OAuth**: Works alongside Google Sign-In
- **Mobile Friendly**: Responsive reCAPTCHA widget

### 🛡️ Rate Limiting Protection

#### **Registration Endpoint**
- **Limit**: 3 attempts per hour per IP
- **Purpose**: Prevents mass account creation
- **Response**: Clear error with retry time

#### **Login Endpoint**
- **Limit**: 5 attempts per 15 minutes per IP
- **Purpose**: Prevents brute force attacks
- **Smart Reset**: Successful logins don't count against limit

#### **Password Reset**
- **Limit**: 3 attempts per hour per IP
- **Purpose**: Prevents email spam attacks
- **Protection**: Rate limited password reset requests

#### **Email Verification**
- **Limit**: 5 attempts per hour per IP
- **Purpose**: Prevents verification spam
- **Smart Handling**: Reasonable limits for legitimate users

### 🎨 User Experience

#### **reCAPTCHA Widget**
- **Professional Design**: Matches your site's styling
- **Clear Placement**: Positioned before submit buttons
- **Loading States**: Smooth integration with form submission
- **Error Messages**: Helpful feedback for users

#### **Rate Limit Messages**
- **Clear Communication**: Users know exactly what happened
- **Retry Information**: Shows when they can try again
- **Professional Tone**: Maintains brand consistency

## 🔧 Technical Implementation

### Frontend Components

#### **ReCaptcha Component**
```jsx
<ReCaptcha
  ref={recaptchaRef}
  onVerify={handleRecaptchaVerify}
  onExpire={handleRecaptchaExpire}
  size="normal"
  theme="light"
/>
```

#### **Integration Points**
- **Registration Page**: Required before form submission
- **Login Page**: Required before authentication
- **Form Validation**: Prevents submission without verification
- **Error Handling**: Resets on failures

### Backend Security

#### **reCAPTCHA Verification**
- **Server-Side Validation**: All tokens verified with Google
- **Score Checking**: Configurable minimum scores
- **Action Validation**: Ensures tokens match expected actions
- **Fallback Handling**: Graceful degradation in development

#### **Rate Limiting**
- **Express Middleware**: Integrated with existing API structure
- **IP-Based Tracking**: Prevents abuse from single sources
- **Configurable Limits**: Different limits for different endpoints
- **Memory Efficient**: Uses express-rate-limit for performance

## 📊 Security Levels

### **Registration Protection**
1. **reCAPTCHA Verification**: Human verification required
2. **Rate Limiting**: 3 attempts per hour per IP
3. **Email Verification**: Required before account activation
4. **Input Validation**: Server-side validation of all fields

### **Login Protection**
1. **reCAPTCHA Verification**: Bot detection
2. **Rate Limiting**: 5 attempts per 15 minutes per IP
3. **Password Hashing**: bcrypt with salt rounds
4. **JWT Tokens**: Secure session management

### **Password Reset Protection**
1. **Rate Limiting**: 3 attempts per hour per IP
2. **Secure Tokens**: Cryptographically secure reset tokens
3. **Time Expiration**: 1-hour token validity
4. **Email Verification**: Tokens sent to verified emails only

## 🌐 Production Deployment

### **Environment Variables Required**
```env
# reCAPTCHA (Required)
RECAPTCHA_SECRET_KEY=your-production-secret-key
REACT_APP_RECAPTCHA_SITE_KEY=your-production-site-key

# Existing variables (keep these)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### **Deployment Checklist**
- ✅ **reCAPTCHA keys** added to Render environment
- ✅ **Domain verification** in reCAPTCHA console
- ✅ **Rate limiting** configured for production traffic
- ✅ **Error monitoring** set up for security events

## 🔍 Testing the Implementation

### **Development Testing**
1. **Start development server**: `npm run dev`
2. **Test registration**:
   - Try submitting without reCAPTCHA (should fail)
   - Complete reCAPTCHA and submit (should work)
   - Try multiple rapid registrations (should hit rate limit)
3. **Test login**:
   - Same reCAPTCHA verification process
   - Test rate limiting with multiple failed attempts

### **Production Testing**
1. **Deploy to production**
2. **Test with real reCAPTCHA**:
   - Verify reCAPTCHA widget loads correctly
   - Test form submissions work properly
   - Verify rate limiting is active
3. **Monitor logs** for security events

## 🛠️ Configuration Options

### **reCAPTCHA Settings**
```javascript
// Minimum score for reCAPTCHA v3 (if upgraded)
minScore: 0.5

// Allowed actions
allowedActions: ['login', 'register']

// Widget appearance
size: 'normal' // 'compact', 'normal', 'invisible'
theme: 'light' // 'light', 'dark'
```

### **Rate Limiting Settings**
```javascript
// Registration: 3 per hour
windowMs: 60 * 60 * 1000
max: 3

// Login: 5 per 15 minutes
windowMs: 15 * 60 * 1000
max: 5
```

## 🔧 Troubleshooting

### **Common Issues**

#### **reCAPTCHA Not Loading**
- **Check site key**: Verify REACT_APP_RECAPTCHA_SITE_KEY is set
- **Check domains**: Ensure domain is added in reCAPTCHA console
- **Check network**: Verify Google reCAPTCHA API is accessible

#### **Rate Limiting Too Strict**
- **Adjust limits**: Modify rate limiter configuration
- **Check IP detection**: Verify correct IP addresses are being tracked
- **Monitor logs**: Check for legitimate users being blocked

#### **Development Issues**
- **Use test keys**: reCAPTCHA provides test keys for development
- **Skip verification**: Development mode can skip reCAPTCHA if needed
- **Check console**: Browser console shows reCAPTCHA errors

## 📈 Monitoring & Analytics

### **Security Metrics**
- **Failed reCAPTCHA attempts**: Monitor bot activity
- **Rate limit hits**: Track potential attacks
- **Registration patterns**: Identify suspicious activity
- **Login failures**: Monitor brute force attempts

### **User Experience Metrics**
- **reCAPTCHA completion rates**: Ensure not too difficult
- **Form abandonment**: Monitor if security affects conversions
- **Support requests**: Track security-related user issues

## 🎉 Success Indicators

Your bot protection is working when:
- ✅ **reCAPTCHA widgets** appear on login/register forms
- ✅ **Forms require verification** before submission
- ✅ **Rate limiting** blocks rapid requests
- ✅ **Error messages** are clear and helpful
- ✅ **Legitimate users** can complete forms easily
- ✅ **Bot traffic** is significantly reduced

## 📞 Support Resources

### **Useful Links**
- **Google reCAPTCHA Console**: https://www.google.com/recaptcha/admin
- **reCAPTCHA Documentation**: https://developers.google.com/recaptcha
- **Express Rate Limit**: https://github.com/express-rate-limit/express-rate-limit

### **Files Modified**
- `frontend/src/components/security/ReCaptcha.jsx` - reCAPTCHA component
- `frontend/src/pages/Login.jsx` - Login with reCAPTCHA
- `frontend/src/pages/Register.jsx` - Registration with reCAPTCHA
- `lib/recaptcha-verify.js` - Backend reCAPTCHA verification
- `lib/rate-limiter.js` - Rate limiting middleware
- `api/auth/login.js` - Login with security
- `api/auth/register.js` - Registration with security
- `dev-server.js` - Rate limiting integration

**Your website is now protected against bots and automated attacks!** 🛡️
