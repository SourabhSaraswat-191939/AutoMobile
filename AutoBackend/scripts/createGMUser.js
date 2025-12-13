import mongoose from 'mongoose';
import User from '../models/User.js';
import Role from '../models/Role.js';
import Permission from '../models/Permission.js';
import UserRoleMapping from '../models/UserRoleMapping.js';
import RolePermissionMapping from '../models/RolePermissionMapping.js';
import dotenv from 'dotenv';

dotenv.config();

async function createGMUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    // 1. Create the GM user if not exists
    const gmEmail = 'gm@shubh.com';
    let gmUser = await User.findOne({ email: gmEmail });
    
    if (!gmUser) {
      gmUser = await User.create({
        name: 'General Manager',
        email: gmEmail,
        username: 'gm_user',
        phone: '9999999999',
        address: 'Head Office',
        org_id: '674c5b3b8f8a5c2d4e6f7890'
      });
      console.log('✅ Created GM user:', gmEmail);
    } else {
      console.log('✅ GM user already exists:', gmEmail);
    }

    // 2. Create or find GM role
    let gmRole = await Role.findOne({ name: 'General Manager' });
    
    if (!gmRole) {
      gmRole = await Role.create({
        name: 'General Manager',
        desc: 'Full access General Manager role',
        showroom_id: '674c5b3b8f8a5c2d4e6f7891'
      });
      console.log('✅ Created General Manager role');
    } else {
      console.log('✅ General Manager role already exists');
    }

    // 3. Assign GM role to user (if not already assigned)
    const existingUserRole = await UserRoleMapping.findOne({
      user_id: gmUser._id,
      role_id: gmRole._id
    });

    if (!existingUserRole) {
      await UserRoleMapping.create({
        user_id: gmUser._id,
        role_id: gmRole._id,
        showroom_id: '674c5b3b8f8a5c2d4e6f7891'
      });
      console.log('✅ Assigned General Manager role to user');
    } else {
      console.log('✅ User already has General Manager role');
    }

    // 4. Get all permissions and assign to GM role
    const allPermissions = await Permission.find({});
    console.log(`📋 Found ${allPermissions.length} permissions to assign`);

    let assignedCount = 0;
    for (const permission of allPermissions) {
      const existingRolePermission = await RolePermissionMapping.findOne({
        role_id: gmRole._id,
        permission_id: permission._id
      });

      if (!existingRolePermission) {
        await RolePermissionMapping.create({
          role_id: gmRole._id,
          permission_id: permission._id,
          showroom_id: '674c5b3b8f8a5c2d4e6f7891',
          meta: {}
        });
        assignedCount++;
      }
    }

    console.log(`✅ Assigned ${assignedCount} new permissions to GM role`);

    // 5. Verify the setup
    console.log('\n🔍 Verifying setup...');
    
    const userRoles = await UserRoleMapping.find({ user_id: gmUser._id }).populate('role_id');
    console.log(`👤 User roles: ${userRoles.length}`);
    
    const rolePermissions = await RolePermissionMapping.find({ role_id: gmRole._id }).populate('permission_id');
    console.log(`🔑 Role permissions: ${rolePermissions.length}`);

    console.log('\n🎉 SUCCESS! GM user setup completed:');
    console.log(`📧 Email: ${gmEmail}`);
    console.log(`👤 User ID: ${gmUser._id}`);
    console.log(`🎭 Role: ${gmRole.name}`);
    console.log(`🔑 Total Permissions: ${rolePermissions.length}`);
    console.log('\n✅ The API /api/rbac/users/email/gm@shubh.com/permissions should now work!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createGMUser();
