import DashboardStats from "../models/DashboardStats.js";
import AdvisorPerformanceSummary from "../models/AdvisorPerformanceSummary.js";
import ServiceManagerUpload from "../models/ServiceManagerUpload.js";

/**
 * Aggregate RO Billing data for dashboard statistics
 */
const aggregateRoBillingData = async (upload) => {
  const data = upload.data;
  
  // Calculate aggregated metrics
  let totalRevenue = 0;
  let totalLabour = 0;
  let totalParts = 0;
  let totalLabourTax = 0;
  let totalPartTax = 0;
  const roCount = data.length;
  
  const advisorMap = new Map();
  const workTypeMap = new Map();
  const dailyMap = new Map();
  
  data.forEach(row => {
    const revenue = row.totalAmount || 0;
    const labour = row.labourAmt || 0;
    const parts = row.partAmt || 0;
    const labourTax = row.labourTax || 0;
    const partTax = row.partTax || 0;
    
    totalRevenue += revenue;
    totalLabour += labour;
    totalParts += parts;
    totalLabourTax += labourTax;
    totalPartTax += partTax;
    
    // Advisor aggregation
    const advisor = row.serviceAdvisor || "Unknown";
    if (!advisorMap.has(advisor)) {
      advisorMap.set(advisor, {
        advisor,
        totalAmount: 0,
        labourAmount: 0,
        partAmount: 0,
        roCount: 0
      });
    }
    const advisorStats = advisorMap.get(advisor);
    advisorStats.totalAmount += revenue;
    advisorStats.labourAmount += labour;
    advisorStats.partAmount += parts;
    advisorStats.roCount += 1;
    
    // Work type aggregation
    const workType = row.workType || "Unknown";
    if (!workTypeMap.has(workType)) {
      workTypeMap.set(workType, { workType, count: 0, totalAmount: 0 });
    }
    const workTypeStats = workTypeMap.get(workType);
    workTypeStats.count += 1;
    workTypeStats.totalAmount += revenue;
    
    // Daily trend aggregation
    if (row.billDate) {
      const dateKey = new Date(row.billDate).toISOString().split('T')[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { date: new Date(dateKey), revenue: 0, roCount: 0 });
      }
      const dailyStats = dailyMap.get(dateKey);
      dailyStats.revenue += revenue;
      dailyStats.roCount += 1;
    }
  });
  
  // Convert maps to arrays and calculate percentages
  const advisorPerformance = Array.from(advisorMap.values()).map(adv => ({
    ...adv,
    avgROValue: adv.roCount > 0 ? adv.totalAmount / adv.roCount : 0
  })).sort((a, b) => b.totalAmount - a.totalAmount);
  
  const workTypeBreakdown = Array.from(workTypeMap.values()).map(wt => ({
    ...wt,
    percentage: roCount > 0 ? (wt.count / roCount) * 100 : 0
  }));
  
  const dailyTrend = Array.from(dailyMap.values()).sort((a, b) => a.date - b.date);
  
  return {
    totalRevenue,
    totalLabour,
    totalParts,
    totalLabourTax,
    totalPartTax,
    roCount,
    avgROValue: roCount > 0 ? totalRevenue / roCount : 0,
    advisorPerformance,
    workTypeBreakdown,
    dailyTrend
  };
};

/**
 * Aggregate Operations data
 */
