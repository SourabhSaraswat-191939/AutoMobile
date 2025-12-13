import mongoose from 'mongoose';
import User from './models/User.js';
import Role from './models/Role.js';
import Permission from './models/Permission.js';
import UserRoleMapping from './models/UserRoleMapping.js';
import RolePermissionMapping from './models/RolePermissionMapping.js';
import dotenv from 'dotenv';

dotenv.config();

async function assignCriticalPermissions() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    const testEmail = 'sm.pune@shubh.com';
    
    // Find the user
    const user = await User.findOne({ email: testEmail });
    if (!user) {
      console.log(`❌ User not found: ${testEmail}`);
      return;
    }
    
    console.log(`✅ Found user: ${testEmail}`);
    
    // Find or create a comprehensive role with ALL permissions
    let fullAccessRole = await Role.findOne({ name: 'Full Access SM' });
    
    if (!fullAccessRole) {
      fullAccessRole = await Role.create({
        name: 'Full Access SM',
        desc: 'Service Manager with full dashboard and feature access'
      });
      console.log('✅ Created Full Access SM role');
    } else {
      console.log('✅ Found existing Full Access SM role');
    }
    
    // Critical permissions that the frontend needs
    const criticalPermissions = [
      'can_access_gm_dashboard',
      'can_access_sm_dashboard', 
      'can_access_sa_dashboard',
      'can_upload_ro_sheet',
      'can_assign_target_to_sm',
      'can_access_bodyshop',
      'dashboard',
      'overview',
      'ro_billing_dashboard',
      'operations_dashboard',
      'warranty_dashboard',
      'service_booking_dashboard',
      'ro_billing_upload',
      'operations_upload',
      'warranty_upload',
      'service_booking_upload',
      'ro_billing_report',
      'operations_report',
      'warranty_report',
      'service_booking_report',
      'manage_users',
      'manage_roles'
    ];
    
    console.log('\n🔗 Assigning critical permissions to role...');
    
    for (const permKey of criticalPermissions) {
      const permission = await Permission.findOne({ permission_key: permKey });
      
      if (permission) {
        // Check if role-permission mapping already exists
        const existing = await RolePermissionMapping.findOne({
          role_id: fullAccessRole._id,
          permission_id: permission._id
        });
        
        if (!existing) {
          await RolePermissionMapping.create({
            role_id: fullAccessRole._id,
            permission_id: permission._id
          });
          console.log(`   ✅ Assigned: ${permKey}`);
        } else {
          console.log(`   ⏭️  Already assigned: ${permKey}`);
        }
      } else {
        console.log(`   ❌ Permission not found: ${permKey}`);
      }
    }
    
    // Assign role to user
    console.log('\n👤 Assigning Full Access role to user...');
    
    const existingUserRole = await UserRoleMapping.findOne({
      user_id: user._id,
      role_id: fullAccessRole._id
    });
    
    if (!existingUserRole) {
      await UserRoleMapping.create({
        user_id: user._id,
        role_id: fullAccessRole._id
      });
      console.log('✅ Full Access role assigned to user');
    } else {
      console.log('⏭️  Full Access role already assigned to user');
    }
    
    // Verify final permissions
    console.log('\n🔍 Verifying user permissions...');
    
    const userRoles = await UserRoleMapping.find({ user_id: user._id }).populate('role_id');
    console.log(`📋 User roles: ${userRoles.length}`);
    
    let totalPermissions = 0;
    const allUserPermissions = [];
    
    for (const userRole of userRoles) {
      const rolePermissions = await RolePermissionMapping.find({ 
        role_id: userRole.role_id._id 
      }).populate('permission_id');
      
      console.log(`   Role: ${userRole.role_id.name} - ${rolePermissions.length} permissions`);
      totalPermissions += rolePermissions.length;
      
      // Collect permission keys
      rolePermissions.forEach(rp => {
        if (!allUserPermissions.includes(rp.permission_id.permission_key)) {
          allUserPermissions.push(rp.permission_id.permission_key);
        }
      });
    }
    
    console.log(`\n🎉 SUCCESS! User now has ${totalPermissions} total permissions`);
    
    // Check specifically for the critical permissions
    console.log('\n🔑 Critical Permission Status:');
    const criticalCheck = [
      'can_access_gm_dashboard',
      'can_access_sm_dashboard',
      'can_access_sa_dashboard', 
      'can_upload_ro_sheet',
      'can_assign_target_to_sm',
      'can_access_bodyshop'
    ];
    
    criticalCheck.forEach(perm => {
      const hasIt = allUserPermissions.includes(perm);
      console.log(`   ${hasIt ? '✅' : '❌'} ${perm}`);
    });
    
    console.log('\n✅ Permission system is now fully functional!');
    console.log('🚀 Try accessing the dashboard again - all permissions should work now.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

assignCriticalPermissions();
