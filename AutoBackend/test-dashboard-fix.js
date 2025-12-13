import mongoose from 'mongoose';
import UploadedFileMetaDetails from './models/UploadedFileMetaDetails.js';
import ROBillingData from './models/ROBillingData.js';

// Connect to MongoDB
const MONGO_URI = 'mongodb+srv://akshaybondresitcom:Jyoti%402828@cluster0.zihf2hi.mongodb.net/automobileDashboardTest3?retryWrites=true&w=majority&appName=Cluster0';

async function testDashboardFix() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Test the smart matching logic
    const uploadedBy = 'different.user@example.com'; // Different email than stored
    const dataType = 'ro_billing';

    console.log(`\n🎯 Testing dashboard data for: "${uploadedBy}", type: ${dataType}`);

    // Simulate the fixed logic
    let fileQuery = {};
    
    const typeMapping = {
      'ro_billing': 'ro_billing',
      'operations': 'operations_part',
      'warranty': 'warranty',
      'service_booking': 'booking_list'
    };
    
    if (dataType && dataType !== 'all' && dataType !== 'average') {
      fileQuery.file_type = typeMapping[dataType] || dataType;
    }

    console.log(`🔍 Searching uploads with query:`, fileQuery);
    
    // Try exact email match first
    const exactQuery = { ...fileQuery, uploaded_by: uploadedBy };
    let uploads = await UploadedFileMetaDetails.find(exactQuery)
      .sort({ uploaded_at: -1 })
      .limit(10);
    console.log(`📊 Found ${uploads.length} uploads for exact email match`);

    // If no uploads found for exact email, try role-based matching
    if (uploads.length === 0) {
      console.log(`⚠️ No uploads found for email "${uploadedBy}", trying role-based matching...`);
      
      // For service managers, try to find uploads from any SM email
      if (uploadedBy && (uploadedBy.includes('sm.') || uploadedBy.includes('service'))) {
        const smQuery = { 
          ...fileQuery,
          uploaded_by: { $regex: /sm\.|service/i }
        };
        uploads = await UploadedFileMetaDetails.find(smQuery)
          .sort({ uploaded_at: -1 })
          .limit(10);
        console.log(`📊 Found ${uploads.length} uploads for SM role-based match`);
      }
      
      // If still no uploads, get all uploads for the file type
      if (uploads.length === 0) {
        uploads = await UploadedFileMetaDetails.find(fileQuery)
          .sort({ uploaded_at: -1 })
          .limit(10);
        console.log(`📊 Using fallback query, found ${uploads.length} uploads`);
        
        // Debug: Show available uploaded_by values
        const allUploads = await UploadedFileMetaDetails.find({}).select('uploaded_by file_type').limit(5);
        console.log(`📋 Available uploaded_by values:`, allUploads.map(u => u.uploaded_by));
      }
    }

    if (uploads.length > 0) {
      console.log(`\n✅ SUCCESS: Found ${uploads.length} uploads!`);
      console.log(`📁 Upload files:`, uploads.map(u => ({
        fileName: u.uploaded_file_name,
        uploadedBy: u.uploaded_by,
        fileType: u.file_type,
        rowsCount: u.rows_count
      })));

      // Test getting actual data
      const fileIds = uploads.map(f => f._id);
      const dataCount = await ROBillingData.countDocuments({ uploaded_file_id: { $in: fileIds } });
      console.log(`📊 Found ${dataCount} data records`);

      if (dataCount > 0) {
        console.log(`\n🎉 DASHBOARD STATS WILL NOW SHOW DATA!`);
      }
    } else {
      console.log(`\n❌ No uploads found - dashboard will be empty`);
    }

    // Test with SM user
    console.log(`\n\n🎯 Testing with SM user: "sm.test@example.com"`);
    const smUploadedBy = 'sm.test@example.com';
    
    // Try exact match first
    const smExactQuery = { ...fileQuery, uploaded_by: smUploadedBy };
    let smUploads = await UploadedFileMetaDetails.find(smExactQuery)
      .sort({ uploaded_at: -1 })
      .limit(10);
    console.log(`📊 Found ${smUploads.length} uploads for exact SM email match`);

    // Try role-based matching for SM
    if (smUploads.length === 0) {
      console.log(`⚠️ No uploads found for SM email "${smUploadedBy}", trying role-based matching...`);
      
      if (smUploadedBy && (smUploadedBy.includes('sm.') || smUploadedBy.includes('service'))) {
        const smQuery = { 
          ...fileQuery,
          uploaded_by: { $regex: /sm\.|service/i }
        };
        smUploads = await UploadedFileMetaDetails.find(smQuery)
          .sort({ uploaded_at: -1 })
          .limit(10);
        console.log(`📊 Found ${smUploads.length} uploads for SM role-based match`);
        
        if (smUploads.length > 0) {
          console.log(`✅ SM ROLE-BASED MATCHING WORKS!`);
          console.log(`📁 Matched uploads:`, smUploads.map(u => u.uploaded_by));
        }
      }
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

testDashboardFix();
