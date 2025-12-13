import mongoose from 'mongoose';
import dashboardStatsService from './services/dashboardStatsService.js';

// Connect to MongoDB
const MONGO_URI = 'mongodb+srv://akshaybondresitcom:Jyoti%402828@cluster0.zihf2hi.mongodb.net/automobileDashboardTest3?retryWrites=true&w=majority&appName=Cluster0';

async function testStatsService() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🧪 Testing Dashboard Stats Service...\n');

    // Test data similar to what the API returns
    const testDashboardData = {
      success: true,
      dataType: 'ro_billing',
      count: 301,
      data: [
        {
          RO_No: 'R202508632',
          total_amount: 7237,
          labour_amt: 2000,
          part_amt: 5237,
          service_advisor: 'AKASH RAVAL',
          work_type: 'General Service'
        },
        {
          RO_No: 'R202508633',
          total_amount: 8500,
          labour_amt: 3000,
          part_amt: 5500,
          service_advisor: 'JOHN DOE',
          work_type: 'Repair'
        }
      ],
      summary: {
        totalRecords: 301,
        totalAmount: 2357687,
        labourAmount: 784778.88,
        partsAmount: 1213474.03
      }
    };

    console.log('📊 Test data prepared:', {
      dataType: testDashboardData.dataType,
      count: testDashboardData.count,
      summaryKeys: Object.keys(testDashboardData.summary)
    });

    // Test saving dashboard stats
    console.log('\n💾 Testing saveDashboardStats...');
    
    const result = await dashboardStatsService.saveDashboardStats(
      'sm.pune@shubh.com',
      'Pune',
      'ro_billing',
      testDashboardData
    );

    console.log('✅ Dashboard stats saved successfully!');
    console.log('📋 Result:', {
      id: result._id,
      uploadedBy: result.uploadedBy,
      city: result.city,
      uploadType: result.uploadType,
      recordCount: result.recordCount,
      totalRevenue: result.roBillingStats?.totalRevenue
    });

    // Test retrieving dashboard stats
    console.log('\n📊 Testing getDashboardStats...');
    
    const retrievedStats = await dashboardStatsService.getDashboardStats(
      'sm.pune@shubh.com',
      'Pune',
      'ro_billing'
    );

    if (retrievedStats) {
      console.log('✅ Dashboard stats retrieved successfully!');
      console.log('📋 Retrieved stats:', {
        id: retrievedStats._id,
        totalRevenue: retrievedStats.roBillingStats?.totalRevenue,
        advisorCount: retrievedStats.roBillingStats?.advisorPerformance?.length || 0,
        workTypeCount: retrievedStats.roBillingStats?.workTypeBreakdown?.length || 0
      });
    } else {
      console.log('❌ No dashboard stats found');
    }

  } catch (error) {
    console.error('❌ Test error:', error);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

testStatsService();
