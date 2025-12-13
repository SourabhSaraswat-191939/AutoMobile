import mongoose from 'mongoose';
import DashboardStats from './models/DashboardStats.js';
import AdvisorOperations from './models/AdvisorOperations.js';

// Connect to MongoDB
const MONGO_URI = 'mongodb+srv://akshaybondresitcom:Jyoti%402828@cluster0.zihf2hi.mongodb.net/automobileDashboardTest3?retryWrites=true&w=majority&appName=Cluster0';

async function checkDashboardCollections() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔍 CHECKING DASHBOARD COLLECTIONS...\n');

    // Check DashboardStats collection
    const dashboardStatsCount = await DashboardStats.countDocuments({});
    console.log(`📊 DashboardStats collection: ${dashboardStatsCount} records`);
    
    if (dashboardStatsCount > 0) {
      console.log('📋 Recent DashboardStats records:');
      const recentStats = await DashboardStats.find({}).sort({ lastUpdated: -1 }).limit(3);
      
      recentStats.forEach((stat, index) => {
        console.log(`   ${index + 1}. Upload Type: ${stat.uploadType}`);
        console.log(`      - Uploaded By: ${stat.uploadedBy}`);
        console.log(`      - City: ${stat.city}`);
        console.log(`      - Period: ${stat.periodType} (${stat.periodStart?.toISOString()?.split('T')[0]})`);
        console.log(`      - Record Count: ${stat.recordCount}`);
        console.log(`      - Last Updated: ${stat.lastUpdated}`);
        
        if (stat.roBillingStats) {
          console.log(`      - RO Billing Stats:`);
          console.log(`        * Total Revenue: ₹${stat.roBillingStats.totalRevenue?.toLocaleString('en-IN') || 0}`);
          console.log(`        * Total Labour: ₹${stat.roBillingStats.totalLabour?.toLocaleString('en-IN') || 0}`);
          console.log(`        * Total Parts: ₹${stat.roBillingStats.totalParts?.toLocaleString('en-IN') || 0}`);
          console.log(`        * RO Count: ${stat.roBillingStats.roCount || 0}`);
          console.log(`        * Advisor Performance: ${stat.roBillingStats.advisorPerformance?.length || 0} advisors`);
        }
        
        if (stat.warrantyStats) {
          console.log(`      - Warranty Stats:`);
          console.log(`        * Total Claims: ${stat.warrantyStats.totalClaims || 0}`);
          console.log(`        * Total Claim Value: ₹${stat.warrantyStats.totalClaimValue?.toLocaleString('en-IN') || 0}`);
        }
        
        if (stat.operationsStats) {
          console.log(`      - Operations Stats:`);
          console.log(`        * Total Operations: ${stat.operationsStats.totalOperations || 0}`);
          console.log(`        * Total Amount: ₹${stat.operationsStats.totalAmount?.toLocaleString('en-IN') || 0}`);
        }
        
        if (stat.serviceBookingStats) {
          console.log(`      - Service Booking Stats:`);
          console.log(`        * Total Bookings: ${stat.serviceBookingStats.totalBookings || 0}`);
        }
        console.log('');
      });
    } else {
      console.log('⚠️ No DashboardStats records found');
      console.log('💡 This means dashboard stats are not being saved to the database');
    }

    // Check AdvisorOperations collection
    const advisorOpsCount = await AdvisorOperations.countDocuments({});
    console.log(`📊 AdvisorOperations collection: ${advisorOpsCount} records`);
    
    if (advisorOpsCount > 0) {
      console.log('📋 Recent AdvisorOperations records:');
      const recentOps = await AdvisorOperations.find({}).sort({ created_at: -1 }).limit(3);
      
      recentOps.forEach((op, index) => {
        console.log(`   ${index + 1}. Advisor: ${op.advisor_name}`);
        console.log(`      - Date: ${op.data_date}`);
        console.log(`      - Total Amount: ₹${op.total_amount?.toLocaleString('en-IN') || 0}`);
        console.log(`      - Labour Amount: ₹${op.labour_amount?.toLocaleString('en-IN') || 0}`);
        console.log(`      - Parts Amount: ₹${op.parts_amount?.toLocaleString('en-IN') || 0}`);
        console.log(`      - RO Count: ${op.ro_count || 0}`);
        console.log(`      - Uploaded By: ${op.uploaded_by}`);
        console.log(`      - Created: ${op.created_at}`);
        console.log('');
      });
    } else {
      console.log('⚠️ No AdvisorOperations records found');
    }

    // Check if AdvisorPerformanceSummary model exists
    try {
      const advisorPerfCount = await mongoose.connection.db.collection('advisorperformancesummaries').countDocuments({});
      console.log(`📊 AdvisorPerformanceSummary collection: ${advisorPerfCount} records`);
      
      if (advisorPerfCount > 0) {
        console.log('📋 Recent AdvisorPerformanceSummary records:');
        const recentPerf = await mongoose.connection.db.collection('advisorperformancesummaries').find({}).sort({ created_at: -1 }).limit(3).toArray();
        
        recentPerf.forEach((perf, index) => {
          console.log(`   ${index + 1}. Advisor: ${perf.advisor_name}`);
          console.log(`      - Period: ${perf.period_start} to ${perf.period_end}`);
          console.log(`      - Total Revenue: ₹${perf.total_revenue?.toLocaleString('en-IN') || 0}`);
          console.log(`      - Total ROs: ${perf.total_ros || 0}`);
          console.log(`      - Avg RO Value: ₹${perf.avg_ro_value?.toLocaleString('en-IN') || 0}`);
          console.log(`      - Performance Score: ${perf.performance_score || 0}`);
          console.log('');
        });
      }
    } catch (error) {
      console.log('⚠️ AdvisorPerformanceSummary collection not found or error accessing it');
    }

    console.log('\n🔍 COLLECTION PURPOSES:\n');
    
    console.log('📊 **DashboardStats**:');
    console.log('   - Stores pre-aggregated dashboard statistics');
    console.log('   - Contains totals for revenue, labour, parts amounts');
    console.log('   - Includes advisor performance breakdowns');
    console.log('   - Work type analysis and percentages');
    console.log('   - Used for fast dashboard loading');
    console.log('');
    
    console.log('👨‍💼 **AdvisorOperations**:');
    console.log('   - Stores individual advisor performance data');
    console.log('   - Daily/periodic advisor statistics');
    console.log('   - Links advisors to their RO performance');
    console.log('   - Used for advisor comparison and ranking');
    console.log('');
    
    console.log('🏆 **AdvisorPerformanceSummary**:');
    console.log('   - Aggregated advisor performance over time periods');
    console.log('   - Monthly/quarterly/yearly summaries');
    console.log('   - Performance scoring and ranking');
    console.log('   - Historical trend analysis');
    console.log('');

    // Check why DashboardStats might be empty
    if (dashboardStatsCount === 0) {
      console.log('\n🔧 TROUBLESHOOTING DASHBOARDSTATS:\n');
      console.log('❌ DashboardStats is empty. Possible reasons:');
      console.log('   1. Dashboard API not being called yet');
      console.log('   2. Dashboard stats service not working');
      console.log('   3. Database connection issues');
      console.log('   4. Error in stats saving logic');
      console.log('');
      console.log('💡 To fix this:');
      console.log('   1. Open SM dashboard and select a data type (RO Billing)');
      console.log('   2. Check server logs for stats saving messages');
      console.log('   3. Verify dashboard API is being called');
      console.log('   4. Check for any errors in the console');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

checkDashboardCollections();
