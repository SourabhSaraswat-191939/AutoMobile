import fetch from 'node-fetch';

async function checkUsers() {
  console.log('👥 Checking available users...\n');
  
  const baseUrl = 'http://localhost:5000';
  
  try {
    // Get all users
    const usersResponse = await fetch(`${baseUrl}/api/rbac/users`);
    
    if (usersResponse.ok) {
      const usersData = await usersResponse.json();
      console.log(`📊 Total users found: ${usersData.data.length}\n`);
      
      if (usersData.data.length > 0) {
        console.log('👤 Available users:');
        usersData.data.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.email} (ID: ${user._id})`);
        });
      } else {
        console.log('❌ No users found in the system!');
        console.log('\n💡 You need to:');
        console.log('1. Register a user through the frontend');
        console.log('2. Or create a user directly in the database');
      }
      
      // Check if our test user exists
      const testEmail = 'sm.pune@shubh.com';
      const testUser = usersData.data.find(u => u.email === testEmail);
      
      if (testUser) {
        console.log(`\n✅ Test user found: ${testEmail}`);
        
        // Check their current permissions
        const permResponse = await fetch(`${baseUrl}/api/rbac/users/email/${testEmail}/permissions`);
        if (permResponse.ok) {
          const permData = await permResponse.json();
          console.log(`📋 Current permissions: ${permData.permissions?.length || 0}`);
          if (permData.permissions?.length > 0) {
            console.log('   Permissions:', permData.permissions.map(p => p.permission_key).join(', '));
          }
        }
        
        // Check their roles
        const rolesResponse = await fetch(`${baseUrl}/api/rbac/users/email/${testEmail}/roles`);
        if (rolesResponse.ok) {
          const rolesData = await rolesResponse.json();
          console.log(`🎭 Current roles: ${rolesData.roles?.length || 0}`);
          if (rolesData.roles?.length > 0) {
            console.log('   Roles:', rolesData.roles.map(r => r.name).join(', '));
          }
        }
      } else {
        console.log(`\n❌ Test user NOT found: ${testEmail}`);
        console.log('\n📝 To fix this:');
        console.log('1. Go to your frontend login page');
        console.log('2. Register with email: sm.pune@shubh.com');
        console.log('3. Then run the permission assignment script');
      }
      
    } else {
      console.log(`❌ Failed to get users: ${usersResponse.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUsers();
