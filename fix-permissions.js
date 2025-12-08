// Fix permissions by assigning missing permissions to Service Manager role

const fixPermissions = async () => {
  try {
    console.log('🔧 Fixing permissions for Service Manager role...');
    
    // Step 1: Get all roles
    const rolesResponse = await fetch('http://localhost:5000/api/rbac/roles');
    const roles = await rolesResponse.json();
    
    const serviceManagerRole = roles.data?.find(r => r.name === 'Service Manager');
    if (!serviceManagerRole) {
      console.log('❌ Service Manager role not found');
      return;
    }
    
    console.log('📝 Found Service Manager role:', serviceManagerRole._id);
    
    // Step 2: Get all permissions
    const permissionsResponse = await fetch('http://localhost:5000/api/rbac/permissions');
    const permissions = await permissionsResponse.json();
    
    // Step 3: Find permissions to assign
    const permissionsToAssign = [
      'upload',           // For upload functionality
      'overview',         // For overview page
    ];
    
    console.log('🎯 Permissions to assign:', permissionsToAssign);
    
    // Step 4: Assign each permission
    for (const permissionKey of permissionsToAssign) {
      const permission = permissions.data?.find(p => p.permission_key === permissionKey);
      
      if (permission) {
        console.log(`📌 Assigning ${permissionKey} to Service Manager...`);
        
        const assignResponse = await fetch('http://localhost:5000/api/rbac/role-permissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            roleId: serviceManagerRole._id,
            permissionId: permission._id
          })
        });
        
        if (assignResponse.ok) {
          console.log(`✅ Assigned ${permissionKey}`);
        } else {
          const error = await assignResponse.text();
          console.log(`❌ Failed to assign ${permissionKey}:`, error);
        }
      } else {
        console.log(`❌ Permission ${permissionKey} not found`);
      }
    }
    
    // Step 5: Verify final permissions
    console.log('\n🔍 Verifying final permissions...');
    const finalRolesResponse = await fetch('http://localhost:5000/api/rbac/roles');
    const finalRoles = await finalRolesResponse.json();
    
    const updatedRole = finalRoles.data?.find(r => r.name === 'Service Manager');
    console.log('📋 Service Manager now has permissions:', updatedRole?.permissions?.length || 0);
    
    updatedRole?.permissions?.forEach(p => {
      console.log(`  ✅ ${p.permission_key}: ${p.name}`);
    });
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  }
};

// Run the fix
fixPermissions();
