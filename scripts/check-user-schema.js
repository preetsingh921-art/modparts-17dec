#!/usr/bin/env node

/**
 * Script to check current user table schema
 */

require('dotenv').config({ path: '.env.local' });
const { supabaseAdmin } = require('../lib/supabase');

async function checkUserSchema() {
  console.log('🔍 Checking current user table schema...');

  try {
    // Get a sample user to see current structure
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error fetching users:', error);
      return;
    }

    if (users && users.length > 0) {
      console.log('✅ Current user table structure:');
      console.log('Columns:', Object.keys(users[0]));
      console.log('Sample user (first 3 fields):', {
        id: users[0].id,
        email: users[0].email,
        role: users[0].role
      });
    } else {
      console.log('⚠️ No users found in table');
    }

    // Check if google_id and auth_provider columns exist
    const hasGoogleId = users[0] && 'google_id' in users[0];
    const hasAuthProvider = users[0] && 'auth_provider' in users[0];

    console.log('🔍 OAuth columns status:');
    console.log('- google_id:', hasGoogleId ? '✅ EXISTS' : '❌ MISSING');
    console.log('- auth_provider:', hasAuthProvider ? '✅ EXISTS' : '❌ MISSING');

    if (!hasGoogleId || !hasAuthProvider) {
      console.log('');
      console.log('📝 Manual SQL to run in Supabase SQL Editor:');
      console.log('');
      if (!hasGoogleId) {
        console.log('-- Add google_id column');
        console.log('ALTER TABLE users ADD COLUMN google_id TEXT UNIQUE;');
        console.log('');
      }
      if (!hasAuthProvider) {
        console.log('-- Add auth_provider column');
        console.log("ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'email';");
        console.log('');
        console.log('-- Update existing users');
        console.log("UPDATE users SET auth_provider = 'email' WHERE auth_provider IS NULL;");
        console.log('');
      }
    }

  } catch (error) {
    console.error('❌ Error checking schema:', error);
  }
}

checkUserSchema();
