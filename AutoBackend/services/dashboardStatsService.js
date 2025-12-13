import DashboardStats from '../models/DashboardStats.js';
import UploadedFileMetaDetails from '../models/UploadedFileMetaDetails.js';
import ROBillingData from '../models/ROBillingData.js';
import WarrantyData from '../models/WarrantyData.js';
import BookingListData from '../models/BookingListData.js';
import OperationsPartData from '../models/OperationsPartData.js';

/**
 * Dashboard Stats Service
 * Handles saving and retrieving pre-aggregated dashboard statistics
 */
class DashboardStatsService {

  /**
   * Save dashboard stats to database
   */
  async saveDashboardStats(uploadedBy, city, dataType, dashboardData) {
    try {
      console.log(`💾 Saving dashboard stats for ${dataType} - ${uploadedBy}`);
      console.log(`📊 Dashboard data summary:`, {
        count: dashboardData.count,
        summaryKeys: Object.keys(dashboardData.summary || {}),
        dataLength: dashboardData.data?.length || 0
      });

      // Calculate period (daily for now)
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 1);

      // Prepare stats object based on data type
      let statsData = {
        uploadedBy,
        city,
        uploadType: dataType,
        periodType: 'daily',
        periodStart,
        periodEnd,
        lastUpdated: now,
        recordCount: dashboardData.count || 0
      };

      // Add type-specific stats
      switch (dataType) {
        case 'ro_billing':
          statsData.roBillingStats = {
            totalRevenue: dashboardData.summary?.totalAmount || 0,
            totalLabour: dashboardData.summary?.labourAmount || 0,
            totalParts: dashboardData.summary?.partsAmount || 0,
            roCount: dashboardData.count || 0,
            avgROValue: dashboardData.count > 0 ? (dashboardData.summary?.totalAmount || 0) / dashboardData.count : 0,
            
            // Calculate advisor performance
            advisorPerformance: this.calculateAdvisorPerformance(dashboardData.data || []),
            
            // Calculate work type breakdown
            workTypeBreakdown: this.calculateWorkTypeBreakdown(dashboardData.data || [])
          };
          break;

        case 'warranty':
          statsData.warrantyStats = {
            totalClaims: dashboardData.count || 0,
            totalLabour: dashboardData.summary?.totalLabourAmount || 0,
            totalParts: dashboardData.summary?.totalPartAmount || 0,
            totalClaimValue: dashboardData.summary?.totalClaimAmount || 0,
            
            // Calculate claim type breakdown
            claimTypeBreakdown: dashboardData.summary?.claimTypeBreakdown || [],
            
            // Calculate status breakdown
            statusBreakdown: dashboardData.summary?.claimStatusBreakdown || []
          };
          break;

        case 'service_booking':
          statsData.serviceBookingStats = {
            totalBookings: dashboardData.count || 0,
            
            // Calculate advisor bookings
            advisorBookings: dashboardData.summary?.serviceAdvisorBreakdown || [],
            
            // Calculate status breakdown
            statusBreakdown: dashboardData.summary?.statusBreakdown || [],
            
            // Calculate work type breakdown
            workTypeBreakdown: dashboardData.summary?.workTypeBreakdown || []
          };
          break;

        case 'operations':
          statsData.operationsStats = {
            totalOperations: dashboardData.count || 0,
            totalAmount: dashboardData.summary?.totalAmount || 0,
            uniqueOperationTypes: dashboardData.data ? [...new Set(dashboardData.data.map(d => d.OP_Part_Code))].length : 0,
            
            // Calculate top operations
            topOperations: this.calculateTopOperations(dashboardData.data || [])
          };
          break;
      }

      // Upsert the stats (update if exists, create if not)
      const result = await DashboardStats.findOneAndUpdate(
        {
          uploadedBy,
          city,
          uploadType: dataType,
          periodType: 'daily',
          periodStart
        },
        statsData,
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true
        }
      );

      console.log(`✅ Dashboard stats saved successfully for ${dataType}`);
      console.log(`📊 Stats ID: ${result._id}`);
      console.log(`💰 Total Revenue: ₹${(statsData.roBillingStats?.totalRevenue || statsData.warrantyStats?.totalClaimValue || statsData.operationsStats?.totalAmount || 0).toLocaleString('en-IN')}`);

