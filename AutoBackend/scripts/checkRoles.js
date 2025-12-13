import mongoose from 'mongoose';
import Role from '../models/Role.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkRoles() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    const roles = await Role.find({}).select('name showroom_id -_id');
    console.log('\n📋 All Roles in Database:');
    console.log('='.repeat(50));
    
    roles.forEach(r => {
      console.log(`${r.name.padEnd(25)} | showroom: ${r.showroom_id || 'none'}`);
    });
    
    console.log('='.repeat(50));
    console.log(`Total: ${roles.length} roles`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkRoles();
