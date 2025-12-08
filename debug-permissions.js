// Debug permission system step by step

const debugPermissions = async () => {
  try {
    console.log('🔍 Debugging permission system...');
    
    // Step 1: Check if backend is running
    console.log('\n1️⃣ Testing backend connection...');
    const healthResponse = await fetch('http://localhost:5000/api/rbac/permissions');
    console.log('Backend status:', healthResponse.status);
    
    // Step 2: Get all users
    console.log('\n2️⃣ Getting all users...');
    const usersResponse = await fetch('http://localhost:5000/api/rbac/users');
    const users = await usersResponse.json();
    console.log('Users found:', users.data?.length || 0);
    
    if (users.data && users.data.length > 0) {
      // Find the test user (Service Manager)
      const testUser = users.data.find(u => u.email === 'sm.mumbai@shubh.com') || users.data[0];
      console.log('\n📧 Test user:', testUser.email);
      console.log('User ID:', testUser._id);
      
      // Step 3: Check user permissions
      console.log('\n3️⃣ Getting user permissions...');
      const permissionsResponse = await fetch(`http://localhost:5000/api/rbac/users/${testUser._id}/permissions`);
      const permissions = await permissionsResponse.json();
      
      console.log('Permission API response:', permissions);
      console.log('User has permissions:', permissions.data?.length || 0);
      
      if (permissions.data && permissions.data.length > 0) {
        console.log('\n📋 User permissions:');
        permissions.data.forEach(p => {
          console.log(`  ✅ ${p.permission_key}: ${p.name}`);
        });
      } else {
        console.log('❌ User has NO permissions assigned');
      }
      
      // Step 4: Check roles
      console.log('\n4️⃣ Getting all roles...');
      const rolesResponse = await fetch('http://localhost:5000/api/rbac/roles');
      const roles = await rolesResponse.json();
      
      console.log('Roles found:', roles.data?.length || 0);
      roles.data?.forEach(role => {
        console.log(`  📝 Role: ${role.name} (${role.permissions?.length || 0} permissions)`);
        if (role.permissions && role.permissions.length > 0) {
          role.permissions.forEach(p => {
            console.log(`    - ${p.permission_key}: ${p.name}`);
          });
        }
      });
      
      // Step 5: Check user-role mappings
      console.log('\n5️⃣ Checking if user has roles assigned...');
      // We need to check if there are user-role mappings
      
    } else {
      console.log('❌ No users found in database');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
};

// Run the debug
debugPermissions();
