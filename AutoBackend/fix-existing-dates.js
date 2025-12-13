import mongoose from 'mongoose';
import ROBillingData from './models/ROBillingData.js';
import WarrantyData from './models/WarrantyData.js';
import BookingListData from './models/BookingListData.js';
import { convertExcelDate } from './utils/dateConverter.js';

// Connect to MongoDB
const MONGO_URI = 'mongodb+srv://akshaybondresitcom:Jyoti%402828@cluster0.zihf2hi.mongodb.net/automobileDashboardTest3?retryWrites=true&w=majority&appName=Cluster0';

async function fixExistingDates() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔧 FIXING EXISTING WRONG DATES IN DATABASE...\n');

    // Fix RO Billing dates
    console.log('📊 Fixing RO Billing dates...');
    const roBillingRecords = await ROBillingData.find({
      bill_date: { $regex: /^\d{5}$/ } // Find 5-digit serial numbers like "45931"
    });
    
    console.log(`   Found ${roBillingRecords.length} RO Billing records with wrong date format`);
    
    let roFixedCount = 0;
    for (const record of roBillingRecords) {
      const originalDate = record.bill_date;
      const convertedDate = convertExcelDate(originalDate);
      
      if (convertedDate !== originalDate) {
        await ROBillingData.updateOne(
          { _id: record._id },
          { bill_date: convertedDate }
        );
        console.log(`   ✅ Fixed RO ${record.RO_No}: ${originalDate} → ${convertedDate}`);
        roFixedCount++;
      }
    }
    console.log(`   📊 Fixed ${roFixedCount} RO Billing date records\n`);

    // Fix Warranty dates
    console.log('📊 Fixing Warranty dates...');
    const warrantyRecords = await WarrantyData.find({
      claim_date: { $regex: /^\d{5}$/ } // Find 5-digit serial numbers
    });
    
    console.log(`   Found ${warrantyRecords.length} Warranty records with wrong date format`);
    
    let warrantyFixedCount = 0;
    for (const record of warrantyRecords) {
      const originalDate = record.claim_date;
      const convertedDate = convertExcelDate(originalDate);
      
      if (convertedDate !== originalDate) {
        await WarrantyData.updateOne(
          { _id: record._id },
          { claim_date: convertedDate }
        );
        console.log(`   ✅ Fixed Warranty ${record.claim_number}: ${originalDate} → ${convertedDate}`);
        warrantyFixedCount++;
      }
    }
    console.log(`   📊 Fixed ${warrantyFixedCount} Warranty date records\n`);

    // Fix Booking List dates
    console.log('📊 Fixing Booking List dates...');
    const bookingRecords = await BookingListData.find({
      bt_date_time: { $regex: /^\d{5}$/ } // Find 5-digit serial numbers
    });
    
    console.log(`   Found ${bookingRecords.length} Booking records with wrong date format`);
    
    let bookingFixedCount = 0;
    for (const record of bookingRecords) {
      const originalDate = record.bt_date_time;
      const convertedDate = convertExcelDate(originalDate);
      
      if (convertedDate !== originalDate) {
        await BookingListData.updateOne(
          { _id: record._id },
          { bt_date_time: convertedDate }
        );
        console.log(`   ✅ Fixed Booking ${record.Reg_No}: ${originalDate} → ${convertedDate}`);
        bookingFixedCount++;
      }
    }
    console.log(`   📊 Fixed ${bookingFixedCount} Booking date records\n`);

    // Summary
    const totalFixed = roFixedCount + warrantyFixedCount + bookingFixedCount;
    console.log('🎉 DATE FIX SUMMARY:');
    console.log(`   - RO Billing records fixed: ${roFixedCount}`);
    console.log(`   - Warranty records fixed: ${warrantyFixedCount}`);
    console.log(`   - Booking records fixed: ${bookingFixedCount}`);
    console.log(`   - Total records fixed: ${totalFixed}`);

    if (totalFixed > 0) {
      console.log('\n✅ All existing wrong dates have been fixed!');
      console.log('📅 YASHPAL ASEDIYA and other advisors should now show correct dates in the Service Advisor Performance table.');
    } else {
      console.log('\n✅ No wrong dates found to fix.');
    }

    // Verify the fix for YASHPAL ASEDIYA specifically
    console.log('\n🎯 Verifying YASHPAL ASEDIYA dates after fix...');
    const yashpalRecords = await ROBillingData.find({
      service_advisor: 'YASHPAL ASEDIYA'
    }).select('RO_No bill_date service_advisor');

    console.log(`   Found ${yashpalRecords.length} records for YASHPAL ASEDIYA:`);
    yashpalRecords.forEach(record => {
      console.log(`   - RO: ${record.RO_No}, Date: ${record.bill_date}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

fixExistingDates();