      return result;

    } catch (error) {
      console.error('❌ Error saving dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Get dashboard stats from database
   */
  async getDashboardStats(uploadedBy, city, dataType, periodType = 'daily') {
    try {
      console.log(`📊 Getting dashboard stats for ${dataType} - ${uploadedBy}`);

      const stats = await DashboardStats.findOne({
        uploadedBy,
        city,
        uploadType: dataType,
        periodType
      }).sort({ periodStart: -1 });

      if (stats) {
        console.log(`✅ Found cached dashboard stats for ${dataType}`);
        console.log(`📅 Last updated: ${stats.lastUpdated}`);
        return stats;
      } else {
        console.log(`⚠️ No cached stats found for ${dataType}`);
        return null;
      }

    } catch (error) {
      console.error('❌ Error getting dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Calculate advisor performance from RO Billing data
   */
  calculateAdvisorPerformance(roData) {
    const advisorStats = {};

    roData.forEach(ro => {
      const advisor = ro.service_advisor || 'Unknown';
      if (!advisorStats[advisor]) {
        advisorStats[advisor] = {
          advisor,
          totalAmount: 0,
          labourAmount: 0,
          partAmount: 0,
          roCount: 0,
          avgROValue: 0
        };
      }

      advisorStats[advisor].totalAmount += ro.total_amount || 0;
      advisorStats[advisor].labourAmount += ro.labour_amt || 0;
      advisorStats[advisor].partAmount += ro.part_amt || 0;
      advisorStats[advisor].roCount += 1;
    });

    // Calculate averages
    Object.values(advisorStats).forEach(advisor => {
      advisor.avgROValue = advisor.roCount > 0 ? advisor.totalAmount / advisor.roCount : 0;
    });

    return Object.values(advisorStats).sort((a, b) => b.totalAmount - a.totalAmount);
  }

  /**
   * Calculate work type breakdown from RO Billing data
   */
  calculateWorkTypeBreakdown(roData) {
    const workTypeStats = {};
    const totalAmount = roData.reduce((sum, ro) => sum + (ro.total_amount || 0), 0);

    roData.forEach(ro => {
      const workType = ro.work_type || 'Unknown';
      if (!workTypeStats[workType]) {
        workTypeStats[workType] = {
          workType,
          count: 0,
          totalAmount: 0,
          percentage: 0
        };
      }

      workTypeStats[workType].count += 1;
      workTypeStats[workType].totalAmount += ro.total_amount || 0;
    });

    // Calculate percentages
    Object.values(workTypeStats).forEach(workType => {
      workType.percentage = totalAmount > 0 ? (workType.totalAmount / totalAmount) * 100 : 0;
    });

    return Object.values(workTypeStats).sort((a, b) => b.totalAmount - a.totalAmount);
  }

  /**
   * Calculate top operations from Operations data
   */
  calculateTopOperations(operationsData) {
    const operationStats = {};

    operationsData.forEach(op => {
      const operation = op.OP_Part_Code || 'Unknown';
      if (!operationStats[operation]) {
        operationStats[operation] = {
          operation,
          count: 0,
          totalAmount: 0,
          avgAmount: 0
        };
      }

      operationStats[operation].count += 1;
      operationStats[operation].totalAmount += op.amount || 0;
    });

    // Calculate averages
    Object.values(operationStats).forEach(op => {
      op.avgAmount = op.count > 0 ? op.totalAmount / op.count : 0;
    });

    return Object.values(operationStats)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10); // Top 10 operations
  }

  /**
   * Clear old stats (cleanup function)
   */
  async clearOldStats(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await DashboardStats.deleteMany({
        periodStart: { $lt: cutoffDate }
      });

      console.log(`🗑️ Cleared ${result.deletedCount} old dashboard stats records`);
      return result;

    } catch (error) {
      console.error('❌ Error clearing old stats:', error);
      throw error;
    }
  }
}

export default new DashboardStatsService();
