import fetch from 'node-fetch';

async function checkGMPermissions() {
  try {
    const response = await fetch('http://localhost:5000/api/rbac/users/email/gm%40shubh.com/permissions');
    const data = await response.json();
    
    console.log('📧 GM User Permissions Check:');
    console.log('✅ Success:', data.success);
    console.log('📊 Total permissions:', data.data.permissions.length);
    
    // Check for SM dashboard permissions specifically
    const smPermissions = ['ro_billing_dashboard', 'operations_dashboard', 'ro_billing_upload', 'operations_upload', 'dashboard'];
    console.log('\n🔍 SM Dashboard Permissions Check:');
    console.log('='.repeat(40));
    
    smPermissions.forEach(perm => {
      const hasIt = data.data.permissions.some(p => p.permission_key === perm);
      console.log(`${hasIt ? '✅' : '❌'} ${perm}`);
    });
    
    console.log('\n📋 All GM Permissions:');
    console.log('='.repeat(50));
    data.data.permissions.forEach((p, i) => {
      console.log(`${(i+1).toString().padStart(2)}. ${p.permission_key.padEnd(25)} | ${p.name}`);
    });
    
    // Check if GM should have access
    const hasAnySmPermission = smPermissions.some(perm => 
      data.data.permissions.some(p => p.permission_key === perm)
    );
    
    console.log('\n🎯 Access Decision:');
    console.log(`GM should have SM dashboard access: ${hasAnySmPermission ? '✅ YES' : '❌ NO'}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkGMPermissions();
