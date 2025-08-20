// Test script to verify frontend user update behavior
const axios = require('axios');

async function testFrontendUpdate() {
  try {
    console.log('🧪 Testing frontend user update behavior...');
    
    // Step 1: Login as admin
    console.log('\n1. Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'charan881130@gmail.com',
      password: 'Merit123#'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Admin login successful');
    
    // Step 2: Get users list
    console.log('\n2. Getting users list...');
    const usersResponse = await axios.get('http://localhost:3000/api/admin/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const users = usersResponse.data.data || [];
    const userToUpdate = users.find(u => u.role !== 'admin');
    
    if (!userToUpdate) {
      console.log('❌ No user found to update');
      return;
    }
    
    console.log('👤 Original user data:', {
      id: userToUpdate.id,
      first_name: userToUpdate.first_name,
      last_name: userToUpdate.last_name,
      phone: userToUpdate.phone,
      address: userToUpdate.address
    });
    
    // Step 3: Simulate frontend update (partial data)
    console.log('\n3. Simulating frontend update with partial data...');
    const partialUpdateData = {
      id: userToUpdate.id,
      first_name: 'FrontendTest',
      last_name: 'UpdatedName',
      email: userToUpdate.email // Keep original email
      // Note: NOT including phone, address, etc. (simulating frontend form)
    };
    
    const updateResponse = await axios.put('http://localhost:3000/api/admin/users', partialUpdateData, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('✅ Update API response:', {
      success: updateResponse.data.success,
      message: updateResponse.data.message,
      updatedUser: {
        id: updateResponse.data.data.id,
        first_name: updateResponse.data.data.first_name,
        last_name: updateResponse.data.data.last_name,
        phone: updateResponse.data.data.phone,
        address: updateResponse.data.data.address
      }
    });
    
    // Step 4: Verify what the frontend should use for state update
    console.log('\n4. What frontend should use for state update:');
    console.log('❌ OLD WAY (partial data):', partialUpdateData);
    console.log('✅ NEW WAY (complete API response):', {
      id: updateResponse.data.data.id,
      first_name: updateResponse.data.data.first_name,
      last_name: updateResponse.data.data.last_name,
      phone: updateResponse.data.data.phone,
      address: updateResponse.data.data.address,
      email: updateResponse.data.data.email
    });
    
    // Step 5: Verify persistence
    console.log('\n5. Verifying persistence...');
    const verifyResponse = await axios.get('http://localhost:3000/api/admin/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const verifiedUser = verifyResponse.data.data?.find(u => u.id === userToUpdate.id);
    console.log('📋 User after refresh:', {
      id: verifiedUser.id,
      first_name: verifiedUser.first_name,
      last_name: verifiedUser.last_name,
      phone: verifiedUser.phone,
      address: verifiedUser.address
    });
    
    if (verifiedUser.first_name === 'FrontendTest') {
      console.log('✅ Update persisted correctly in database!');
    } else {
      console.log('❌ Update did not persist');
    }
    
  } catch (error) {
    console.error('🚨 Test failed:', error.response?.data || error.message);
  }
}

testFrontendUpdate();
