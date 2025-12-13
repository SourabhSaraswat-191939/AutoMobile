import mongoose from 'mongoose';
import Permission from '../models/Permission.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkPermissions() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    const permissions = await Permission.find({}).select('permission_key name -_id');
    console.log('\n📋 Database Permissions:');
    console.log('='.repeat(50));
    
    permissions.forEach(p => {
      console.log(`${p.permission_key.padEnd(30)} | ${p.name}`);
    });
    
    console.log('='.repeat(50));
    console.log(`Total: ${permissions.length} permissions`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkPermissions();
