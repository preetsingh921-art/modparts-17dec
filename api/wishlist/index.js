const db = require('../../lib/db');
const jwt = require('jsonwebtoken');

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
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const userId = user.userId || user.id;

  try {
    if (req.method === 'GET') {
      // Get user's wishlist items with product details
      console.log('💝 Fetching wishlist (Neon) for user:', userId);

      const query = `
        SELECT 
          wi.id, 
          wi.product_id, 
          wi.created_at,
          p.id as p_id,
          p.name,
          p.description,
          p.price,
          p.quantity,
          p.image_url,
          p.condition_status,
          c.id as category_id,
          c.name as category_name
        FROM wishlist_items wi
        JOIN products p ON wi.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE wi.user_id = $1
        ORDER BY wi.created_at DESC
      `;

      const { rows } = await db.query(query, [userId]);

      // Transform result to match existing frontend structure (nesting product)
      const transformedItems = rows.map(row => ({
        id: row.id,
        product_id: row.product_id,
        created_at: row.created_at,
        products: {
          id: row.p_id,
          name: row.name,
          description: row.description,
          price: row.price,
          quantity: row.quantity,
          image_url: row.image_url,
          condition_status: row.condition_status,
          categories: {
            id: row.category_id,
            name: row.category_name
          }
        }
      }));

      console.log(`✅ Successfully fetched ${transformedItems.length} wishlist items`);

      return res.status(200).json({
        success: true,
        data: {
          items: transformedItems,
          count: transformedItems.length
        }
      });

    } else if (req.method === 'POST') {
      // Add item to wishlist
      const { product_id } = req.body;

      if (!product_id) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required'
        });
      }

      console.log('💝 Adding product to wishlist:', { user_id: userId, product_id });

      // Check if product exists
      const productCheck = await db.query('SELECT id FROM products WHERE id = $1', [product_id]);
      if (productCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      // Check if item is already in wishlist
      const existsCheck = await db.query(
        'SELECT id FROM wishlist_items WHERE user_id = $1 AND product_id = $2',
        [userId, product_id]
      );

      if (existsCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Product is already in your wishlist'
        });
      }

      // Add to wishlist
      const insertQuery = `
        INSERT INTO wishlist_items (user_id, product_id, created_at)
        VALUES ($1, $2, NOW())
        RETURNING *
      `;
      const { rows } = await db.query(insertQuery, [userId, product_id]);
      const wishlistItem = rows[0];

      console.log('✅ Successfully added to wishlist:', wishlistItem.id);

      return res.status(201).json({
        success: true,
        message: 'Product added to wishlist',
        data: wishlistItem
      });

    } else if (req.method === 'DELETE') {
      // Remove item from wishlist
      const { product_id } = req.body;

      if (!product_id) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required'
        });
      }

      console.log('💝 Removing product from wishlist:', { user_id: userId, product_id });

      await db.query(
        'DELETE FROM wishlist_items WHERE user_id = $1 AND product_id = $2',
        [userId, product_id]
      );

      console.log('✅ Successfully removed from wishlist');

      return res.status(200).json({
        success: true,
        message: 'Product removed from wishlist'
      });

    } else {
      return res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Wishlist API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
