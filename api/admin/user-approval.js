const db = require('../../lib/db');
const jwt = require('jsonwebtoken');

// JWT secret for token verification
const JWT_SECRET = process.env.JWT_SECRET;

// Helper function to verify JWT token and check admin role
function verifyAdminToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if user has admin or superadmin role
    if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

module.exports = async function handler(req, res) {
  console.log('🔍 User approval API (Neon) called');

  // Verify admin authentication
  const adminUser = verifyAdminToken(req);
  if (!adminUser) {
    return res.status(403).json({ message: 'Admin access required' });
  }

  try {
    if (req.method === 'GET') {
      // Get pending users for approval (supports both status column and is_approved boolean)
      const query = `
        SELECT id, email, first_name, last_name, phone, address,
               COALESCE(status, CASE WHEN is_approved THEN 'active' ELSE 'pending_approval' END) as status,
               is_approved, created_at
        FROM users
        WHERE status = 'pending_approval' OR (status IS NULL AND is_approved = false)
        ORDER BY created_at DESC
      `;
      const { rows: pendingUsers } = await db.query(query);

      console.log(`✅ Found ${pendingUsers.length} pending users`);
      res.status(200).json({
        success: true,
        data: pendingUsers,
        count: pendingUsers.length
      });

    } else if (req.method === 'POST') {
      // Approve or reject user
      const { user_id, action, reason } = req.body;

      if (!user_id || !action) {
        return res.status(400).json({
          message: 'User ID and action (approve/reject/suspend) are required'
        });
      }

      if (!['approve', 'reject', 'suspend'].includes(action)) {
        return res.status(400).json({
          message: 'Action must be approve, reject, or suspend'
        });
      }

      // Get user details first
      const userCheck = await db.query('SELECT id, email, first_name, last_name, status, is_approved FROM users WHERE id = $1', [user_id]);
      const user = userCheck.rows[0];

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update user status
      let newStatus;
      let message;
      const isApproved = (action === 'approve');

      switch (action) {
        case 'approve':
          newStatus = 'active';
          message = `User ${user.email} has been approved and can now login`;
          break;
        case 'reject':
          newStatus = 'rejected';
          message = `User ${user.email} has been rejected`;
          break;
        case 'suspend':
          newStatus = 'suspended';
          message = `User ${user.email} has been suspended`;
          break;
      }

      const updateQuery = `
        UPDATE users
        SET 
          status = $1,
          is_approved = $2,
          updated_at = NOW(),
          approval_reason = $3,
          approved_at = CASE WHEN $4 = 'approve' THEN NOW() ELSE approved_at END
        WHERE id = $5
        RETURNING id, email, first_name, last_name, status, is_approved, approved_at
      `;

      const { rows } = await db.query(updateQuery, [newStatus, isApproved, reason || null, action, user_id]);
      const updatedUser = rows[0];

      console.log(`✅ User ${action}d successfully:`, updatedUser.email);

      res.status(200).json({
        success: true,
        message,
        user: updatedUser
      });

    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Error in user approval API:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
