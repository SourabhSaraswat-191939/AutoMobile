// Script to clean up old permissions and keep only the ones we want

const cleanupPermissions = async () => {
  try {
    console.log('🧹 Cleaning up old permissions...');
    
    // List of permissions to remove (the multiple upload ones we don't want)
    const permissionsToRemove = [
      'ro_billing_upload',
      'operations_upload', 
      'warranty_upload',
      'service_booking_upload',
      'average_upload',
      'assign_targets'  // Also remove this since we replaced with gm_targets
    ];
    
    // Get all current permissions first
    const permissionsResponse = await fetch('http://localhost:5000/api/rbac/permissions');
    const permissions = await permissionsResponse.json();
    
    console.log('📋 Current permissions count:', permissions.data?.length || 0);
    
    // Find permissions to remove
    const toRemove = permissions.data?.filter(p => 
      permissionsToRemove.includes(p.permission_key)
    ) || [];
    
    console.log('🗑️  Permissions to remove:', toRemove.length);
    toRemove.forEach(p => {
      console.log(`  - ${p.permission_key}: ${p.name}`);
    });
    
    // Note: We would need a DELETE endpoint to remove permissions
    // For now, let's just show what needs to be cleaned up
    
    console.log('✅ Cleanup analysis complete');
    console.log('💡 You may need to manually remove these from the database or add a DELETE endpoint');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
};

// Run the cleanup
cleanupPermissions();
