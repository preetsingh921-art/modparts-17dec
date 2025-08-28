# 📧 Gmail Email Service Setup Guide

Complete guide to set up Gmail for all email services in your ModParts application.

## 🎯 Overview

Your application uses Gmail for all email services:
- ✅ **User Registration** - Email verification
- ✅ **Password Reset** - Secure reset links
- ✅ **Welcome Emails** - After email verification
- ✅ **Admin Notifications** - Order confirmations, etc.

## 🔧 Why Gmail?

### **Advantages:**
- ✅ **100% Free** - No cost for reasonable usage
- ✅ **Reliable** - Google's infrastructure
- ✅ **Easy Setup** - Just need app password
- ✅ **High Deliverability** - Emails reach inbox
- ✅ **No API Keys** - Simple SMTP authentication

### **Limitations:**
- ⚠️ **Daily Limit**: 500 emails/day (more than enough for most sites)
- ⚠️ **From Address**: Must use your Gmail address

## 🚀 Step-by-Step Setup

### **Step 1: Create/Use Gmail Account**

1. **Use existing Gmail** or create new one at https://gmail.com
2. **Recommended**: Create dedicated account like `noreply@yourdomain.com` (if you have Google Workspace)
3. **Or use personal Gmail** like `yourname@gmail.com`

### **Step 2: Enable 2-Factor Authentication**

**REQUIRED** - Gmail App Passwords only work with 2FA enabled.

1. **Go to**: https://myaccount.google.com/security
2. **Click**: "2-Step Verification"
3. **Follow setup** - Use phone number or authenticator app
4. **Verify** it's working

### **Step 3: Generate App Password**

1. **Go to**: https://myaccount.google.com/apppasswords
2. **Select app**: "Mail"
3. **Select device**: "Other (custom name)"
4. **Enter name**: "ModParts Website"
5. **Click**: "Generate"
6. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

### **Step 4: Update Environment Variables**

Add these to your `.env` file:

```bash
# Gmail Configuration
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop

# Alternative names (for compatibility)
SMTP_USER=your_email@gmail.com
SMTP_PASS=abcdefghijklmnop

# Email Settings
SMTP_FROM_NAME=ModParts
SMTP_REPLY_TO=support@partsformyrd350.com
```

### **Step 5: Test Email Sending**

1. **Register new user** on your site
2. **Check email** for verification link
3. **Try password reset** feature
4. **Check Gmail "Sent" folder** to confirm emails are being sent

## 🔍 Troubleshooting

### **"Invalid Credentials" Error**
```
❌ Error: Invalid login: 535-5.7.8 Username and Password not accepted
```

**Solutions:**
1. **Check 2FA** is enabled on Gmail account
2. **Regenerate App Password** - old ones may expire
3. **Use exact 16-character password** (no spaces)
4. **Check Gmail username** is correct

### **"Less Secure Apps" Error**
```
❌ Error: Please log in via your web browser
```

**Solution:**
- **Use App Password** instead of regular password
- **Don't enable "Less secure app access"** (deprecated)

### **Emails Not Sending**
```
❌ Error: Connection timeout
```

**Solutions:**
1. **Check internet connection**
2. **Verify Gmail credentials**
3. **Check firewall/proxy settings**
4. **Try different Gmail account**

### **Emails Going to Spam**
```
✅ Emails send but go to spam folder
```

**Solutions:**
1. **Add sender to contacts** in recipient's email
2. **Use professional from name** (set SMTP_FROM_NAME)
3. **Avoid spam words** in subject/content
4. **Consider Google Workspace** for custom domain

## 📊 Usage Limits

### **Gmail Free Account:**
- **500 emails/day** - Perfect for small to medium sites
- **No monthly fees**
- **Reliable delivery**

### **Google Workspace (Paid):**
- **2,000 emails/day** per user
- **Custom domain** (e.g., noreply@yoursite.com)
- **Professional appearance**
- **$6/month per user**

## 🔒 Security Best Practices

### **App Password Security:**
1. **Use dedicated Gmail account** for website emails
2. **Don't share app passwords**
3. **Regenerate periodically** (every 6 months)
4. **Store securely** in environment variables only

### **Email Content Security:**
1. **Use HTTPS links** in emails
2. **Include unsubscribe options** (for marketing emails)
3. **Don't include sensitive data** in emails
4. **Use professional templates**

## 🎨 Email Templates

Your application includes professional email templates:

### **Registration Verification:**
- Clean, branded design
- Clear call-to-action button
- 24-hour expiration notice
- Mobile-responsive

### **Password Reset:**
- Security warnings
- 1-hour expiration
- Google user notifications
- Professional styling

### **Welcome Email:**
- Friendly greeting
- Getting started tips
- Contact information
- Brand consistency

## 🚀 Production Deployment

### **Environment Variables for Production:**
```bash
# Production Gmail Setup
GMAIL_USER=noreply@yourcompany.com
GMAIL_APP_PASSWORD=your_production_app_password
SMTP_FROM_NAME=Your Company Name
SMTP_REPLY_TO=support@yourcompany.com
```

### **Monitoring:**
1. **Check Gmail "Sent" folder** regularly
2. **Monitor bounce rates**
3. **Watch for delivery issues**
4. **Keep backup email service** ready

## 📈 Scaling Options

### **When to Upgrade:**

**Stick with Gmail if:**
- < 400 emails/day
- Personal/small business site
- Budget is tight

**Consider alternatives if:**
- > 400 emails/day consistently
- Need custom domain emails
- Require advanced analytics
- Need higher deliverability

### **Alternative Services:**
1. **SendGrid** - 100 emails/day free, then paid
2. **Mailgun** - 5,000 emails/month free
3. **Amazon SES** - Pay per email
4. **Google Workspace** - Custom domain emails

## ✅ Quick Setup Checklist

- [ ] Gmail account created/selected
- [ ] 2-Factor Authentication enabled
- [ ] App Password generated
- [ ] Environment variables updated
- [ ] Test registration email
- [ ] Test password reset email
- [ ] Check spam folders
- [ ] Verify "Sent" folder in Gmail

## 🎯 Final Notes

- **Gmail is perfect** for most small to medium websites
- **Free and reliable** - no hidden costs
- **Easy to set up** - just need app password
- **Professional templates** included
- **Ready for production** use

**Your email system is now ready to handle user registrations, password resets, and notifications reliably!** 📧✨
