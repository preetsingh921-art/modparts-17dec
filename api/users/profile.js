const db = require('../../lib/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Helper function to verify JWT token
function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
  } catch (error) {
    return null;
  }
}

module.exports = async function handler(req, res) {
  // CORS is handled by dev-server middleware

  // Verify authentication
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const userId = user.userId || user.id;

  try {
    if (req.method === 'GET') {
      // Get user profile
      const query = `
        SELECT id, email, first_name, last_name, address, city, state, zip_code, phone, role, created_at
        FROM users
        WHERE id = $1
      `;
      const { rows } = await db.query(query, [userId]);
      const userProfile = rows[0];

      if (!userProfile) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.status(200).json({
        message: 'User profile retrieved successfully',
        data: userProfile
      });

    } else if (req.method === 'PUT') {
      // Update user profile
      const {
        first_name,
        last_name,
        address,
        city,
        state,
        zip_code,
        phone,
        current_password,
        new_password
      } = req.body;

      // Get current user to verify password if changing it, or just for existence check
      const userCheck = await db.query('SELECT password FROM users WHERE id = $1', [userId]);
      const currentUser = userCheck.rows[0];

      if (!currentUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      let passwordHash = currentUser.password;

      // If changing password, verify current password
      if (new_password) {
        if (!current_password) {
          return res.status(400).json({
            message: 'Current password is required to change password'
          });
        }

        const isValidPassword = await bcrypt.compare(current_password, currentUser.password);
        if (!isValidPassword) {
          return res.status(400).json({ message: 'Current password is incorrect' });
        }

        // Hash new password
        passwordHash = await bcrypt.hash(new_password, 10);
      }

      // Prepare update fields
      const updates = [];
      const values = [];
      let idx = 1;

      // Always allow updating these fields if provided, or keep existing (handling this in SQL or via COALESCE is option, 
      // but dynamic update query is cleaner to only touch provided fields)

      const fields = {
        first_name, last_name, address, city, state, zip_code, phone
      };

      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) { // Allow empty strings if user wants to clear them
          updates.push(`${key} = $${idx++}`);
          values.push(value);
        }
      }

      // Update password if changed
      if (new_password) {
        updates.push(`password = $${idx++}`);
        values.push(passwordHash);
      }

      if (updates.length > 0) {
        updates.push(`updated_at = NOW()`);
        values.push(userId); // ID is the last parameter

        const updateQuery = `
          UPDATE users
          SET ${updates.join(', ')}
          WHERE id = $${idx}
          RETURNING id, email, first_name, last_name, address, city, state, zip_code, phone, role
        `;

        const { rows } = await db.query(updateQuery, values);
        const updatedUser = rows[0];

        res.status(200).json({
          message: new_password ? 'User profile and password updated successfully' : 'User profile updated successfully',
          data: updatedUser
        });
      } else {
        // No changes provided
        res.status(200).json({
          message: 'No changes provided',
          data: await db.query('SELECT id, email, first_name, last_name, address, city, state, zip_code, phone, role FROM users WHERE id = $1', [userId]).then(r => r.rows[0])
        });
      }

    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('User profile API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
