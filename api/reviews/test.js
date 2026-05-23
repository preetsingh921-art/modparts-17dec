const jwt = require('jsonwebtoken')

// Helper function to verify JWT token
function verifyToken(req) {
  console.log('🔐 Test: Verifying token...')
  console.log('🔐 Test: Auth header:', req.headers.authorization ? 'Present' : 'Missing')

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ Test: No valid auth header found')
    return null
  }

  const token = authHeader.substring(7)
  console.log('🔐 Test: Token extracted:', token.substring(0, 20) + '...')
  console.log('🔐 Test: JWT_SECRET available:', process.env.JWT_SECRET ? 'Yes' : 'No')

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    console.log('✅ Test: Token verified successfully:', { id: decoded.id, email: decoded.email, role: decoded.role })
    return decoded
  } catch (error) {
    console.log('❌ Test: Token verification failed:', error.message)
    return null
  }
}

module.exports = async function handler(req, res) {
  console.log('🧪 Reviews test endpoint called')

  // Test JWT authentication
  const user = verifyToken(req)

  return res.status(200).json({
    success: true,
    message: 'Reviews API test endpoint working!',
    method: req.method,
    path: req.path,
    query: req.query,
    authenticated: !!user,
    user: user ? { id: user.id, email: user.email, role: user.role } : null,
    authHeader: req.headers.authorization ? 'Present' : 'Missing'
  })
}
