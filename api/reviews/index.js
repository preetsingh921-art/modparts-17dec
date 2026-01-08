const db = require('../../lib/db');
const jwt = require('jsonwebtoken');

// Helper function to verify JWT token
function verifyToken(req) {
  console.log('🔐 Verifying token...');
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ No valid auth header found');
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    console.log('✅ Token verified successfully:', { id: decoded.userId || decoded.id, email: decoded.email });
    return decoded;
  } catch (error) {
    console.log('❌ Token verification failed:', error.message);
    return null;
  }
}

module.exports = async function handler(req, res) {
  console.log('📝 Reviews API (Neon) called:', req.method, req.path);

  try {
    const { method, query, body } = req;
    const { product_id, review_id, page = 1, limit = 10, sort = 'newest', status = 'all' } = query;

    // Standardize page/limit
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    switch (method) {
      case 'GET':
        if (product_id) {
          return await getProductReviews(req, res, product_id, pageNum, limitNum, offset, sort);
        } else if (review_id) {
          return await getReviewById(req, res, review_id);
        } else {
          return await getAllReviews(req, res, pageNum, limitNum, offset, status);
        }

      case 'POST':
        return await createReview(req, res, body);

      case 'PUT':
        if (review_id) {
          return await updateReview(req, res, review_id, body);
        } else {
          return res.status(400).json({ success: false, message: 'Review ID is required for updates' });
        }

      case 'DELETE':
        if (review_id) {
          return await deleteReview(req, res, review_id);
        } else {
          return res.status(400).json({ success: false, message: 'Review ID is required for deletion' });
        }

      default:
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('❌ Reviews API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get reviews for a specific product
async function getProductReviews(req, res, productId, page, limit, offset, sort) {
  try {
    console.log(`📝 Fetching reviews for product ${productId}`);

    // Build sort clause - schema uses helpful_count directly
    let sortClause = 'pr.created_at DESC';
    switch (sort) {
      case 'oldest': sortClause = 'pr.created_at ASC'; break;
      case 'highest_rating': sortClause = 'pr.rating DESC'; break;
      case 'lowest_rating': sortClause = 'pr.rating ASC'; break;
      case 'most_helpful': sortClause = 'pr.helpful_count DESC'; break;
    }

    // Fetch Reviews with User info
    // Schema uses: title, comment (not review_title, review_text)
    // Schema does NOT have is_approved column - return all reviews
    const reviewsQuery = `
      SELECT 
        pr.id, pr.product_id, pr.user_id, pr.rating, 
        pr.title, pr.comment, 
        pr.is_verified_purchase, pr.helpful_count, pr.not_helpful_count,
        pr.created_at, pr.updated_at,
        u.first_name, u.last_name, u.email
      FROM product_reviews pr
      LEFT JOIN users u ON pr.user_id = u.id
      WHERE pr.product_id = $1
      ORDER BY ${sortClause}
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `SELECT COUNT(*) FROM product_reviews WHERE product_id = $1`;

    const [reviewsResult, countResult] = await Promise.all([
      db.query(reviewsQuery, [productId, limit, offset]),
      db.query(countQuery, [productId])
    ]);

    const reviews = reviewsResult.rows;
    const totalCount = parseInt(countResult.rows[0].count);

    // Calculate Stats (Rating Distribution & Avg)
    const statsQuery = `
      SELECT rating, COUNT(*) as count 
      FROM product_reviews 
      WHERE product_id = $1
      GROUP BY rating
    `;
    const statsResult = await db.query(statsQuery, [productId]);

    const distribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    let sumRating = 0;
    let totalReviews = 0;

    statsResult.rows.forEach(row => {
      distribution[row.rating] = parseInt(row.count);
      sumRating += row.rating * parseInt(row.count);
      totalReviews += parseInt(row.count);
    });

    const averageRating = totalReviews > 0 ? sumRating / totalReviews : 0;

    // Format response - map schema columns to frontend expected format
    const formattedReviews = reviews.map(review => ({
      id: review.id,
      rating: review.rating,
      title: review.title,           // Schema column: title
      text: review.comment,          // Schema column: comment
      isVerifiedPurchase: review.is_verified_purchase,
      helpfulCount: parseInt(review.helpful_count) || 0,
      notHelpfulCount: parseInt(review.not_helpful_count) || 0,
      createdAt: review.created_at,
      updatedAt: review.updated_at,
      user: {
        id: review.user_id,
        name: `${review.first_name || ''} ${review.last_name || ''}`.trim() || 'Anonymous',
        email: review.email
      }
    }));

    return res.status(200).json({
      success: true,
      data: {
        reviews: formattedReviews,
        pagination: {
          page: page,
          limit: limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        },
        statistics: {
          averageRating: parseFloat(averageRating.toFixed(1)),
          totalReviews,
          ratingDistribution: distribution
        }
      }
    });

  } catch (error) {
    console.error('❌ Error in getProductReviews:', error);
    throw error;
  }
}

// Create a new review
async function createReview(req, res, body) {
  try {
    // Accept both naming conventions from frontend
    const { product_id, rating, title, review_title, comment, review_text } = body;
    const reviewTitle = title || review_title;
    const reviewComment = comment || review_text;

    const user = verifyToken(req);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid authorization' });
    }
    const userId = user.userId || user.id;

    if (!product_id || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Product ID and valid rating (1-5) are required' });
    }

    // Check existing review
    const checkQuery = `SELECT id FROM product_reviews WHERE user_id = $1 AND product_id = $2`;
    const checkResult = await db.query(checkQuery, [userId, product_id]);

    if (checkResult.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this product' });
    }

    // Check verified purchase
    const purchaseQuery = `
      SELECT 1 FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = $1 AND oi.product_id = $2
      LIMIT 1
    `;
    const purchaseResult = await db.query(purchaseQuery, [userId, product_id]);
    const isVerifiedPurchase = purchaseResult.rows.length > 0;

    // Insert Review - use schema column names: title, comment
    const insertQuery = `
      INSERT INTO product_reviews 
      (product_id, user_id, rating, title, comment, is_verified_purchase, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;

    const { rows } = await db.query(insertQuery, [
      product_id,
      userId,
      rating,
      reviewTitle || null,
      reviewComment || null,
      isVerifiedPurchase
    ]);

    const review = rows[0];
    console.log('✅ Review created successfully:', review.id);

    return res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: {
        id: review.id,
        rating: review.rating,
        title: review.title,
        text: review.comment,
        isVerifiedPurchase: review.is_verified_purchase,
        helpfulCount: 0,
        createdAt: review.created_at,
        user: { name: user.email || 'Anonymous' }
      }
    });

  } catch (error) {
    console.error('❌ Error in createReview:', error);
    throw error;
  }
}

// Update an existing review
async function updateReview(req, res, reviewId, body) {
  try {
    const { rating, title, review_title, comment, review_text } = body;
    const reviewTitleVal = title || review_title;
    const reviewCommentVal = comment || review_text;

    const user = verifyToken(req);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Authorization required' });
    }
    const userId = user.userId || user.id;

    // Check role and ownership
    const userQuery = `SELECT role FROM users WHERE id = $1`;
    const userRes = await db.query(userQuery, [userId]);
    const isAdmin = userRes.rows[0]?.role === 'admin';

    const reviewQuery = `SELECT user_id FROM product_reviews WHERE id = $1`;
    const reviewRes = await db.query(reviewQuery, [reviewId]);

    if (reviewRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    const isOwner = reviewRes.rows[0].user_id === userId;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Build update query with correct schema column names
    const updates = [];
    const values = [];
    let idx = 1;

    if (rating !== undefined) { updates.push(`rating = $${idx++}`); values.push(rating); }
    if (reviewTitleVal !== undefined) { updates.push(`title = $${idx++}`); values.push(reviewTitleVal); }
    if (reviewCommentVal !== undefined) { updates.push(`comment = $${idx++}`); values.push(reviewCommentVal); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(reviewId);

    const updateSql = `
      UPDATE product_reviews 
      SET ${updates.join(', ')} 
      WHERE id = $${idx} 
      RETURNING *
    `;

    const { rows } = await db.query(updateSql, values);

    return res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: rows[0]
    });

  } catch (error) {
    console.error('❌ Error in updateReview:', error);
    throw error;
  }
}

// Delete a review
async function deleteReview(req, res, reviewId) {
  try {
    const user = verifyToken(req);
    if (!user) return res.status(401).json({ success: false, message: 'Authorization required' });
    const userId = user.userId || user.id;

    // Check permissions (Admin or Owner)
    const [userRes, reviewRes] = await Promise.all([
      db.query('SELECT role FROM users WHERE id = $1', [userId]),
      db.query('SELECT user_id FROM product_reviews WHERE id = $1', [reviewId])
    ]);

    const isAdmin = userRes.rows[0]?.role === 'admin';
    const review = reviewRes.rows[0];

    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

    if (!isAdmin && review.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await db.query('DELETE FROM product_reviews WHERE id = $1', [reviewId]);
    console.log('✅ Review deleted successfully:', reviewId);

    return res.status(200).json({ success: true, message: 'Review deleted successfully' });

  } catch (error) {
    console.error('❌ Error in deleteReview:', error);
    throw error;
  }
}

// Get all reviews (admin only)
async function getAllReviews(req, res, page, limit, offset, status) {
  try {
    const user = verifyToken(req);
    if (!user) return res.status(401).json({ success: false, message: 'Authorization required' });

    // Check role from DB to be safe
    const userRes = await db.query('SELECT role FROM users WHERE id = $1', [user.userId || user.id]);
    if (userRes.rows[0]?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    // No is_approved column in schema, so no status filtering
    const query = `
      SELECT 
        pr.id, pr.product_id, pr.user_id, pr.rating, 
        pr.title, pr.comment, 
        pr.is_verified_purchase, pr.helpful_count, pr.not_helpful_count,
        pr.created_at, pr.updated_at,
        u.first_name, u.last_name, u.email,
        p.name as product_name
      FROM product_reviews pr
      LEFT JOIN users u ON pr.user_id = u.id
      LEFT JOIN products p ON pr.product_id = p.id
      ORDER BY pr.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const countSql = `SELECT COUNT(*) FROM product_reviews`;

    const [rowsResult, countResult] = await Promise.all([
      db.query(query, [limit, offset]),
      db.query(countSql)
    ]);

    return res.status(200).json({
      success: true,
      data: {
        reviews: rowsResult.rows,
        pagination: {
          page: page,
          limit: limit,
          total: parseInt(countResult.rows[0].count),
          totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error in getAllReviews:', error);
    throw error;
  }
}

// Get single review by ID
async function getReviewById(req, res, reviewId) {
  try {
    const query = `
      SELECT 
        pr.id, pr.product_id, pr.user_id, pr.rating, 
        pr.title, pr.comment, 
        pr.is_verified_purchase, pr.helpful_count, pr.not_helpful_count,
        pr.created_at, pr.updated_at,
        u.first_name, u.last_name, u.email,
        p.name as product_name
      FROM product_reviews pr
      LEFT JOIN users u ON pr.user_id = u.id
      LEFT JOIN products p ON pr.product_id = p.id
      WHERE pr.id = $1
    `;
    const { rows } = await db.query(query, [reviewId]);
    const review = rows[0];

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    return res.status(200).json({ success: true, data: review });

  } catch (error) {
    console.error('❌ Error in getReviewById:', error);
    throw error;
  }
}
