import mongoose from 'mongoose';
import Permission from '../models/Permission.js';
import RolePermissionMapping from '../models/RolePermissionMapping.js';
import dotenv from 'dotenv';

dotenv.config();

async function cleanupPermissions() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    // List of old hardcoded permissions to remove
    const oldPermissions = [
      'can_access_gm_dashboard',
      'can_access_sm_dashboard', 
      'can_access_sa_dashboard',
      'can_upload_ro_sheet',
      'can_assign_target_to_sm',
      'can_access_bodyshop'
    ];

    console.log('🗑️ Removing old hardcoded permissions...');

    for (const permKey of oldPermissions) {
      // Find the permission
      const permission = await Permission.findOne({ permission_key: permKey });
      
      if (permission) {
        console.log(`Found permission: ${permKey}`);
        
        // Remove all role-permission mappings for this permission
        const mappingsDeleted = await RolePermissionMapping.deleteMany({ 
          permission_id: permission._id 
        });
        console.log(`  - Deleted ${mappingsDeleted.deletedCount} role mappings`);
        
        // Delete the permission itself
        await Permission.deleteOne({ _id: permission._id });
        console.log(`  - Deleted permission: ${permission.name}`);
      } else {
        console.log(`Permission not found: ${permKey}`);
      }
    }

    // Verify remaining permissions
    const remainingPermissions = await Permission.find({}).select('permission_key name -_id');
    console.log('\n📋 Remaining Database Permissions:');
    console.log('='.repeat(50));
    
    remainingPermissions.forEach(p => {
      console.log(`${p.permission_key.padEnd(30)} | ${p.name}`);
    });
    
    console.log('='.repeat(50));
    console.log(`Total: ${remainingPermissions.length} permissions`);
    console.log('\n✅ Cleanup completed! Old hardcoded permissions removed.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

cleanupPermissions();
