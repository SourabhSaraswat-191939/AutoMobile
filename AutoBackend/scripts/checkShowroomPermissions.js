import mongoose from 'mongoose';
import Permission from '../models/Permission.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkShowroomPermissions() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    const showroomId = '674c5b3b8f8a5c2d4e6f7891';
    
    // Check all permissions
    const allPermissions = await Permission.find({}).select('permission_key name showroom_id -_id');
    console.log('\n📋 All Permissions in Database:');
    console.log('='.repeat(70));
    
    allPermissions.forEach(p => {
      console.log(`${p.permission_key.padEnd(30)} | ${p.name.padEnd(25)} | ${p.showroom_id}`);
    });
    
    console.log('='.repeat(70));
    console.log(`Total: ${allPermissions.length} permissions`);

    // Check permissions for specific showroom
    const showroomPermissions = await Permission.find({ showroom_id: showroomId }).select('permission_key name -_id');
    console.log(`\n📋 Permissions for Showroom ${showroomId}:`);
    console.log('='.repeat(50));
    
    showroomPermissions.forEach(p => {
      console.log(`${p.permission_key.padEnd(30)} | ${p.name}`);
    });
    
    console.log('='.repeat(50));
    console.log(`Total for showroom: ${showroomPermissions.length} permissions`);

    // Check permissions without showroom_id (might be missing the field)
    const noShowroomPermissions = await Permission.find({ showroom_id: { $exists: false } }).select('permission_key name -_id');
    console.log(`\n📋 Permissions without showroom_id:`);
    console.log('='.repeat(50));
    
    noShowroomPermissions.forEach(p => {
      console.log(`${p.permission_key.padEnd(30)} | ${p.name}`);
    });
    
    console.log('='.repeat(50));
    console.log(`Total without showroom_id: ${noShowroomPermissions.length} permissions`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkShowroomPermissions();
