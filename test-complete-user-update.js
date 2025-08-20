// Test script to verify complete user update with all fields
const axios = require('axios');

async function testCompleteUserUpdate() {
  try {
    console.log('🧪 Testing complete user update with all fields...');
    
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
      email: userToUpdate.email,
      phone: userToUpdate.phone,
      address: userToUpdate.address,
      city: userToUpdate.city,
      state: userToUpdate.state,
      zip_code: userToUpdate.zip_code
    });
    
    // Step 3: Update with ALL fields (simulating frontend form)
    console.log('\n3. Updating user with ALL fields...');
    const completeUpdateData = {
      id: userToUpdate.id,
      first_name: 'CompleteTest',
      last_name: 'UpdatedUser',
      email: userToUpdate.email,
      phone: '555-COMPLETE-TEST',
      address: '123 Complete Test Street',
      city: 'TestCity',
      state: 'TestState',
      zip_code: '12345'
    };
    
    console.log('📤 Sending update data:', completeUpdateData);
    
    const updateResponse = await axios.put('http://localhost:3000/api/admin/users', completeUpdateData, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('✅ Update API response:', {
      success: updateResponse.data.success,
      message: updateResponse.data.message
    });
    
    console.log('📥 Returned user data:', {
      id: updateResponse.data.data.id,
      first_name: updateResponse.data.data.first_name,
      last_name: updateResponse.data.data.last_name,
      phone: updateResponse.data.data.phone,
      address: updateResponse.data.data.address,
      city: updateResponse.data.data.city,
      state: updateResponse.data.data.state,
      zip_code: updateResponse.data.data.zip_code
    });
    
    // Step 4: Verify persistence by fetching fresh data
    console.log('\n4. Verifying persistence with fresh fetch...');
    const verifyResponse = await axios.get('http://localhost:3000/api/admin/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const verifiedUser = verifyResponse.data.data?.find(u => u.id === userToUpdate.id);
    console.log('📋 User after fresh fetch:', {
      id: verifiedUser.id,
      first_name: verifiedUser.first_name,
      last_name: verifiedUser.last_name,
      phone: verifiedUser.phone,
      address: verifiedUser.address,
      city: verifiedUser.city,
      state: verifiedUser.state,
      zip_code: verifiedUser.zip_code
    });
    
    // Step 5: Check each field
    console.log('\n5. Field-by-field verification:');
    const checks = [
      { field: 'first_name', expected: 'CompleteTest', actual: verifiedUser.first_name },
      { field: 'last_name', expected: 'UpdatedUser', actual: verifiedUser.last_name },
      { field: 'phone', expected: '555-COMPLETE-TEST', actual: verifiedUser.phone },
      { field: 'address', expected: '123 Complete Test Street', actual: verifiedUser.address },
      { field: 'city', expected: 'TestCity', actual: verifiedUser.city },
      { field: 'state', expected: 'TestState', actual: verifiedUser.state },
      { field: 'zip_code', expected: '12345', actual: verifiedUser.zip_code }
    ];
    
    let allPassed = true;
    checks.forEach(check => {
      const passed = check.actual === check.expected;
      console.log(`${passed ? '✅' : '❌'} ${check.field}: expected "${check.expected}", got "${check.actual}"`);
      if (!passed) allPassed = false;
    });
    
    console.log(`\n🎯 Overall result: ${allPassed ? '✅ ALL FIELDS UPDATED SUCCESSFULLY!' : '❌ Some fields failed to update'}`);
    
  } catch (error) {
    console.error('🚨 Test failed:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('Status:', error.response.status);
    }
  }
}

testCompleteUserUpdate();
