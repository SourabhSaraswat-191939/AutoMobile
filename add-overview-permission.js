// Add overview permission to Service Manager role

const addOverviewPermission = async () => {
  try {
    console.log('👁️ Adding overview permission to Service Manager role...');
    
    // Step 1: Get Service Manager role
    const rolesResponse = await fetch('http://localhost:5000/api/rbac/roles');
    const roles = await rolesResponse.json();
    
    const serviceManagerRole = roles.data?.find(r => r.name === 'Service Manager');
    if (!serviceManagerRole) {
      console.log('❌ Service Manager role not found');
      return;
    }
    
    // Step 2: Get overview permission
    const permissionsResponse = await fetch('http://localhost:5000/api/rbac/permissions');
    const permissions = await permissionsResponse.json();
    
    const overviewPermission = permissions.data?.find(p => p.permission_key === 'overview');
    if (!overviewPermission) {
      console.log('❌ Overview permission not found');
      return;
    }
    
    console.log('👁️ Found overview permission:', overviewPermission._id);
    
    // Step 3: Assign overview permission to Service Manager role
    const assignResponse = await fetch('http://localhost:5000/api/rbac/role-permissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        roleId: serviceManagerRole._id,
        permissionId: overviewPermission._id
      })
    });
    
    if (assignResponse.ok) {
      console.log('✅ Overview permission assigned to Service Manager role');
    } else {
      const error = await assignResponse.text();
      console.log('❌ Failed to assign overview permission:', error);
    }
    
    // Step 4: Verify final permissions
    console.log('\n🔍 Final verification...');
    
    const usersResponse = await fetch('http://localhost:5000/api/rbac/users');
    const users = await usersResponse.json();
    const testUser = users.data?.find(u => u.email === 'sm.mumbai@shubh.com');
    
    if (testUser) {
      const userPermissionsResponse = await fetch(`http://localhost:5000/api/rbac/users/${testUser._id}/permissions`);
      const userPermissions = await userPermissionsResponse.json();
      
      console.log('🎉 User final permissions:', userPermissions.data?.length || 0);
      userPermissions.data?.forEach(p => {
        console.log(`  ✅ ${p.permission_key}: ${p.name}`);
      });
      
      // Check what sidebar permissions user has
      const sidebarPermissions = ['overview', 'upload', 'gm_targets', 'manage_users'];
      console.log('\n🔍 Sidebar permission check:');
      sidebarPermissions.forEach(perm => {
        const hasIt = userPermissions.data?.some(p => p.permission_key === perm);
        console.log(`  ${hasIt ? '✅' : '❌'} ${perm}: ${hasIt ? 'GRANTED' : 'DENIED'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Failed to add overview permission:', error.message);
  }
};

// Run the fix
addOverviewPermission();
