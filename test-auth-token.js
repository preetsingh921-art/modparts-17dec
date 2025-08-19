// Test script to verify authentication token handling
const axios = require('axios');
const jwt = require('jsonwebtoken');

// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

async function testAuthToken() {
  try {
    console.log('🧪 Testing authentication token handling...');
    
    // Step 1: Login to get a valid token
    console.log('\n1. Logging in to get a valid token...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'charan881130@gmail.com',
      password: 'Merit123#'
    });
    
    if (loginResponse.data.token) {
      console.log('✅ Login successful, token received');
      const token = loginResponse.data.token;
      
      // Verify the token structure
      try {
        // Load the same environment variables as the server
        require('dotenv').config({ path: '.env.local' });
        require('dotenv').config();

        console.log('Using JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Missing');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        console.log('✅ Token is valid, user ID:', decoded.id);
        
        // Step 2: Test the review helpfulness endpoint with valid token
        console.log('\n2. Testing review helpfulness with valid token...');
        const helpfulResponse = await axios.post('http://localhost:3000/api/reviews/helpful', {
          review_id: 1,
          is_helpful: true
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('✅ Review helpfulness vote successful:', helpfulResponse.data);

      } catch (tokenError) {
        console.log('❌ Review helpfulness request failed:', tokenError.response?.data || tokenError.message);
      }
      
    } else {
      console.log('❌ Login failed - no token received');
    }
    
  } catch (error) {
    console.error('🚨 Test failed:', error.response?.data || error.message);
  }
}

testAuthToken();
