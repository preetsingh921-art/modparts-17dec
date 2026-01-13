const db = require('../../lib/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  // CORS is handled by dev-server middleware

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Login attempt for:', req.body?.email);

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    console.log('Attempting Neon DB query for user:', email);

    // Get user from Neon
    const query = 'SELECT * FROM users WHERE email = $1';
    const { rows } = await db.query(query, [email]);
    const user = rows[0];

    if (!user) {
      console.log('Login failed: User not found');
      // Return 401 for generic invalid credentials
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    // NOTE: If you are migrating legacy users from Supabase, their hashes might be compatible (bcrypt) 
    // or you might need a special check if Supabase used diverse algorithms (typically bcrypt).
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      console.log('Login failed: Invalid password');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check user status
    if (user.status === 'pending_verification' || (user.email_verified === false && user.email_verification_token)) {
      console.log('Login blocked: User needs email verification:', user.email);
      return res.status(403).json({
        message: 'Please verify your email address before logging in.',
        verification_required: true,
        status: 'pending_verification'
      });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({
        message: 'Your account has been rejected.',
        status: 'rejected'
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        message: 'Your account has been suspended.',
        status: 'suspended'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        userId: user.id, // Compatibility
        email: user.email,
        role: user.role,
        warehouse_id: user.warehouse_id // Include warehouse assignment
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    // Return user data and token
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        warehouse_id: user.warehouse_id // Include warehouse assignment
      }
    });

  } catch (error) {
    console.error('Login error details:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};
