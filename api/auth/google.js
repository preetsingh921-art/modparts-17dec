const passport = require('../../lib/passport-config');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  console.log('🔍 Google OAuth route called');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);

  // Handle different OAuth endpoints
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  try {
    if (pathname === '/auth/google') {
      // Initiate Google OAuth
      console.log('🚀 Initiating Google OAuth flow');

      passport.authenticate('google', {
        scope: ['profile', 'email']
      })(req, res);

    } else if (pathname === '/auth/google/callback') {
      // Handle Google OAuth callback
      console.log('🔄 Handling Google OAuth callback');

      passport.authenticate('google', {
        session: false,
        failureRedirect: '/login?error=oauth_failed'
      }, async (err, user, info) => {
        try {
          if (err) {
            console.error('❌ OAuth authentication error:', err);
            return res.redirect('/login?error=oauth_error');
          }

          if (!user) {
            console.error('❌ No user returned from OAuth');
            return res.redirect('/login?error=oauth_no_user');
          }

          console.log('✅ OAuth authentication successful for:', user.email);
          console.log('User is_approved:', user.is_approved, 'email_verified:', user.email_verified);

          // Check user status - using is_approved (boolean) from schema
          if (!user.email_verified) {
            console.log('⏳ User needs email verification, redirecting with message');
            return res.redirect('/login?status=pending_verification&email=' + encodeURIComponent(user.email));
          }

          if (user.is_approved === false) {
            console.log('❌ User account not approved');
            return res.redirect('/login?error=account_pending');
          }

          // Generate JWT token for active users
          const token = jwt.sign(
            {
              id: user.id,
              email: user.email,
              role: user.role
            },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '24h' }
          );

          console.log('🎫 JWT token generated for user:', user.email);

          // Prepare user data for frontend
          const userData = {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role
          };

          // Redirect to frontend with token and user data
          const redirectUrl = process.env.NODE_ENV === 'production'
            ? 'https://www.partsformyrd350.com'
            : 'http://localhost:3000';

          const params = new URLSearchParams({
            token: token,
            user: JSON.stringify(userData),
            oauth_success: 'true'
          });

          console.log('🔄 Redirecting to frontend with auth data');
          res.redirect(`${redirectUrl}/auth/callback?${params.toString()}`);

        } catch (callbackError) {
          console.error('❌ Error in OAuth callback handler:', callbackError);
          res.redirect('/login?error=callback_error');
        }
      })(req, res);

    } else {
      // Unknown OAuth endpoint
      console.error('❌ Unknown OAuth endpoint:', pathname);
      res.status(404).json({ message: 'OAuth endpoint not found' });
    }

  } catch (error) {
    console.error('❌ Google OAuth route error:', error);
    res.status(500).json({
      message: 'OAuth authentication failed',
      error: error.message
    });
  }
};