const aggregateOperationsData = async (upload) => {
  const data = upload.data;
  
  let totalAmount = 0;
  const operationMap = new Map();
  
  data.forEach(row => {
    const amount = row.amount || 0;
    totalAmount += amount;
    
    const operation = row.opPartDescription || "Unknown";
    if (!operationMap.has(operation)) {
      operationMap.set(operation, { operation, count: 0, totalAmount: 0 });
    }
    const opStats = operationMap.get(operation);
    opStats.count += (row.count || 1);
    opStats.totalAmount += amount;
  });
  
  const topOperations = Array.from(operationMap.values())
    .map(op => ({
      ...op,
      avgAmount: op.count > 0 ? op.totalAmount / op.count : 0
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 20);
  
  return {
    totalOperations: data.length,
    totalAmount,
    uniqueOperationTypes: operationMap.size,
    topOperations
  };
};

/**
 * Aggregate Warranty data
 */
const aggregateWarrantyData = async (upload) => {
  const data = upload.data;
  
  let totalLabour = 0;
  let totalParts = 0;
  const claimTypeMap = new Map();
  const statusMap = new Map();
  
  data.forEach(row => {
    const labour = row.labour || 0;
    const parts = row.part || 0;
    totalLabour += labour;
    totalParts += parts;
    
    // Claim type aggregation
    const claimType = row.claimType || "Unknown";
    if (!claimTypeMap.has(claimType)) {
      claimTypeMap.set(claimType, { claimType, count: 0, totalValue: 0 });
    }
    const claimStats = claimTypeMap.get(claimType);
    claimStats.count += 1;
    claimStats.totalValue += labour + parts;
    
    // Status aggregation
    const status = row.status || "Unknown";
    if (!statusMap.has(status)) {
      statusMap.set(status, { status, count: 0 });
    }
    statusMap.get(status).count += 1;
  });
  
  const totalClaims = data.length;
  const claimTypeBreakdown = Array.from(claimTypeMap.values());
  const statusBreakdown = Array.from(statusMap.values()).map(st => ({
    ...st,
    percentage: totalClaims > 0 ? (st.count / totalClaims) * 100 : 0
  }));
  
  return {
    totalClaims,
    totalLabour,
    totalParts,
    totalClaimValue: totalLabour + totalParts,
    claimTypeBreakdown,
    statusBreakdown
  };
};

/**
 * Aggregate Service Booking data
 */
const aggregateServiceBookingData = async (upload) => {
  const data = upload.data;
  
  const advisorMap = new Map();
  const statusMap = new Map();
  const workTypeMap = new Map();
  
  data.forEach(row => {
    // Advisor aggregation
    const advisor = row.serviceAdvisor || "Unknown";
    if (!advisorMap.has(advisor)) {
      advisorMap.set(advisor, { advisor, count: 0 });
    }
    advisorMap.get(advisor).count += 1;
    
    // Status aggregation
    const status = row.status || "Unknown";
    if (!statusMap.has(status)) {
      statusMap.set(status, { status, count: 0 });
    }
    statusMap.get(status).count += 1;
    
    // Work type aggregation
    const workType = row.workType || "Unknown";
    if (!workTypeMap.has(workType)) {
      workTypeMap.set(workType, { workType, count: 0 });
    }
    workTypeMap.get(workType).count += 1;
  });
  
  const totalBookings = data.length;
  
  const advisorBookings = Array.from(advisorMap.values()).map(adv => ({
    ...adv,
    percentage: totalBookings > 0 ? (adv.count / totalBookings) * 100 : 0
  }));
  
  const statusBreakdown = Array.from(statusMap.values()).map(st => ({
    ...st,
    percentage: totalBookings > 0 ? (st.count / totalBookings) * 100 : 0
  }));
  
  const workTypeBreakdown = Array.from(workTypeMap.values()).map(wt => ({
    ...wt,
    percentage: totalBookings > 0 ? (wt.count / totalBookings) * 100 : 0
  }));
  
  return {
    totalBookings,
    advisorBookings,
    statusBreakdown,
    workTypeBreakdown
  };
};

/**
 * Main aggregation function - called after upload
 */
export const aggregateUploadData = async (uploadId) => {
  try {
    const upload = await ServiceManagerUpload.findById(uploadId);
    if (!upload) {
      throw new Error("Upload not found");
    }
    
    // Determine period type based on date range
    const startDate = upload.startDate ? new Date(upload.startDate) : upload.uploadDate;
    const endDate = upload.endDate ? new Date(upload.endDate) : upload.uploadDate;
    
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    let periodType = 'daily';
    if (daysDiff > 30) periodType = 'monthly';
    else if (daysDiff > 7) periodType = 'weekly';
    
    const periodStart = new Date(startDate);
    periodStart.setHours(0, 0, 0, 0);
    const periodEnd = new Date(endDate);
    periodEnd.setHours(23, 59, 59, 999);
    
    // Aggregate based on upload type
    let statsData = {};
    
    if (upload.uploadType === 'ro_billing') {
      const roBillingStats = await aggregateRoBillingData(upload);
      statsData.roBillingStats = roBillingStats;
      
      // Update advisor performance summaries
      for (const advisor of roBillingStats.advisorPerformance) {
        await AdvisorPerformanceSummary.findOneAndUpdate(
          {
            advisorName: advisor.advisor,
            city: upload.city,
            uploadedBy: upload.uploadedBy,
            periodType,
            periodStart,
            periodEnd
          },
          {
            $set: {
              roBillingPerformance: {
                totalRevenue: advisor.totalAmount,
                totalLabour: advisor.labourAmount,
                totalParts: advisor.partAmount,
                roCount: advisor.roCount,
                avgROValue: advisor.avgROValue
              },
              lastUpdated: new Date()
            }
          },
          { upsert: true, new: true }
        );
      }
    } else if (upload.uploadType === 'operations') {
      const operationsStats = await aggregateOperationsData(upload);
      statsData.operationsStats = operationsStats;
    } else if (upload.uploadType === 'warranty') {
      const warrantyStats = await aggregateWarrantyData(upload);
      statsData.warrantyStats = warrantyStats;
    } else if (upload.uploadType === 'service_booking') {
      const serviceBookingStats = await aggregateServiceBookingData(upload);
      statsData.serviceBookingStats = serviceBookingStats;
    }
    
    // Upsert dashboard stats
    await DashboardStats.findOneAndUpdate(
      {
        uploadedBy: upload.uploadedBy,
        city: upload.city,
        uploadType: upload.uploadType,
        periodType,
        periodStart,
        periodEnd
      },
      {
        $set: {
          ...statsData,
          lastUpdated: new Date(),
          recordCount: upload.totalRows
        }
      },
      { upsert: true, new: true }
    );
    
    console.log(`✅ Aggregated data for upload ${uploadId}`);
    return { success: true, periodType, periodStart, periodEnd };
    
  } catch (error) {
    console.error("Aggregation error:", error);
    throw error;
  }
};

/**
 * Calculate rankings for advisors in a city
 */
export const calculateAdvisorRankings = async (city, periodType, periodStart, periodEnd) => {
  try {
    const advisors = await AdvisorPerformanceSummary.find({
      city,
      periodType,
      periodStart,
      periodEnd
    }).sort({ 'roBillingPerformance.totalRevenue': -1 });
    
    // Update revenue rankings
    for (let i = 0; i < advisors.length; i++) {
      advisors[i].rankings = advisors[i].rankings || {};
      advisors[i].rankings.revenueRank = i + 1;
      await advisors[i].save();
    }
    
    console.log(`✅ Updated rankings for ${advisors.length} advisors in ${city}`);
  } catch (error) {
    console.error("Ranking calculation error:", error);
  }
};
