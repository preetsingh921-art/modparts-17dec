const db = require('../../lib/db');

module.exports = async function handler(req, res) {
  // CORS is handled by dev-server middleware

  console.log('🔍 Categories API called (Neon)');
  console.log('Request method:', req.method);

  try {
    if (req.method === 'GET') {
      const query = `
        SELECT * FROM categories 
        ORDER BY name ASC
      `;

      const { rows } = await db.query(query);

      console.log('✅ Categories fetched successfully:', rows.length, 'categories');

      return res.status(200).json({
        message: 'Categories retrieved successfully',
        data: rows
      });

    } else if (req.method === 'POST') {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ message: 'Category name is required' });
      }

      const insertQuery = `
        INSERT INTO categories (name, description, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        RETURNING *
      `;

      try {
        const { rows } = await db.query(insertQuery, [name, description || null]);

        return res.status(201).json({
          message: 'Category created successfully',
          data: rows[0]
        });
      } catch (err) {
        console.error('Error creating category:', err);
        return res.status(500).json({
          message: 'Failed to create category',
          error: err.message
        });
      }
    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Categories API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
