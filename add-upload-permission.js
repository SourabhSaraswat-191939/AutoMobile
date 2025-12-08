// Add upload permission to Service Manager role

const addUploadPermission = async () => {
  try {
    console.log('📤 Adding upload permission to Service Manager role...');
    
    // Step 1: Get Service Manager role
    const rolesResponse = await fetch('http://localhost:5000/api/rbac/roles');
    const roles = await rolesResponse.json();
    
    const serviceManagerRole = roles.data?.find(r => r.name === 'Service Manager');
    if (!serviceManagerRole) {
      console.log('❌ Service Manager role not found');
      return;
    }
    
    // Step 2: Get upload permission
    const permissionsResponse = await fetch('http://localhost:5000/api/rbac/permissions');
    const permissions = await permissionsResponse.json();
    
    const uploadPermission = permissions.data?.find(p => p.permission_key === 'upload');
    if (!uploadPermission) {
      console.log('❌ Upload permission not found');
      return;
    }
    
    console.log('📤 Found upload permission:', uploadPermission._id);
    
    // Step 3: Assign upload permission to Service Manager role
    const assignResponse = await fetch('http://localhost:5000/api/rbac/role-permissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        roleId: serviceManagerRole._id,
        permissionId: uploadPermission._id
      })
    });
    
    if (assignResponse.ok) {
      console.log('✅ Upload permission assigned to Service Manager role');
    } else {
      const error = await assignResponse.text();
      console.log('❌ Failed to assign upload permission:', error);
    }
    
    // Step 4: Verify final permissions
    console.log('\n🔍 Verifying final user permissions...');
    
    const usersResponse = await fetch('http://localhost:5000/api/rbac/users');
    const users = await usersResponse.json();
    const testUser = users.data?.find(u => u.email === 'sm.mumbai@shubh.com');
    
    if (testUser) {
      const userPermissionsResponse = await fetch(`http://localhost:5000/api/rbac/users/${testUser._id}/permissions`);
      const userPermissions = await userPermissionsResponse.json();
      
      console.log('📋 User final permissions:', userPermissions.data?.length || 0);
      userPermissions.data?.forEach(p => {
        console.log(`  ✅ ${p.permission_key}: ${p.name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Failed to add upload permission:', error.message);
  }
};

// Run the fix
addUploadPermission();
