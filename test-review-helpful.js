// Test script to debug the /reviews/helpful endpoint
const axios = require('axios');

async function testReviewHelpful() {
  try {
    console.log('🧪 Testing /reviews/helpful endpoint...');
    
    // Test data
    const testData = {
      review_id: 1,
      is_helpful: true
    };
    
    // Test without authentication first to see the error
    console.log('\n1. Testing without authentication:');
    try {
      const response = await axios.post('http://localhost:3000/api/reviews/helpful', testData);
      console.log('✅ Response:', response.data);
    } catch (error) {
      console.log('❌ Error (expected):', error.response?.data || error.message);
    }
    
    // Test with fake authentication
    console.log('\n2. Testing with fake authentication:');
    try {
      const response = await axios.post('http://localhost:3000/api/reviews/helpful', testData, {
        headers: {
          'Authorization': 'Bearer fake-token'
        }
      });
      console.log('✅ Response:', response.data);
    } catch (error) {
      console.log('❌ Error:', error.response?.data || error.message);
      console.log('❌ Status:', error.response?.status);
    }
    
    // Test GET endpoint to see if it works
    console.log('\n3. Testing GET endpoint:');
    try {
      const response = await axios.get('http://localhost:3000/api/reviews/helpful?review_id=1');
      console.log('✅ GET Response:', response.data);
    } catch (error) {
      console.log('❌ GET Error:', error.response?.data || error.message);
      console.log('❌ Status:', error.response?.status);
    }
    
  } catch (error) {
    console.error('🚨 Test failed:', error.message);
  }
}

testReviewHelpful();
