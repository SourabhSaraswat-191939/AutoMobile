// Fix user-role assignment

const fixUserRole = async () => {
  try {
    console.log('🔧 Fixing user-role assignment...');
    
    // Step 1: Get the user
    const usersResponse = await fetch('http://localhost:5000/api/rbac/users');
    const users = await usersResponse.json();
    
    const testUser = users.data?.find(u => u.email === 'sm.mumbai@shubh.com');
    if (!testUser) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('👤 Found user:', testUser.email, 'ID:', testUser._id);
    
    // Step 2: Get the Service Manager role
    const rolesResponse = await fetch('http://localhost:5000/api/rbac/roles');
    const roles = await rolesResponse.json();
    
    const serviceManagerRole = roles.data?.find(r => r.name === 'Service Manager');
    if (!serviceManagerRole) {
      console.log('❌ Service Manager role not found');
      return;
    }
    
    console.log('📝 Found Service Manager role:', serviceManagerRole._id);
    console.log('📋 Role has permissions:', serviceManagerRole.permissions?.length || 0);
    
    // Step 3: Assign user to role
    console.log('🔗 Assigning user to Service Manager role...');
    
    const assignResponse = await fetch('http://localhost:5000/api/rbac/user-roles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: testUser._id,
        roleId: serviceManagerRole._id
      })
    });
    
    if (assignResponse.ok) {
      const result = await assignResponse.json();
      console.log('✅ User assigned to role successfully:', result);
    } else {
      const error = await assignResponse.text();
      console.log('❌ Failed to assign user to role:', error);
    }
    
    // Step 4: Verify user permissions after assignment
    console.log('\n🔍 Verifying user permissions after assignment...');
    
    const permissionsResponse = await fetch(`http://localhost:5000/api/rbac/users/${testUser._id}/permissions`);
    const permissions = await permissionsResponse.json();
    
    console.log('📋 User now has permissions:', permissions.data?.length || 0);
    
    if (permissions.data && permissions.data.length > 0) {
      console.log('✅ User permissions:');
      permissions.data.forEach(p => {
        console.log(`  - ${p.permission_key}: ${p.name}`);
      });
    } else {
      console.log('❌ User still has no permissions');
    }
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  }
};

// Run the fix
fixUserRole();
