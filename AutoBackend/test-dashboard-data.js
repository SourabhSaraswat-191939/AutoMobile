import mongoose from 'mongoose';
import UploadedFileMetaDetails from './models/UploadedFileMetaDetails.js';
import ROBillingData from './models/ROBillingData.js';
import WarrantyData from './models/WarrantyData.js';
import BookingListData from './models/BookingListData.js';
import OperationsPartData from './models/OperationsPartData.js';

// Connect to MongoDB
const MONGO_URI = 'mongodb+srv://akshaybondresitcom:Jyoti%402828@cluster0.zihf2hi.mongodb.net/automobileDashboardTest3?retryWrites=true&w=majority&appName=Cluster0';

async function testDashboardData() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔍 CHECKING DATABASE COLLECTIONS...\n');

    // Check UploadedFileMetaDetails
    const uploads = await UploadedFileMetaDetails.find({}).sort({ uploaded_at: -1 }).limit(5);
    console.log(`📊 UploadedFileMetaDetails: ${uploads.length} records`);
    
    if (uploads.length > 0) {
      console.log('📋 Recent uploads:');
      uploads.forEach((upload, index) => {
        console.log(`   ${index + 1}. ${upload.uploaded_file_name}`);
        console.log(`      - File Type: ${upload.file_type}`);
        console.log(`      - Uploaded By: ${upload.uploaded_by}`);
        console.log(`      - Rows Count: ${upload.rows_count}`);
        console.log(`      - Processing Status: ${upload.processing_status}`);
        console.log(`      - Upload Case: ${upload.upload_case}`);
        console.log(`      - Rows Inserted: ${upload.rows_inserted}`);
        console.log(`      - Rows Updated: ${upload.rows_updated}`);
        console.log(`      - Uploaded At: ${upload.uploaded_at}`);
        console.log(`      - File ID: ${upload._id}`);
        console.log('');
      });
    }

    // Check each data collection
    const collections = [
      { name: 'ROBillingData', model: ROBillingData },
      { name: 'WarrantyData', model: WarrantyData },
      { name: 'BookingListData', model: BookingListData },
      { name: 'OperationsPartData', model: OperationsPartData }
    ];

    for (const collection of collections) {
      const count = await collection.model.countDocuments({});
      console.log(`📊 ${collection.name}: ${count} records`);
      
      if (count > 0) {
        const sample = await collection.model.findOne({}).lean();
        console.log(`   Sample record:`, {
          _id: sample._id,
          uploaded_file_id: sample.uploaded_file_id,
          created_at: sample.created_at
        });
        
        // Check if records have uploaded_file_id
        const withFileId = await collection.model.countDocuments({ uploaded_file_id: { $exists: true, $ne: null } });
        const withoutFileId = count - withFileId;
        console.log(`   Records with uploaded_file_id: ${withFileId}`);
        console.log(`   Records without uploaded_file_id: ${withoutFileId}`);
      }
      console.log('');
    }

    // Test the dashboard API logic
    console.log('\n🧪 TESTING DASHBOARD API LOGIC...\n');
    
    const testUsers = ['sm.pune@shubh.com', 'different.user@example.com', 'sm.test@example.com'];
    
    for (const testUser of testUsers) {
      console.log(`🎯 Testing dashboard data for: ${testUser}`);
      
      // Simulate the dashboard API logic
      const fileQuery = { file_type: 'ro_billing' };
      
      // Try exact email match first
      const exactQuery = { ...fileQuery, uploaded_by: testUser };
      let matchedUploads = await UploadedFileMetaDetails.find(exactQuery)
        .sort({ uploaded_at: -1 })
        .limit(10);
      console.log(`   Exact match: ${matchedUploads.length} uploads`);

      // If no uploads found for exact email, try role-based matching
      if (matchedUploads.length === 0) {
        console.log(`   No exact match, trying role-based matching...`);
        
        // For service managers, try to find uploads from any SM email
        if (testUser && (testUser.includes('sm.') || testUser.includes('service'))) {
          const smQuery = { 
            ...fileQuery,
            uploaded_by: { $regex: /sm\.|service/i }
          };
          matchedUploads = await UploadedFileMetaDetails.find(smQuery)
            .sort({ uploaded_at: -1 })
            .limit(10);
          console.log(`   SM role-based match: ${matchedUploads.length} uploads`);
        }
        
        // If still no uploads, get all uploads for the file type
        if (matchedUploads.length === 0) {
          matchedUploads = await UploadedFileMetaDetails.find(fileQuery)
            .sort({ uploaded_at: -1 })
            .limit(10);
          console.log(`   Fallback match: ${matchedUploads.length} uploads`);
        }
      }

      if (matchedUploads.length > 0) {
        const fileIds = matchedUploads.map(f => f._id);
        const dataCount = await ROBillingData.countDocuments({ uploaded_file_id: { $in: fileIds } });
        console.log(`   ✅ Found ${dataCount} data records for dashboard`);
        
        if (dataCount > 0) {
          console.log(`   🎉 Dashboard should show data!`);
        } else {
          console.log(`   ❌ No data records found - dashboard will be empty`);
        }
      } else {
        console.log(`   ❌ No uploads found - dashboard will be empty`);
      }
      console.log('');
    }

    // Check for orphaned data (data without valid uploaded_file_id)
    console.log('\n🔍 CHECKING FOR ORPHANED DATA...\n');
    
    const allFileIds = uploads.map(u => u._id);
    const orphanedRO = await ROBillingData.countDocuments({ 
      uploaded_file_id: { $nin: allFileIds } 
    });
    
    console.log(`📊 Orphaned RO Billing records: ${orphanedRO}`);
    
    if (orphanedRO > 0) {
      console.log(`⚠️ Found ${orphanedRO} RO Billing records with invalid uploaded_file_id`);
      const sampleOrphan = await ROBillingData.findOne({ 
        uploaded_file_id: { $nin: allFileIds } 
      }).lean();
      console.log(`   Sample orphaned record uploaded_file_id:`, sampleOrphan?.uploaded_file_id);
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

testDashboardData();
