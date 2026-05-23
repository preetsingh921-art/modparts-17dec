// Debug script to check JWT token contents
require('dotenv').config({ path: '.env.local' });
const jwt = require('jsonwebtoken');

// You can paste a JWT token here from your browser's localStorage
// To get it: Open browser dev tools -> Application/Storage -> Local Storage -> token
const TEST_TOKEN = 'paste-your-jwt-token-here';

function debugJWTToken(token) {
  console.log('=== JWT TOKEN DEBUG ===');
  
  if (!token || token === 'paste-your-jwt-token-here') {
    console.log('❌ No token provided. To use this script:');
    console.log('1. Open your browser dev tools');
    console.log('2. Go to Application/Storage -> Local Storage');
    console.log('3. Find the "token" key and copy its value');
    console.log('4. Replace TEST_TOKEN in this script with your token');
    return;
  }
  
  try {
    // Decode without verification first to see the payload
    const decoded = jwt.decode(token);
    console.log('✅ Token decoded successfully');
    console.log('Token payload:', JSON.stringify(decoded, null, 2));
    
    // Now verify with the secret
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token verification successful');
    console.log('Verified payload:', JSON.stringify(verified, null, 2));
    
    // Check the user ID specifically
    console.log('\n=== USER ID ANALYSIS ===');
    console.log('User ID:', verified.id);
    console.log('User ID type:', typeof verified.id);
    console.log('Is UUID format:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(verified.id));
    
  } catch (error) {
    console.error('❌ Token error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      console.log('This might be due to:');
      console.log('- Invalid token format');
      console.log('- Wrong JWT secret');
      console.log('- Token corruption');
    } else if (error.name === 'TokenExpiredError') {
      console.log('Token has expired. Please log in again.');
    }
  }
}

// Create a test token with a real user ID for testing
async function createTestToken() {
  console.log('\n=== CREATING TEST TOKEN ===');
  
  // Use one of the existing user IDs from your database
  const testUserId = 'charan117@gmail.com'; // You can change this to any email from your list
  
  const testPayload = {
    id: '05a40199-6c8b-47f0-9c14-90f4a161eaec', // charan117@gmail.com's ID
    email: 'charan117@gmail.com',
    role: 'customer'
  };
  
  const testToken = jwt.sign(
    testPayload,
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  console.log('Test token created:', testToken);
  console.log('You can use this token to test order creation');
  
  return testToken;
}

// Run the debug
debugJWTToken(TEST_TOKEN);
createTestToken();
