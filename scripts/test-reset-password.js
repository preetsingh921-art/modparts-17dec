#!/usr/bin/env node

/**
 * Test script to debug password reset issues
 */

require('dotenv').config({ path: '.env.local' });
const { supabaseAdmin } = require('../lib/supabase');

async function testPasswordReset() {
  console.log('🔍 Testing password reset setup...');
  console.log('');

  // Test 1: Check environment variables
  console.log('📋 Environment Variables:');
  console.log('- EMAIL_USER:', process.env.EMAIL_USER || '❌ MISSING');
  console.log('- EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✅ SET' : '❌ MISSING');
  console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ SET' : '❌ MISSING');
  console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ SET' : '❌ MISSING');
  console.log('');

  // Test 2: Check database schema
  console.log('🗄️ Database Schema Check:');
  try {
    const { data: sampleUser, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.log('❌ Database connection failed:', error.message);
      return;
    }

    const columns = Object.keys(sampleUser);
    console.log('✅ Database connected successfully');
    console.log('- reset_token:', columns.includes('reset_token') ? '✅ EXISTS' : '❌ MISSING');
    console.log('- reset_token_expiry:', columns.includes('reset_token_expiry') ? '✅ EXISTS' : '❌ MISSING');
    console.log('');

    // Test 3: Check if test user exists
    console.log('👤 Test User Check:');
    const { data: testUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, auth_provider')
      .eq('email', 'sarabjot.singh.acode@gmail.com')
      .single();

    if (userError) {
      console.log('❌ Test user not found:', userError.message);
    } else {
      console.log('✅ Test user found:');
      console.log('  - ID:', testUser.id);
      console.log('  - Email:', testUser.email);
      console.log('  - Auth Provider:', testUser.auth_provider || 'email');
    }
    console.log('');

    // Test 4: Test email configuration
    console.log('📧 Email Configuration Test:');
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log('❌ Email not configured - missing EMAIL_USER or EMAIL_PASSWORD');
    } else {
      console.log('✅ Email configuration appears complete');
      console.log('  - From:', process.env.EMAIL_USER);
      console.log('  - Password length:', process.env.EMAIL_PASSWORD.length, 'characters');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  console.log('');
  console.log('🎯 Next Steps:');
  console.log('1. If database fields are missing, run the SQL in Supabase');
  console.log('2. If environment variables are missing, add them to Render');
  console.log('3. Check Render logs for specific error details');
}

testPasswordReset();
