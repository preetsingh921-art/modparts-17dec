const db = require('../../lib/db');
const { verifyAdminToken } = require('../../lib/auth');

module.exports = async function handler(req, res) {
    try {
        // Verify admin access
        const decoded = verifyAdminToken(req);
        if (!decoded) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // GET - List users
        if (req.method === 'GET') {
            const { role } = req.query;

            let queryText = `
                SELECT id, email, first_name, last_name, role, warehouse_id, is_approved, created_at
                FROM users
                WHERE 1=1
            `;
            const params = [];

            // Filter by role if provided
            if (role) {
                queryText += ` AND role = $1`;
                params.push(role);
            }

            queryText += ` ORDER BY first_name, last_name`;

            const result = await db.query(queryText, params);

            return res.json({ users: result.rows });
        }

        return res.status(405).json({ message: 'Method not allowed' });

    } catch (error) {
        console.error('Users API error:', error);
        return res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
};
