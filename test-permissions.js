// Test permission flow to debug the issue

const testPermissions = async () => {
  try {
    console.log('🧪 Testing permission flow...');
    
    // Test 1: Get all users
    console.log('\n1️⃣ Getting all users...');
    const usersResponse = await fetch('http://localhost:5000/api/rbac/users');
    const users = await usersResponse.json();
    console.log('Users found:', users.data?.length || 0);
    
    if (users.data && users.data.length > 0) {
      const testUser = users.data[0];
      console.log('Test user:', testUser.email, 'ID:', testUser._id);
      
      // Test 2: Get user permissions
      console.log('\n2️⃣ Getting user permissions...');
      const permissionsResponse = await fetch(`http://localhost:5000/api/rbac/users/${testUser._id}/permissions`);
      const permissions = await permissionsResponse.json();
      console.log('User permissions:', permissions);
      
      // Test 3: Get all roles
      console.log('\n3️⃣ Getting all roles...');
      const rolesResponse = await fetch('http://localhost:5000/api/rbac/roles');
      const roles = await rolesResponse.json();
      console.log('Roles found:', roles.data?.length || 0);
      roles.data?.forEach(role => {
        console.log(`  - ${role.name}: ${role.permissions?.length || 0} permissions`);
      });
      
      // Test 4: Check if user has any roles
      console.log('\n4️⃣ Checking user roles...');
      // We need to check user-role mappings
      
    } else {
      console.log('❌ No users found in database');
    }
    
  } catch (error) {
    console.error('❌ Permission test failed:', error.message);
  }
};

// Run the test
testPermissions();
