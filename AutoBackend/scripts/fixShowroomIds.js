import mongoose from 'mongoose';
import Permission from '../models/Permission.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixShowroomIds() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    const defaultShowroomId = '674c5b3b8f8a5c2d4e6f7891';
    
    // Find permissions without showroom_id
    const permissionsWithoutShowroom = await Permission.find({ 
      $or: [
        { showroom_id: { $exists: false } },
        { showroom_id: null },
        { showroom_id: '' }
      ]
    });
    
    console.log(`📋 Found ${permissionsWithoutShowroom.length} permissions without showroom_id`);
    
    if (permissionsWithoutShowroom.length > 0) {
      console.log('🔧 Updating permissions with default showroom_id...');
      
      for (const permission of permissionsWithoutShowroom) {
        await Permission.updateOne(
          { _id: permission._id },
          { $set: { showroom_id: defaultShowroomId } }
        );
        console.log(`  ✅ Updated: ${permission.permission_key} -> ${permission.name}`);
      }
      
      console.log(`✅ Updated ${permissionsWithoutShowroom.length} permissions with showroom_id`);
    } else {
      console.log('✅ All permissions already have showroom_id');
    }

    // Verify the fix
    const allPermissions = await Permission.find({ showroom_id: defaultShowroomId }).select('permission_key name -_id');
    console.log(`\n📋 Permissions for Showroom ${defaultShowroomId} (after fix):`);
    console.log('='.repeat(50));
    
    allPermissions.forEach(p => {
      console.log(`${p.permission_key.padEnd(30)} | ${p.name}`);
    });
    
    console.log('='.repeat(50));
    console.log(`Total for showroom: ${allPermissions.length} permissions`);

    // Check if any permissions still don't have showroom_id
    const stillMissing = await Permission.find({ 
      $or: [
        { showroom_id: { $exists: false } },
        { showroom_id: null },
        { showroom_id: '' }
      ]
    });
    
    if (stillMissing.length > 0) {
      console.log(`\n⚠️ Warning: ${stillMissing.length} permissions still missing showroom_id`);
    } else {
      console.log('\n✅ All permissions now have showroom_id!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

fixShowroomIds();
