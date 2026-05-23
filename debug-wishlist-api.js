// Debug script to test wishlist API and identify issues
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function debugWishlistAPI() {
  console.log('🔍 Debugging Wishlist API Issues...\n');

  try {
    // Test 1: Check if the API endpoint exists
    console.log('1️⃣ Testing if wishlist endpoint exists...');
    
    try {
      const response = await axios.get(`${BASE_URL}/wishlist`);
      console.log(`✅ Endpoint exists but returned: ${response.status}`);
    } catch (error) {
      const status = error.response?.status;
      const data = error.response?.data;
      
      if (status === 401) {
        console.log(`✅ Endpoint exists - correctly requires authentication (401)`);
      } else if (status === 404) {
        console.log(`❌ Endpoint not found (404) - API routing issue`);
        console.log('   Check if api/wishlist/index.js exists');
        console.log('   Check if dev-server.js is routing correctly');
      } else if (status === 500) {
        console.log(`❌ Server error (500) - Internal issue`);
        console.log('   Error details:', data);
        console.log('   Likely causes:');
        console.log('   - Database connection issue');
        console.log('   - Missing environment variables');
        console.log('   - Database table does not exist');
        console.log('   - Syntax error in API code');
      } else {
        console.log(`❌ Unexpected error: ${status}`);
        console.log('   Response:', data);
      }
    }

    // Test 2: Check environment variables
    console.log('\n2️⃣ Checking environment variables...');
    console.log('   NODE_ENV:', process.env.NODE_ENV || 'not set');
    console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
    console.log('   SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
    console.log('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');
    console.log('   JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Missing');

    // Test 3: Test Supabase connection
    console.log('\n3️⃣ Testing Supabase connection...');
    
    try {
      const { supabase } = require('./lib/supabase');
      
      // Test basic connection
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);
        
      if (error) {
        console.log(`❌ Supabase connection failed:`, error.message);
      } else {
        console.log(`✅ Supabase connection successful`);
        
        // Test if wishlist_items table exists
        const { data: tableData, error: tableError } = await supabase
          .from('wishlist_items')
          .select('count')
          .limit(1);
          
        if (tableError) {
          console.log(`❌ wishlist_items table does not exist:`, tableError.message);
          console.log('   Run the simple-wishlist-migration.sql script in Supabase');
        } else {
          console.log(`✅ wishlist_items table exists`);
        }
      }
    } catch (libError) {
      console.log(`❌ Error loading Supabase library:`, libError.message);
    }

    // Test 4: Test with a mock JWT token
    console.log('\n4️⃣ Testing with mock authentication...');
    
    try {
      const jwt = require('jsonwebtoken');
      const mockToken = jwt.sign(
        { id: 1, email: 'test@example.com' }, 
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      const response = await axios.get(`${BASE_URL}/wishlist`, {
        headers: {
          'Authorization': `Bearer ${mockToken}`
        }
      });
      
      console.log(`✅ Authenticated request successful:`, response.data);
      
    } catch (authError) {
      const status = authError.response?.status;
      const data = authError.response?.data;
      
      if (status === 500) {
        console.log(`❌ Server error with valid auth (500):`, data);
        console.log('   This confirms the database/table issue');
      } else {
        console.log(`❌ Auth test failed (${status}):`, data);
      }
    }

    console.log('\n🎯 Next Steps:');
    console.log('1. If table missing: Run simple-wishlist-migration.sql in Supabase');
    console.log('2. If env vars missing: Check .env.local file');
    console.log('3. If connection fails: Verify Supabase credentials');
    console.log('4. Check server console for detailed error logs');

  } catch (error) {
    console.error('❌ Debug script failed:', error.message);
  }
}

// Run the debug script
debugWishlistAPI();
