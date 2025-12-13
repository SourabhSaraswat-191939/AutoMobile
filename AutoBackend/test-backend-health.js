import fetch from 'node-fetch';

async function testBackendHealth() {
  console.log('🔍 Testing Backend Health...\n');
  
  const baseUrl = 'http://localhost:5000';
  
  const endpoints = [
    { name: 'Root Endpoint', url: `${baseUrl}/` },
    { name: 'Health Check', url: `${baseUrl}/health` },
    { name: 'API Status', url: `${baseUrl}/api` },
    { name: 'RBAC Permissions', url: `${baseUrl}/api/rbac/permissions` },
    { name: 'Dashboard Data', url: `${baseUrl}/api/service-manager/dashboard-data?uploadedBy=sm.pune@shubh.com&city=Pune&dataType=ro_billing` }
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`📡 Testing: ${endpoint.name}`);
      const response = await fetch(endpoint.url);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Status: ${response.status} - Working`);
        console.log(`   📊 Response: ${JSON.stringify(data).substring(0, 100)}...`);
      } else {
        console.log(`   ❌ Status: ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    console.log('');
  }
  
  // Test specific API that frontend uses
  console.log('🎯 Testing Critical Frontend APIs...\n');
  
  try {
    // Test permission check
    const permResponse = await fetch(`${baseUrl}/api/rbac/users/email/sm.pune@shubh.com/permissions`);
    if (permResponse.ok) {
      const permissions = await permResponse.json();
      console.log('✅ Permission API working');
      console.log(`   📋 User permissions: ${permissions.permissions?.length || 0} found`);
    } else {
      console.log(`❌ Permission API failed: ${permResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ Permission API error: ${error.message}`);
  }
  
  console.log('\n🏁 Backend health check completed!');
}

testBackendHealth();
