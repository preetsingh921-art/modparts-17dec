// Test script to debug admin user update issue
const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testAdminUpdate() {
  try {
    console.log('🧪 Testing admin user update...');
    
    // Step 1: Login as admin to get a valid token
    console.log('\n1. Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'charan881130@gmail.com',
      password: 'Merit123#'
    });
    
    if (loginResponse.data.token) {
      console.log('✅ Admin login successful');
      const token = loginResponse.data.token;
      
      // Step 2: Get current user data first
      console.log('\n2. Getting current users list...');
      const usersResponse = await axios.get('http://localhost:3000/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Users fetched:', usersResponse.data.data?.length || 0, 'users');
      
      // Find a user to update (not the admin)
      const users = usersResponse.data.data || [];
      const userToUpdate = users.find(u => u.role !== 'admin' && u.id !== 1);
      
      if (!userToUpdate) {
        console.log('❌ No non-admin user found to update');
        return;
      }
      
      console.log('👤 Found user to update:', {
        id: userToUpdate.id,
        name: `${userToUpdate.first_name} ${userToUpdate.last_name}`,
        email: userToUpdate.email
      });
      
      // Step 3: Update the user
      console.log('\n3. Updating user...');
      const updateData = {
        id: userToUpdate.id,
        first_name: 'UpdatedFirstName',
        last_name: 'UpdatedLastName',
        email: userToUpdate.email, // Keep same email
        phone: '555-TEST-UPDATE',
        address: '123 Updated Street'
      };
      
      const updateResponse = await axios.put('http://localhost:3000/api/admin/users', updateData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Update response:', updateResponse.data);
      
      // Step 4: Verify the update by fetching the user again
      console.log('\n4. Verifying update...');
      const verifyResponse = await axios.get('http://localhost:3000/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const updatedUser = verifyResponse.data.data?.find(u => u.id === userToUpdate.id);
      if (updatedUser) {
        console.log('📋 User after update:', {
          id: updatedUser.id,
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          phone: updatedUser.phone,
          address: updatedUser.address
        });
        
        // Check if the update actually persisted
        if (updatedUser.first_name === 'UpdatedFirstName') {
          console.log('✅ Update persisted successfully!');
        } else {
          console.log('❌ Update did NOT persist - data reverted');
        }
      } else {
        console.log('❌ Could not find updated user');
      }
      
    } else {
      console.log('❌ Admin login failed - no token received');
    }
    
  } catch (error) {
    console.error('🚨 Test failed:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('Status:', error.response.status);
    }
  }
}

testAdminUpdate();
