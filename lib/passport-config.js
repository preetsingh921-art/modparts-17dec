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
    const googleId = profile.id;

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

      // Update user with Google ID if not already set
      if (!existingUser.google_id) {
        console.log('🔄 Adding Google ID to existing user');
        const updateQuery = `UPDATE users SET google_id = $1, updated_at = NOW() WHERE id = $2`;
        await db.query(updateQuery, [googleId, existingUser.id]);
        existingUser.google_id = googleId;
        console.log('✅ Google ID added to existing user');
      }

      return done(null, existingUser);
    }

    // Create new user with Google OAuth data
    console.log('➕ Creating new user from Google OAuth');

    // Generate a random password for Google users (they won't use it)
    const randomPassword = Math.random().toString(36).slice(-12);
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    const insertQuery = `
      INSERT INTO users (email, password, first_name, last_name, google_id, role, is_approved, email_verified, created_at)
      VALUES ($1, $2, $3, $4, $5, 'customer', true, true, NOW())
      RETURNING *
    `;

    const { rows: newUsers } = await db.query(insertQuery, [
      email, hashedPassword, firstName, lastName, googleId
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
