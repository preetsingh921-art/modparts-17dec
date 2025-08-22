#!/usr/bin/env node

/**
 * Test script to verify reCAPTCHA configuration and functionality
 */

require('dotenv').config({ path: '.env.local' });
const { isRecaptchaValid } = require('../lib/recaptcha-verify');

async function testRecaptchaConfiguration() {
  console.log('🔐 Testing reCAPTCHA Configuration...');
  console.log('');

  // Test 1: Check environment variables
  console.log('📋 Environment Variables:');
  const siteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY;
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  
  console.log('- REACT_APP_RECAPTCHA_SITE_KEY:', siteKey ? '✅ SET' : '❌ MISSING');
  console.log('- RECAPTCHA_SECRET_KEY:', secretKey ? '✅ SET' : '❌ MISSING');
  
  if (siteKey) {
    console.log('  Site Key starts with:', siteKey.substring(0, 10) + '...');
    console.log('  Site Key length:', siteKey.length, 'characters');
  }
  
  if (secretKey) {
    console.log('  Secret Key starts with:', secretKey.substring(0, 10) + '...');
    console.log('  Secret Key length:', secretKey.length, 'characters');
  }
  
  console.log('');

  // Test 2: Check key format
  console.log('🔍 Key Format Validation:');
  
  if (siteKey) {
    const siteKeyValid = siteKey.startsWith('6L') && siteKey.length >= 40;
    console.log('- Site Key format:', siteKeyValid ? '✅ VALID' : '❌ INVALID');
    
    if (!siteKeyValid) {
      console.log('  Expected: Starts with "6L" and at least 40 characters');
      console.log('  Actual: Starts with "' + siteKey.substring(0, 2) + '" and ' + siteKey.length + ' characters');
    }
  }
  
  if (secretKey) {
    const secretKeyValid = secretKey.startsWith('6L') && secretKey.length >= 40;
    console.log('- Secret Key format:', secretKeyValid ? '✅ VALID' : '❌ INVALID');
    
    if (!secretKeyValid) {
      console.log('  Expected: Starts with "6L" and at least 40 characters');
      console.log('  Actual: Starts with "' + secretKey.substring(0, 2) + '" and ' + secretKey.length + ' characters');
    }
  }
  
  console.log('');

  // Test 3: Test verification function with invalid token
  console.log('🧪 Testing Verification Function:');
  
  try {
    console.log('- Testing with invalid token...');
    const invalidResult = await isRecaptchaValid('invalid-token');
    console.log('  Invalid token result:', invalidResult ? '❌ UNEXPECTED SUCCESS' : '✅ CORRECTLY FAILED');
    
    console.log('- Testing with empty token...');
    const emptyResult = await isRecaptchaValid('');
    console.log('  Empty token result:', emptyResult ? '❌ UNEXPECTED SUCCESS' : '✅ CORRECTLY FAILED');
    
    console.log('- Testing with null token...');
    const nullResult = await isRecaptchaValid(null);
    console.log('  Null token result:', nullResult ? '❌ UNEXPECTED SUCCESS' : '✅ CORRECTLY FAILED');
    
  } catch (error) {
    console.log('❌ Error testing verification function:', error.message);
  }
  
  console.log('');

  // Test 4: Configuration recommendations
  console.log('💡 Configuration Status:');
  
  if (!siteKey || !secretKey) {
    console.log('❌ reCAPTCHA not fully configured');
    console.log('');
    console.log('📝 To complete setup:');
    console.log('1. Go to: https://www.google.com/recaptcha/admin');
    console.log('2. Create a new reCAPTCHA v2 site');
    console.log('3. Add your domains: partsformyrd350.com, www.partsformyrd350.com, localhost');
    console.log('4. Copy the Site Key and Secret Key');
    console.log('5. Add them to your Render environment variables:');
    console.log('   - REACT_APP_RECAPTCHA_SITE_KEY=your-site-key');
    console.log('   - RECAPTCHA_SECRET_KEY=your-secret-key');
  } else {
    console.log('✅ reCAPTCHA appears to be configured');
    console.log('');
    console.log('🎯 Next steps:');
    console.log('1. Deploy your application');
    console.log('2. Test the login/register forms');
    console.log('3. Verify reCAPTCHA widgets appear');
    console.log('4. Test form submission with reCAPTCHA');
  }
  
  console.log('');

  // Test 5: Security recommendations
  console.log('🛡️ Security Recommendations:');
  console.log('- ✅ Use reCAPTCHA v2 for better user experience');
  console.log('- ✅ Set minimum score to 0.5 for balanced security');
  console.log('- ✅ Monitor failed reCAPTCHA attempts in logs');
  console.log('- ✅ Combine with rate limiting for maximum protection');
  console.log('- ✅ Test on different devices and browsers');
  
  console.log('');
  console.log('🎉 reCAPTCHA configuration test completed!');
}

// Run the test
testRecaptchaConfiguration().catch(console.error);
