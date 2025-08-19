const { supabaseAdmin } = require('../../lib/supabase')
const jwt = require('jsonwebtoken')

// Helper function to verify JWT token
function verifyToken(req) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret')
  } catch (error) {
    return null
  }
}

module.exports = async function handler(req, res) {
  // CORS is handled by dev-server middleware

  try {
    const { method, query, body } = req
    const { review_id } = query

    console.log(`👍 Review helpfulness API called: ${method} with params:`, { review_id })

    switch (method) {
      case 'GET':
        return await getHelpfulnessVotes(req, res, review_id)
        
      case 'POST':
        return await voteHelpfulness(req, res, body)
        
      case 'PUT':
        return await updateHelpfulnessVote(req, res, body)
        
      case 'DELETE':
        return await removeHelpfulnessVote(req, res, review_id)
        
      default:
        return res.status(405).json({ success: false, message: 'Method not allowed' })
    }

  } catch (error) {
    console.error('❌ Review helpfulness API error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    })
  }
}

// Get helpfulness votes for a review
async function getHelpfulnessVotes(req, res, reviewId) {
  try {
    if (!reviewId) {
      return res.status(400).json({ success: false, message: 'Review ID is required' })
    }
    
    console.log(`👍 Fetching helpfulness votes for review ${reviewId}`)
    
    // Get vote counts
    const { data: votes, error: votesError } = await supabaseAdmin
      .from('review_helpfulness')
      .select('is_helpful')
      .eq('review_id', reviewId)
    
    if (votesError) {
      console.error('❌ Error fetching helpfulness votes:', votesError)
      throw votesError
    }
    
    const helpfulCount = votes?.filter(vote => vote.is_helpful).length || 0
    const notHelpfulCount = votes?.filter(vote => !vote.is_helpful).length || 0
    
    return res.status(200).json({
      success: true,
      data: {
        reviewId: parseInt(reviewId),
        helpfulCount,
        notHelpfulCount,
        totalVotes: helpfulCount + notHelpfulCount
      }
    })

  } catch (error) {
    console.error('❌ Error in getHelpfulnessVotes:', error)
    throw error
  }
}

// Vote on review helpfulness
async function voteHelpfulness(req, res, body) {
  try {
    const { review_id, is_helpful } = body

    // Verify authentication using JWT
    const user = verifyToken(req)
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authorization required' })
    }
    
    console.log(`👍 User ${user.id} voting on review ${review_id}: ${is_helpful ? 'helpful' : 'not helpful'}`)
    
    // Validate required fields
    if (!review_id || typeof is_helpful !== 'boolean') {
      return res.status(400).json({ 
        success: false,
        message: 'Review ID and is_helpful (boolean) are required' 
      })
    }
    
    // Check if review exists
    const { data: review, error: reviewError } = await supabaseAdmin
      .from('product_reviews')
      .select('id')
      .eq('id', review_id)
      .single()
    
    if (reviewError || !review) {
      return res.status(404).json({ success: false, message: 'Review not found' })
    }
    
    // Check if user has already voted on this review
    const { data: existingVote } = await supabaseAdmin
      .from('review_helpfulness')
      .select('id, is_helpful')
      .eq('user_id', user.id)
      .eq('review_id', review_id)
      .single()
    
    if (existingVote) {
      // Update existing vote if different
      if (existingVote.is_helpful !== is_helpful) {
        const { error: updateError } = await supabaseAdmin
          .from('review_helpfulness')
          .update({ is_helpful })
          .eq('id', existingVote.id)
        
        if (updateError) {
          console.error('❌ Error updating helpfulness vote:', updateError)
          throw updateError
        }
        
        console.log('✅ Helpfulness vote updated successfully')
        
        return res.status(200).json({
          success: true,
          message: 'Vote updated successfully',
          data: { reviewId: parseInt(review_id), isHelpful: is_helpful }
        })
      } else {
        return res.status(400).json({ 
          success: false,
          message: 'You have already voted this way on this review' 
        })
      }
    } else {
      // Create new vote
      const { data: vote, error: voteError } = await supabaseAdmin
        .from('review_helpfulness')
        .insert([{
          review_id: parseInt(review_id),
          user_id: user.id,
          is_helpful
        }])
        .select()
        .single()
      
      if (voteError) {
        console.error('❌ Error creating helpfulness vote:', voteError)
        throw voteError
      }
      
      console.log('✅ Helpfulness vote created successfully:', vote.id)
      
      return res.status(201).json({
        success: true,
        message: 'Vote recorded successfully',
        data: { reviewId: parseInt(review_id), isHelpful: is_helpful }
      })
    }

  } catch (error) {
    console.error('❌ Error in voteHelpfulness:', error)
    throw error
  }
}

