const db = require('../../lib/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

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

    // Check if user has admin role
    if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

module.exports = async (req, res) => {
  // CORS is handled by dev-server middleware

  // Verify admin access
  const adminUser = verifyAdminToken(req);
  if (!adminUser) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  try {
    if (req.method === 'GET') {
      // Get all users
      console.log('🔍 Admin fetching all users (Neon)...');

      const query = `
        SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_approved, 
               u.created_at, u.phone, u.address, u.city, u.state, u.zip_code,
               u.warehouse_id, w.name as warehouse_name
        FROM users u
        LEFT JOIN warehouses w ON u.warehouse_id = w.id
        ORDER BY u.created_at DESC
      `;

      const { rows: users } = await db.query(query);

      console.log(`✅ Successfully fetched ${users.length} users from Neon`);

      // Map is_approved to status for frontend compatibility
      const usersWithStatus = users.map(user => ({
        ...user,
        status: user.is_approved ? 'active' : 'pending_approval'
      }));

      return res.status(200).json({
        success: true,
        data: usersWithStatus,
        count: users.length
      });

    } else if (req.method === 'POST') {
      // Create new user
      let { email, password, first_name, last_name, name, role = 'customer', phone, address, city, state, zip_code, warehouse_id } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      if (name && !first_name && !last_name) {
        const parts = name.trim().split(/\s+/);
        first_name = parts[0] || '';
        last_name = parts.slice(1).join(' ') || '';
      }

      console.log('👤 Admin creating new user:', email);

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const insertQuery = `
        INSERT INTO users (email, password, first_name, last_name, role, phone, address, city, state, zip_code, warehouse_id, is_approved, email_verified, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, true, NOW(), NOW())
        RETURNING id, email, first_name, last_name, role, phone, address, city, state, zip_code, warehouse_id, is_approved, created_at
      `;

      const { rows } = await db.query(insertQuery, [
        email, hashedPassword, first_name || null, last_name || null, role,
        phone || null, address || null, city || null, state || null, zip_code || null,
        warehouse_id ? parseInt(warehouse_id) : null
      ]);

      const user = rows[0];
      console.log('✅ User created successfully:', user.id);

      let warehouseName = null;
      if (user.warehouse_id) {
        const whResult = await db.query('SELECT name FROM warehouses WHERE id = $1', [user.warehouse_id]);
        warehouseName = whResult.rows[0]?.name || null;
      }

      return res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: { ...user, warehouse_name: warehouseName, status: user.is_approved ? 'active' : 'pending_approval' }
      });

    } else if (req.method === 'PUT') {
      // Update user
      let { id, email, first_name, last_name, name, role, phone, address, city, state, zip_code, status, warehouse_id, password } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      console.log('📝 Admin updating user:', id);

      if (name && first_name === undefined && last_name === undefined) {
        const parts = name.trim().split(/\s+/);
        first_name = parts[0] || '';
        last_name = parts.slice(1).join(' ') || '';
      }

      // Build dynamic update query
      const updates = [];
      const values = [];
      let idx = 1;

      if (email) { updates.push(`email = $${idx++}`); values.push(email); }
      if (first_name !== undefined) { updates.push(`first_name = $${idx++}`); values.push(first_name); }
      if (last_name !== undefined) { updates.push(`last_name = $${idx++}`); values.push(last_name); }
      if (role) { updates.push(`role = $${idx++}`); values.push(role); }
      if (phone !== undefined) { updates.push(`phone = $${idx++}`); values.push(phone); }
      if (address !== undefined) { updates.push(`address = $${idx++}`); values.push(address); }
      if (city !== undefined) { updates.push(`city = $${idx++}`); values.push(city); }
      if (state !== undefined) { updates.push(`state = $${idx++}`); values.push(state); }
      if (zip_code !== undefined) { updates.push(`zip_code = $${idx++}`); values.push(zip_code); }
      if (warehouse_id !== undefined) {
        updates.push(`warehouse_id = $${idx++}`);
        values.push(warehouse_id ? parseInt(warehouse_id) : null);
      }
      if (password && password.trim().length > 0) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updates.push(`password = $${idx++}`);
        values.push(hashedPassword);
      }

      // Handle status -> is_approved mapping
      if (status) {
        const isApproved = status === 'active';
        updates.push(`is_approved = $${idx++}`);
        values.push(isApproved);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const updateQuery = `
        UPDATE users 
        SET ${updates.join(', ')} 
        WHERE id = $${idx}
        RETURNING id, email, first_name, last_name, role, phone, address, city, state, zip_code, warehouse_id, is_approved, created_at, updated_at
      `;

      const { rows } = await db.query(updateQuery, values);

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = rows[0];
      console.log('✅ User updated successfully:', user.id);

      let warehouseName = null;
      if (user.warehouse_id) {
        const whResult = await db.query('SELECT name FROM warehouses WHERE id = $1', [user.warehouse_id]);
        warehouseName = whResult.rows[0]?.name || null;
      }

      return res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: { ...user, warehouse_name: warehouseName, status: user.is_approved ? 'active' : 'pending_approval' }
      });

    } else if (req.method === 'DELETE') {
      // Delete user
      const userId = req.query.id || req.body.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      console.log('🗑️ Admin deleting user:', userId);

      await db.query('DELETE FROM users WHERE id = $1', [userId]);

      console.log('✅ User deleted successfully:', userId);

      return res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });

    } else {
      return res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Admin users API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
