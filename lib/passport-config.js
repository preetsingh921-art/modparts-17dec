const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { supabaseAdmin } = require('./supabase');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.NODE_ENV === 'production' 
    ? "https://www.partsformyrd350.com/auth/google/callback"
    : "http://localhost:3000/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('🔍 Google OAuth callback received');
    console.log('Profile ID:', profile.id);
    console.log('Profile email:', profile.emails?.[0]?.value);
    console.log('Profile name:', profile.displayName);

    const email = profile.emails?.[0]?.value;
    const firstName = profile.name?.givenName || '';
    const lastName = profile.name?.familyName || '';
    const googleId = profile.id;

    if (!email) {
      console.error('❌ No email found in Google profile');
      return done(new Error('No email found in Google profile'), null);
    }

    // Check if user already exists by email
    const { data: existingUser, error: findError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      console.error('❌ Database error while finding user:', findError);
      return done(findError, null);
    }

    if (existingUser) {
      console.log('✅ Existing user found:', existingUser.email);
      
      // Update user with Google ID if not already set
      if (!existingUser.google_id) {
        console.log('🔄 Adding Google ID to existing user');
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({ 
            google_id: googleId,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingUser.id);

        if (updateError) {
          console.error('❌ Error updating user with Google ID:', updateError);
        } else {
          console.log('✅ Google ID added to existing user');
          existingUser.google_id = googleId;
        }
      }

      return done(null, existingUser);
    }

    // Create new user with Google OAuth data
    console.log('➕ Creating new user from Google OAuth');
    
    // Generate a random password for Google users (they won't use it)
    const randomPassword = Math.random().toString(36).slice(-12);
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    const newUserData = {
      email,
      password: hashedPassword,
      first_name: firstName,
      last_name: lastName,
      google_id: googleId,
      role: 'customer',
      status: 'pending_approval', // Google users still need admin approval
      email_verified: true, // Google emails are pre-verified
      created_at: new Date().toISOString(),
      auth_provider: 'google'
    };

    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert([newUserData])
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating new user:', createError);
      return done(createError, null);
    }

    console.log('✅ New user created from Google OAuth:', newUser.email);
    return done(null, newUser);

  } catch (error) {
    console.error('❌ Google OAuth strategy error:', error);
    return done(error, null);
  }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  console.log('🔐 Serializing user:', user.id);
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    console.log('🔓 Deserializing user:', id);
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Error deserializing user:', error);
      return done(error, null);
    }

    console.log('✅ User deserialized:', user.email);
    done(null, user);
  } catch (error) {
    console.error('❌ Deserialize error:', error);
    done(error, null);
  }
});

module.exports = passport;
