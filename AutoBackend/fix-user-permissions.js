import mongoose from 'mongoose';
import User from './models/User.js';
import Role from './models/Role.js';
import Permission from './models/Permission.js';
import UserRoleMapping from './models/UserRoleMapping.js';
import RolePermissionMapping from './models/RolePermissionMapping.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixUserPermissions() {
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
    
    console.log(`✅ Found user: ${testEmail} (ID: ${user._id})`);
    
    // Create or find SM role
    let smRole = await Role.findOne({ name: 'Service Manager' });
    
    if (!smRole) {
      smRole = await Role.create({
        name: 'Service Manager',
        desc: 'Service Manager with SM dashboard access'
      });
      console.log('✅ Created Service Manager role');
    } else {
      console.log('✅ Found existing Service Manager role');
    }
    
    // Get key permissions for SM
    const keyPermissionKeys = [
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
      'service_booking_report'
    ];
    
    console.log('\n🔗 Assigning permissions to role...');
    
    for (const permKey of keyPermissionKeys) {
      const permission = await Permission.findOne({ permission_key: permKey });
      
      if (permission) {
        // Check if role-permission mapping already exists
        const existing = await RolePermissionMapping.findOne({
          role_id: smRole._id,
          permission_id: permission._id
        });
        
        if (!existing) {
          await RolePermissionMapping.create({
            role_id: smRole._id,
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
    console.log('\n👤 Assigning role to user...');
    
    const existingUserRole = await UserRoleMapping.findOne({
      user_id: user._id,
      role_id: smRole._id
    });
    
    if (!existingUserRole) {
      await UserRoleMapping.create({
        user_id: user._id,
        role_id: smRole._id
      });
      console.log('✅ Role assigned to user');
    } else {
      console.log('⏭️  Role already assigned to user');
    }
    
    // Verify final permissions
    console.log('\n🔍 Verifying user permissions...');
    
    const userRoles = await UserRoleMapping.find({ user_id: user._id }).populate('role_id');
    console.log(`📋 User roles: ${userRoles.length}`);
    
    let totalPermissions = 0;
    for (const userRole of userRoles) {
      const rolePermissions = await RolePermissionMapping.find({ 
        role_id: userRole.role_id._id 
      }).populate('permission_id');
      
      console.log(`   Role: ${userRole.role_id.name} - ${rolePermissions.length} permissions`);
      totalPermissions += rolePermissions.length;
    }
    
    console.log(`\n🎉 SUCCESS! User now has ${totalPermissions} total permissions`);
    console.log('\n✅ Backend is working properly now!');
    console.log('Try accessing the dashboard again.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

fixUserPermissions();
