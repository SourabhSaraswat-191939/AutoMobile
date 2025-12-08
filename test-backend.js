// Simple test to check if backend is working and seed permissions

const testBackend = async () => {
  try {
    console.log('🧪 Testing backend connection...');
    
    // Test 1: Check if server is running
    const healthResponse = await fetch('http://localhost:5000/api/rbac/permissions');
    console.log('✅ Server is running, status:', healthResponse.status);
    
    // Test 2: Seed permissions
    console.log('🌱 Seeding permissions...');
    const seedResponse = await fetch('http://localhost:5000/api/rbac/seed-permissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const seedResult = await seedResponse.json();
    console.log('📋 Seed result:', seedResult);
    
    // Test 3: Get all permissions
    console.log('📋 Getting all permissions...');
    const permissionsResponse = await fetch('http://localhost:5000/api/rbac/permissions');
    const permissions = await permissionsResponse.json();
    
    console.log('✅ Total permissions found:', permissions.data?.length || 0);
    console.log('📋 Permissions list:');
    permissions.data?.forEach(p => {
      console.log(`  - ${p.permission_key}: ${p.name}`);
    });
    
  } catch (error) {
    console.error('❌ Backend test failed:', error.message);
  }
};

// Run the test
testBackend();
