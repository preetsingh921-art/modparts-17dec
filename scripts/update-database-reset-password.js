#!/usr/bin/env node

/**
 * Script to add password reset fields to the users table
 */

require('dotenv').config({ path: '.env.local' });
const { supabaseAdmin } = require('../lib/supabase');

async function updateDatabaseForPasswordReset() {
  console.log('🔐 Adding password reset fields to users table...');

  try {
    // Check current user structure first
    console.log('🔍 Checking current user table structure...');
    const { data: sampleUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('*')
      .limit(1)
      .single();

    if (checkError) {
      console.error('❌ Error checking user table:', checkError);
      return;
    }

    console.log('📋 Current user table columns:', Object.keys(sampleUser));

    // Check if reset fields already exist
    const hasResetToken = 'reset_token' in sampleUser;
    const hasResetTokenExpiry = 'reset_token_expiry' in sampleUser;

    console.log('🔍 Password reset fields status:');
    console.log('- reset_token:', hasResetToken ? '✅ EXISTS' : '❌ MISSING');
    console.log('- reset_token_expiry:', hasResetTokenExpiry ? '✅ EXISTS' : '❌ MISSING');

    if (hasResetToken && hasResetTokenExpiry) {
      console.log('✅ Password reset fields already exist!');
      return;
    }

    console.log('');
    console.log('📝 Manual SQL to run in Supabase SQL Editor:');
    console.log('');
    
    if (!hasResetToken) {
      console.log('-- Add reset_token column');
      console.log('ALTER TABLE users ADD COLUMN reset_token TEXT;');
      console.log('');
    }
    
    if (!hasResetTokenExpiry) {
      console.log('-- Add reset_token_expiry column');
      console.log('ALTER TABLE users ADD COLUMN reset_token_expiry TIMESTAMPTZ;');
      console.log('');
    }
    
    console.log('-- Add indexes for performance');
    console.log('CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);');
    console.log('CREATE INDEX IF NOT EXISTS idx_users_reset_token_expiry ON users(reset_token_expiry);');
    console.log('');

    console.log('🎯 After running the SQL above, your users table will support password reset functionality!');

  } catch (error) {
    console.error('❌ Database check failed:', error);
  }
}

// Run the check
updateDatabaseForPasswordReset();
