import mongoose from 'mongoose';
import User from '../models/User.js';
import Role from '../models/Role.js';
import Permission from '../models/Permission.js';
import UserRoleMapping from '../models/UserRoleMapping.js';
import RolePermissionMapping from '../models/RolePermissionMapping.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkUserRolePermissions() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    const userEmail = 'sm.pune@shubh.com';
    
    // Find the user
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      console.log('❌ User not found:', userEmail);
      return;
    }
    
    console.log(`👤 User: ${user.name} (${user.email})`);
    console.log(`🆔 User ID: ${user._id}`);
    
    // Find user roles
    const userRoles = await UserRoleMapping.find({ user_id: user._id }).populate('role_id');
    console.log(`\n🎭 User has ${userRoles.length} role(s):`);
    
    let totalPermissions = 0;
    const allPermissions = new Set();
    
    for (const userRole of userRoles) {
      console.log(`\n📋 Role: ${userRole.role_id.name}`);
      console.log(`🆔 Role ID: ${userRole.role_id._id}`);
      
      // Find permissions for this role
      const rolePermissions = await RolePermissionMapping.find({ 
        role_id: userRole.role_id._id 
      }).populate('permission_id');
      
      console.log(`🔑 This role has ${rolePermissions.length} permission(s):`);
      
      rolePermissions.forEach((rp, index) => {
        const permKey = rp.permission_id.permission_key;
        const permName = rp.permission_id.name;
        console.log(`  ${index + 1}. ${permKey} | ${permName}`);
        allPermissions.add(permKey);
      });
      
      totalPermissions += rolePermissions.length;
    }
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`Total roles: ${userRoles.length}`);
    console.log(`Total permissions (with duplicates): ${totalPermissions}`);
    console.log(`Unique permissions: ${allPermissions.size}`);
    
    console.log(`\n🔍 All unique permissions for ${userEmail}:`);
    Array.from(allPermissions).forEach((perm, index) => {
      console.log(`  ${index + 1}. ${perm}`);
    });

    // Expected permissions based on user's description
    const expectedPermissions = [
      'upload',
      'service_booking_dashboard', 
      'ro_billing_report',
      'ro_billing_dashboard'
    ];
    
    console.log(`\n✅ Expected permissions (4):`);
    expectedPermissions.forEach((perm, index) => {
      const hasIt = allPermissions.has(perm);
      console.log(`  ${index + 1}. ${perm} ${hasIt ? '✅' : '❌'}`);
    });
    
    console.log(`\n🔍 Extra permissions (not expected):`);
    Array.from(allPermissions).forEach(perm => {
      if (!expectedPermissions.includes(perm)) {
        console.log(`  ⚠️ ${perm} (extra)`);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkUserRolePermissions();
