import mongoose from 'mongoose';
import User from '../models/User.js';
import Role from '../models/Role.js';
import UserRoleMapping from '../models/UserRoleMapping.js';
import dotenv from 'dotenv';

dotenv.config();

async function removeExtraRole() {
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
    
    // Find the "crm" role that's causing extra permissions
    const crmRole = await Role.findOne({ name: 'crm' });
    if (!crmRole) {
      console.log('❌ CRM role not found');
      return;
    }
    
    console.log(`🎭 Found CRM role: ${crmRole.name} (ID: ${crmRole._id})`);
    
    // Remove the user-role mapping for CRM role
    const result = await UserRoleMapping.deleteOne({
      user_id: user._id,
      role_id: crmRole._id
    });
    
    if (result.deletedCount > 0) {
      console.log('✅ Successfully removed CRM role from user');
    } else {
      console.log('ℹ️ No CRM role mapping found to remove');
    }
    
    // Verify the user now only has the "EEE" role
    const remainingRoles = await UserRoleMapping.find({ user_id: user._id }).populate('role_id');
    console.log(`\n📋 User now has ${remainingRoles.length} role(s):`);
    
    remainingRoles.forEach(userRole => {
      console.log(`  - ${userRole.role_id.name}`);
    });
    
    console.log('\n✅ User should now have only 4 permissions from the "EEE" role:');
    console.log('  1. upload');
    console.log('  2. service_booking_dashboard');
    console.log('  3. ro_billing_report');
    console.log('  4. ro_billing_dashboard');
    
    console.log('\n🔄 Please clear the frontend cache to see the updated permissions!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

removeExtraRole();
