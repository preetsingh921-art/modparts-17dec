// Test script to verify the order creation fix
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');
const jwt = require('jsonwebtoken');

// Create a test JWT token using one of the existing users
function createTestToken() {
  const testPayload = {
    id: '05a40199-6c8b-47f0-9c14-90f4a161eaec', // charan117@gmail.com's UUID
    email: 'charan117@gmail.com',
    role: 'customer'
  };
  
  const token = jwt.sign(
    testPayload,
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  return token;
}

// Test data that mimics what the frontend sends
const testOrderData = {
  items: [
    {
      product_id: 1,
      quantity: 1,
      price: 25.99
    }
  ],
  total_amount: 25.99,
  shipping_address: "John Doe, 123 Main St, City, State 12345, Phone: 555-1234",
  payment_method: "cash_on_delivery",
  payment_status: "pending",
  transaction_id: null,
  reference_number: null,
  order_number: null,
  first_name: "John",
  last_name: "Doe",
  email: "charan117@gmail.com",
  city: "City",
  state: "State",
  zip_code: "12345",
  phone: "555-1234"
};

async function testOrderCreation() {
  try {
    console.log('=== TESTING ORDER CREATION FIX ===');
    
    // Create a test token
    const token = createTestToken();
    console.log('✅ Test JWT token created');
    
    console.log('Test order data:', JSON.stringify(testOrderData, null, 2));
    
    const response = await axios.post('http://localhost:3000/api/orders', testOrderData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Order creation successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Check if the response has the expected structure
    if (response.data.order_id) {
      console.log('✅ Response includes order_id:', response.data.order_id);
    } else {
      console.log('❌ Response missing order_id');
    }
    
  } catch (error) {
    console.error('❌ Order creation failed:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data);
    console.error('Full error:', error.message);
    
    if (error.response?.data?.debug) {
      console.log('Debug info:', error.response.data.debug);
    }
  }
}

// Run the test
console.log('Make sure the backend server is running on http://localhost:3000');
console.log('Starting test in 2 seconds...');
setTimeout(testOrderCreation, 2000);
