// Script to remove old unwanted permissions

const removeOldPermissions = async () => {
  try {
    console.log('🧹 Removing old unwanted permissions...');
    
    // List of permissions to remove
    const permissionsToRemove = [
      'ro_billing_upload',
      'operations_upload', 
      'warranty_upload',
      'service_booking_upload',
      'average_upload',
      'assign_targets'  // Replaced with gm_targets
    ];
    
    // Get all current permissions
    const permissionsResponse = await fetch('http://localhost:5000/api/rbac/permissions');
    const permissions = await permissionsResponse.json();
    
    console.log('📋 Current permissions count:', permissions.data?.length || 0);
    
    // Find permissions to remove
    const toRemove = permissions.data?.filter(p => 
      permissionsToRemove.includes(p.permission_key)
    ) || [];
    
    console.log('🗑️  Found permissions to remove:', toRemove.length);
    
    // Remove each permission
    for (const permission of toRemove) {
      console.log(`🗑️  Removing: ${permission.permission_key} (${permission.name})`);
      
      const deleteResponse = await fetch(`http://localhost:5000/api/rbac/permissions/${permission._id}`, {
        method: 'DELETE'
      });
      
      if (deleteResponse.ok) {
        console.log(`✅ Removed: ${permission.permission_key}`);
      } else {
        console.log(`❌ Failed to remove: ${permission.permission_key}`);
      }
    }
    
    // Get updated permissions count
    const updatedResponse = await fetch('http://localhost:5000/api/rbac/permissions');
    const updatedPermissions = await updatedResponse.json();
    
    console.log('✅ Cleanup complete!');
    console.log('📋 Final permissions count:', updatedPermissions.data?.length || 0);
    
    console.log('\n📋 Remaining permissions:');
    updatedPermissions.data?.forEach(p => {
      console.log(`  - ${p.permission_key}: ${p.name}`);
    });
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
};

// Run the cleanup
removeOldPermissions();