// Update helpfulness vote
async function updateHelpfulnessVote(req, res, body) {
  try {
    const { review_id, is_helpful } = body

    // Verify authentication using JWT
    const user = verifyToken(req)
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authorization required' })
    }
    
    console.log(`👍 User ${user.id} updating vote on review ${review_id}`)
    
    // Validate required fields
    if (!review_id || typeof is_helpful !== 'boolean') {
      return res.status(400).json({ 
        success: false,
        message: 'Review ID and is_helpful (boolean) are required' 
      })
    }
    
    // Find existing vote
    const { data: existingVote } = await supabaseAdmin
      .from('review_helpfulness')
      .select('id')
      .eq('user_id', user.id)
      .eq('review_id', review_id)
      .single()
    
    if (!existingVote) {
      return res.status(404).json({ success: false, message: 'Vote not found' })
    }
    
    // Update the vote
    const { error: updateError } = await supabaseAdmin
      .from('review_helpfulness')
      .update({ is_helpful })
      .eq('id', existingVote.id)
    
    if (updateError) {
      console.error('❌ Error updating helpfulness vote:', updateError)
      throw updateError
    }
    
    console.log('✅ Helpfulness vote updated successfully')
    
    return res.status(200).json({
      success: true,
      message: 'Vote updated successfully',
      data: { reviewId: parseInt(review_id), isHelpful: is_helpful }
    })

  } catch (error) {
    console.error('❌ Error in updateHelpfulnessVote:', error)
    throw error
  }
}

// Remove helpfulness vote
async function removeHelpfulnessVote(req, res, reviewId) {
  try {
    // Verify authentication using JWT
    const user = verifyToken(req)
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authorization required' })
    }
    
    console.log(`🗑️ User ${user.id} removing vote on review ${reviewId}`)
    
    if (!reviewId) {
      return res.status(400).json({ success: false, message: 'Review ID is required' })
    }
    
    // Find and delete the vote
    const { error: deleteError } = await supabaseAdmin
      .from('review_helpfulness')
      .delete()
      .eq('user_id', user.id)
      .eq('review_id', reviewId)
    
    if (deleteError) {
      console.error('❌ Error removing helpfulness vote:', deleteError)
      throw deleteError
    }
    
    console.log('✅ Helpfulness vote removed successfully')
    
    return res.status(200).json({
      success: true,
      message: 'Vote removed successfully'
    })

  } catch (error) {
    console.error('❌ Error in removeHelpfulnessVote:', error)
    throw error
  }
}

// Get user's vote on a specific review
async function getUserVote(req, res, reviewId) {
  try {
    // Verify authentication using JWT
    const user = verifyToken(req)
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authorization required' })
    }
    
    if (!reviewId) {
      return res.status(400).json({ success: false, message: 'Review ID is required' })
    }
    
    console.log(`👤 Getting user ${user.id} vote for review ${reviewId}`)
    
    // Get user's vote
    const { data: vote, error: voteError } = await supabaseAdmin
      .from('review_helpfulness')
      .select('is_helpful')
      .eq('user_id', user.id)
      .eq('review_id', reviewId)
      .single()
    
    if (voteError && voteError.code !== 'PGRST116') {
      console.error('❌ Error fetching user vote:', voteError)
      throw voteError
    }
    
    return res.status(200).json({
      success: true,
      data: {
        reviewId: parseInt(reviewId),
        userVote: vote ? vote.is_helpful : null
      }
    })

  } catch (error) {
    console.error('❌ Error in getUserVote:', error)
    throw error
  }
}
