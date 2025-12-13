import mongoose from 'mongoose';
import User from '../models/User.js';
import Role from '../models/Role.js';
import Permission from '../models/Permission.js';
import UserRoleMapping from '../models/UserRoleMapping.js';
import RolePermissionMapping from '../models/RolePermissionMapping.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixGMPermissions() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    const gmEmail = 'gm@shubh.com';
    const showroomId = '674c5b3b8f8a5c2d4e6f7891';

    // 1. Find GM user and role
    const gmUser = await User.findOne({ email: gmEmail });
    if (!gmUser) {
      console.log('❌ GM user not found');
      return;
    }

    let gmRole = await Role.findOne({ name: 'General Manager', showroom_id: showroomId });
    if (!gmRole) {
      console.log('🔧 GM role not found, creating it...');
      gmRole = await Role.create({
        name: 'General Manager',
        desc: 'Full access General Manager role',
        showroom_id: showroomId
      });
      console.log('✅ Created GM role');
    }

    console.log(`✅ Found GM user: ${gmUser.name} (${gmUser.email})`);
    console.log(`✅ Found GM role: ${gmRole.name}`);

    // 2. Check existing user-role mapping
    let userRoleMapping = await UserRoleMapping.findOne({
      user_id: gmUser._id,
      role_id: gmRole._id
    });

    if (!userRoleMapping) {
      userRoleMapping = await UserRoleMapping.create({
        user_id: gmUser._id,
        role_id: gmRole._id,
        showroom_id: showroomId
      });
      console.log('✅ Created user-role mapping');
    } else {
      console.log('✅ User-role mapping already exists');
    }

    // 3. Get all permissions
    const allPermissions = await Permission.find({ showroom_id: showroomId });
    console.log(`📋 Found ${allPermissions.length} permissions to assign`);

    // 4. Clear existing role-permission mappings for this role
    await RolePermissionMapping.deleteMany({ role_id: gmRole._id });
    console.log('🗑️ Cleared existing role-permission mappings');

    // 5. Create new role-permission mappings for all permissions
    const rolePermissionMappings = allPermissions.map(permission => ({
      role_id: gmRole._id,
      permission_id: permission._id,
      showroom_id: showroomId,
      meta: {}
    }));

    await RolePermissionMapping.insertMany(rolePermissionMappings);
    console.log(`✅ Created ${rolePermissionMappings.length} role-permission mappings`);

    // 6. Verify the fix by checking user permissions
    console.log('\n🔍 Verifying GM permissions...');
    
    // Get user roles
    const userRoles = await UserRoleMapping.find({ user_id: gmUser._id })
      .populate('role_id');
    
    console.log(`👤 User has ${userRoles.length} roles`);
    
    // Get role permissions
    const rolePermissions = await RolePermissionMapping.find({ role_id: gmRole._id })
      .populate('permission_id');
    
    console.log(`🔑 Role has ${rolePermissions.length} permissions`);

    // Check specific SM dashboard permissions
    const smPermissions = ['ro_billing_dashboard', 'operations_dashboard', 'ro_billing_upload', 'operations_upload', 'dashboard'];
    console.log('\n🎯 SM Dashboard Permissions Check:');
    
    smPermissions.forEach(permKey => {
      const hasPermission = rolePermissions.some(rp => 
        rp.permission_id && rp.permission_id.permission_key === permKey
      );
      console.log(`${hasPermission ? '✅' : '❌'} ${permKey}`);
    });

    console.log('\n🎉 GM permissions fix completed!');
    console.log(`📧 User: ${gmEmail}`);
    console.log(`🎭 Role: ${gmRole.name}`);
    console.log(`🔑 Total Permissions: ${rolePermissions.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

fixGMPermissions();
