#!/usr/bin/env node

/**
 * Script to add Google OAuth fields to the users table
 */

require('dotenv').config({ path: '.env.local' });
const { supabaseAdmin } = require('../lib/supabase');

async function updateDatabaseForOAuth() {
  console.log('🔧 Adding Google OAuth fields to users table...');

  try {
    // Add google_id column
    console.log('➕ Adding google_id column...');
    const { error: googleIdError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;
      `
    });

    if (googleIdError && !googleIdError.message.includes('already exists')) {
      console.error('❌ Error adding google_id column:', googleIdError);
    } else {
      console.log('✅ google_id column added successfully');
    }

    // Add auth_provider column
    console.log('➕ Adding auth_provider column...');
    const { error: authProviderError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email';
      `
    });

    if (authProviderError && !authProviderError.message.includes('already exists')) {
      console.error('❌ Error adding auth_provider column:', authProviderError);
    } else {
      console.log('✅ auth_provider column added successfully');
    }

    // Update existing users
    console.log('🔄 Updating existing users...');
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ auth_provider: 'email' })
      .is('auth_provider', null);

    if (updateError) {
      console.error('❌ Error updating existing users:', updateError);
    } else {
      console.log('✅ Existing users updated successfully');
    }

    // Verify the changes
    console.log('🔍 Verifying database changes...');
    const { data: sampleUser, error: verifyError } = await supabaseAdmin
      .from('users')
      .select('id, email, google_id, auth_provider')
      .limit(1)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying changes:', verifyError);
    } else {
      console.log('✅ Database schema updated successfully');
      console.log('Sample user structure:', {
        id: sampleUser.id,
        email: sampleUser.email,
        google_id: sampleUser.google_id || 'null',
        auth_provider: sampleUser.auth_provider
      });
    }

    console.log('🎉 Database update completed successfully!');

  } catch (error) {
    console.error('❌ Database update failed:', error);
    process.exit(1);
  }
}

// Run the update
updateDatabaseForOAuth();
