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

  try {
    const { method, query, body } = req;
    const { review_id } = query;

    console.log(`👍 Review helpfulness API (Neon) called: ${method} with params:`, { review_id });

    switch (method) {
      case 'GET':
        return await getHelpfulnessVotes(req, res, review_id);
      case 'POST':
        return await voteHelpfulness(req, res, body);
      case 'PUT':
        return await updateHelpfulnessVote(req, res, body);
      case 'DELETE':
        return await removeHelpfulnessVote(req, res, review_id);
      default:
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('❌ Review helpfulness API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get helpfulness votes for a review
async function getHelpfulnessVotes(req, res, reviewId) {
  try {
    if (!reviewId) {
      return res.status(400).json({ success: false, message: 'Review ID is required' });
    }

    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE is_helpful = true) as helpful_count,
        COUNT(*) FILTER (WHERE is_helpful = false) as not_helpful_count
      FROM review_helpfulness
      WHERE review_id = $1
    `;
    const { rows } = await db.query(query, [reviewId]);
    const { helpful_count, not_helpful_count } = rows[0];

    return res.status(200).json({
      success: true,
      data: {
        reviewId: parseInt(reviewId),
        helpfulCount: parseInt(helpful_count),
        notHelpfulCount: parseInt(not_helpful_count),
        totalVotes: parseInt(helpful_count) + parseInt(not_helpful_count)
      }
    });

  } catch (error) {
    console.error('❌ Error in getHelpfulnessVotes:', error);
    throw error;
  }
}

// Vote on review helpfulness
async function voteHelpfulness(req, res, body) {
  try {
    const { review_id, is_helpful } = body;
    const user = verifyToken(req);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Authorization required' });
    }
    const userId = user.userId || user.id;

    if (!review_id || typeof is_helpful !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Review ID and is_helpful (boolean) are required' });
    }

    // Check if review exists
    const reviewCheck = await db.query('SELECT 1 FROM product_reviews WHERE id = $1', [review_id]);
    if (reviewCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    // Check existing vote
    const existingVoteQuery = `SELECT id, is_helpful FROM review_helpfulness WHERE user_id = $1 AND review_id = $2`;
    const existingVoteRes = await db.query(existingVoteQuery, [userId, review_id]);
    const existingVote = existingVoteRes.rows[0];

    if (existingVote) {
      if (existingVote.is_helpful !== is_helpful) {
        // Update vote
        const updateQuery = `UPDATE review_helpfulness SET is_helpful = $1 WHERE id = $2`;
        await db.query(updateQuery, [is_helpful, existingVote.id]);

        return res.status(200).json({
          success: true,
          message: 'Vote updated successfully',
          data: { reviewId: parseInt(review_id), isHelpful: is_helpful }
        });
      } else {
        return res.status(400).json({ success: false, message: 'You have already voted this way' });
      }
    } else {
      // Create vote
      const insertQuery = `
        INSERT INTO review_helpfulness (review_id, user_id, is_helpful)
        VALUES ($1, $2, $3)
        RETURNING id
      `;
      await db.query(insertQuery, [review_id, userId, is_helpful]);

      return res.status(201).json({
        success: true,
        message: 'Vote recorded successfully',
        data: { reviewId: parseInt(review_id), isHelpful: is_helpful }
      });
    }

  } catch (error) {
    console.error('❌ Error in voteHelpfulness:', error);
    throw error;
  }
}

// Update helpfulness vote (PUT - largely redundant with POST logic but kept for API compatibility)
async function updateHelpfulnessVote(req, res, body) {
  try {
    const { review_id, is_helpful } = body;
    const user = verifyToken(req);
    if (!user) return res.status(401).json({ success: false, message: 'Authorization required' });
    const userId = user.userId || user.id;

    if (!review_id || typeof is_helpful !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Invalid parameters' });
    }

    const updateQuery = `
      UPDATE review_helpfulness 
      SET is_helpful = $1 
      WHERE user_id = $2 AND review_id = $3
      RETURNING id
    `;
    const { rows } = await db.query(updateQuery, [is_helpful, userId, review_id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Vote not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Vote updated successfully',
      data: { reviewId: parseInt(review_id), isHelpful: is_helpful }
    });

  } catch (error) {
    console.error('❌ Error in updateHelpfulnessVote:', error);
    throw error;
  }
}

// Remove helpfulness vote
async function removeHelpfulnessVote(req, res, reviewId) {
  try {
    const user = verifyToken(req);
    if (!user) return res.status(401).json({ success: false, message: 'Authorization required' });
    const userId = user.userId || user.id;

    if (!reviewId) return res.status(400).json({ success: false, message: 'Review ID required' });

    const deleteQuery = `DELETE FROM review_helpfulness WHERE user_id = $1 AND review_id = $2`;
    await db.query(deleteQuery, [userId, reviewId]);

    return res.status(200).json({ success: true, message: 'Vote removed successfully' });

  } catch (error) {
    console.error('❌ Error in removeHelpfulnessVote:', error);
    throw error;
  }
}
