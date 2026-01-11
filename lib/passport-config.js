const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./db');
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

    if (!email) {
      console.error('❌ No email found in Google profile');
      return done(new Error('No email found in Google profile'), null);
    }

    // Check if user already exists by email (using Neon DB)
    const findQuery = `SELECT * FROM users WHERE email = $1`;
    const { rows: existingUsers } = await db.query(findQuery, [email]);
    const existingUser = existingUsers[0];

    if (existingUser) {
      console.log('✅ Existing user found:', existingUser.email);
      // For Google OAuth, mark email as verified if not already
      if (!existingUser.email_verified) {
        console.log('🔄 Marking email as verified for Google OAuth user');
        await db.query('UPDATE users SET email_verified = true, updated_at = NOW() WHERE id = $1', [existingUser.id]);
        existingUser.email_verified = true;
      }
      return done(null, existingUser);
    }

    // Create new user with Google OAuth data
    console.log('➕ Creating new user from Google OAuth');

    // Generate a random password for Google users (they won't use it)
    const randomPassword = Math.random().toString(36).slice(-12);
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    const insertQuery = `
      INSERT INTO users (email, password, first_name, last_name, role, is_approved, email_verified, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'customer', true, true, NOW(), NOW())
      RETURNING *
    `;

    const { rows: newUsers } = await db.query(insertQuery, [
      email, hashedPassword, firstName, lastName
    ]);
    const newUser = newUsers[0];

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
    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    const user = rows[0];

    if (!user) {
      console.error('❌ User not found during deserialization');
      return done(null, null);
    }

    console.log('✅ User deserialized:', user.email);
    done(null, user);
  } catch (error) {
    console.error('❌ Deserialize error:', error);
    done(error, null);
  }
});

module.exports = passport;
