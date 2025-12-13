import fetch from 'node-fetch';

async function testPermissionsAPI() {
  try {
    const response = await fetch('http://localhost:5000/api/rbac/permissions?showroom_id=674c5b3b8f8a5c2d4e6f7891');
    const data = await response.json();
    
    console.log('📡 API Response:');
    console.log('✅ Success:', data.success);
    console.log('📊 Total permissions:', data.data.length);
    console.log('\n📋 Permissions:');
    console.log('='.repeat(50));
    
    data.data.forEach((p, i) => {
      console.log(`${(i+1).toString().padStart(2)}. ${p.permission_key.padEnd(25)} | ${p.name}`);
    });
    
    console.log('='.repeat(50));
    console.log(`✅ API now returns ${data.data.length} permissions!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testPermissionsAPI();
