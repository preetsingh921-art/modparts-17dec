// Debug script to check user authentication and database state
require('dotenv').config({ path: '.env.local' });
const { supabase } = require('./lib/supabase');
const jwt = require('jsonwebtoken');

async function debugUserAuth() {
  console.log('=== ONLINE SUPABASE DATABASE CHECK ===');
  console.log('Supabase URL:', process.env.SUPABASE_URL);

  try {
    // 1. Check if we can connect to Supabase
    console.log('\n1. Testing Supabase connection...');
    const { data: testConnection, error: connectionError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (connectionError) {
      console.error('❌ Supabase connection failed:', connectionError);
      return;
    }
    console.log('✅ Supabase connection successful');

    // 2. Check ALL users in online database
    console.log('\n2. Checking ALL users in online Supabase database...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log(`✅ Found ${users.length} users in online Supabase database`);

    // Show ALL users
    users.forEach((user, index) => {
      console.log(`\nUser ${index + 1}:`);
      console.log('  ID:', user.id);
      console.log('  Email:', user.email);
      console.log('  Role:', user.role);
      console.log('  Name:', user.first_name, user.last_name);
      console.log('  Created:', user.created_at);
      console.log('  Has password field:', !!user.password);
      console.log('  Has password_hash field:', !!user.password_hash);
    });
    
    // 3. Test JWT token creation and verification
    console.log('\n3. Testing JWT token...');
    if (users.length > 0) {
      const testUser = users[0];
      const token = jwt.sign(
        {
          id: testUser.id,
          email: testUser.email,
          role: testUser.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      console.log('✅ JWT token created');
      console.log('Token payload preview:', {
        id: testUser.id,
        email: testUser.email,
        role: testUser.role
      });
      
      // Verify the token
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('✅ JWT token verification successful');
        console.log('Decoded payload:', decoded);
        
        // Test database lookup with decoded ID
        const { data: lookupUser, error: lookupError } = await supabase
          .from('users')
          .select('id, email, role')
          .eq('id', decoded.id)
          .single();
        
        if (lookupError) {
          console.error('❌ User lookup failed:', lookupError);
          console.error('Looking for user ID:', decoded.id, 'Type:', typeof decoded.id);
        } else {
          console.log('✅ User lookup successful:', lookupUser);
        }
        
      } catch (verifyError) {
        console.error('❌ JWT verification failed:', verifyError);
      }
    }
    
    // 4. Check for the specific test user
    console.log('\n4. Checking for test user...');
    const { data: testUser, error: testUserError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', '05a40199-6c8b-47f0-9c14-90f4a161eaec')
      .single();

    if (testUserError) {
      console.log('❌ Test user ID not found:', testUserError.message);

      // Check by email instead
      const { data: emailUser, error: emailError } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('email', 'charan117@gmail.com')
        .single();

      if (emailError) {
        console.log('❌ Email user not found either:', emailError.message);
        console.log('Available users:');
        const { data: allUsers } = await supabase
          .from('users')
          .select('id, email, role')
          .limit(10);
        console.log(allUsers);
      } else {
        console.log('✅ Found user by email:', emailUser);
        console.log('Use this ID in your test:', emailUser.id);
      }
    } else {
      console.log('✅ Test user found:', testUser);
    }

    // 5. Check environment variables
    console.log('\n5. Environment check...');
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
    console.log('SUPABASE_ANON_KEY exists:', !!process.env.SUPABASE_ANON_KEY);
    
  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

// Run the debug
debugUserAuth();
