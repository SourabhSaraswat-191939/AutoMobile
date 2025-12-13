import mongoose from 'mongoose';
import Permission from './models/Permission.js';
import dotenv from 'dotenv';

dotenv.config();

async function verifyPermissions() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    // Get all permissions
    const permissions = await Permission.find({}).sort({ permission_key: 1 });
    
    console.log(`\n📊 Total Permissions Found: ${permissions.length}\n`);
    
    // Critical permissions for dashboard routing
    const criticalPermissions = [
      'can_access_gm_dashboard',
      'can_access_sm_dashboard', 
      'can_access_sa_dashboard',
      'can_upload_ro_sheet',
      'ro_billing_dashboard',
      'operations_dashboard'
    ];
    
    console.log('🔑 Critical Permissions Status:');
    criticalPermissions.forEach(key => {
      const found = permissions.find(p => p.permission_key === key);
      const status = found ? '✅' : '❌';
      console.log(`   ${status} ${key}: ${found ? found.name : 'MISSING'}`);
    });
    
    console.log('\n📋 All Available Permissions:');
    permissions.forEach((perm, index) => {
      console.log(`   ${index + 1}. ${perm.permission_key} - ${perm.name}`);
    });
    
    console.log('\n🎯 Permission System Ready!');
    console.log('You can now:');
    console.log('1. Go to GM Dashboard → User Access');
    console.log('2. Create roles with these permissions');
    console.log('3. Assign roles to users');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

verifyPermissions();
