import fetch from 'node-fetch';

async function assignTestPermissions() {
  console.log('🔧 Assigning permissions to test user...\n');
  
  const baseUrl = 'http://localhost:5000';
  const testEmail = 'sm.pune@shubh.com';
  
  try {
    // First, let's create a role with SM permissions
    console.log('📋 Creating SM role with permissions...');
    
    const createRoleResponse = await fetch(`${baseUrl}/api/rbac/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Service Manager',
        desc: 'Service Manager with full SM dashboard access'
      })
    });
    
    if (createRoleResponse.ok) {
      const roleData = await createRoleResponse.json();
      console.log(`✅ Role created: ${roleData.data.name}`);
      
      const roleId = roleData.data._id;
      
      // Get all permissions
      const permissionsResponse = await fetch(`${baseUrl}/api/rbac/permissions`);
      const permissionsData = await permissionsResponse.json();
      const permissions = permissionsData.data;
      
      // Assign key permissions to the role
      const keyPermissions = [
        'dashboard',
        'overview', 
        'ro_billing_dashboard',
        'operations_dashboard',
        'warranty_dashboard',
        'service_booking_dashboard',
        'ro_billing_upload',
        'operations_upload',
        'warranty_upload',
        'service_booking_upload'
      ];
      
      console.log('🔗 Assigning permissions to role...');
      
      for (const permKey of keyPermissions) {
        const permission = permissions.find(p => p.permission_key === permKey);
        if (permission) {
          const assignResponse = await fetch(`${baseUrl}/api/rbac/role-permissions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              role_id: roleId,
              permission_id: permission._id
            })
          });
          
          if (assignResponse.ok) {
            console.log(`   ✅ Assigned: ${permKey}`);
          } else {
            console.log(`   ❌ Failed to assign: ${permKey}`);
          }
        }
      }
      
      // Now assign this role to the test user
      console.log(`\n👤 Assigning role to user: ${testEmail}`);
      
      // First get user ID
      const usersResponse = await fetch(`${baseUrl}/api/rbac/users`);
      const usersData = await usersResponse.json();
      const testUser = usersData.data.find(u => u.email === testEmail);
      
      if (testUser) {
        const assignRoleResponse = await fetch(`${baseUrl}/api/rbac/users/${testUser._id}/assign-role`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role_id: roleId
          })
        });
        
        if (assignRoleResponse.ok) {
          console.log(`✅ Role assigned to user: ${testEmail}`);
        } else {
          console.log(`❌ Failed to assign role to user`);
        }
      } else {
        console.log(`❌ User not found: ${testEmail}`);
        console.log('Available users:', usersData.data.map(u => u.email));
      }
      
    } else {
      console.log(`❌ Failed to create role: ${createRoleResponse.status}`);
    }
    
    // Verify permissions
    console.log('\n🔍 Verifying user permissions...');
    const verifyResponse = await fetch(`${baseUrl}/api/rbac/users/email/${testEmail}/permissions`);
    
    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      console.log(`✅ User now has ${verifyData.permissions?.length || 0} permissions`);
      if (verifyData.permissions?.length > 0) {
        console.log('📋 Permissions:', verifyData.permissions.map(p => p.permission_key).join(', '));
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n🎉 Permission assignment completed!');
  console.log('Now try accessing the dashboard again.');
}

assignTestPermissions();
