import mongoose from "mongoose";

// Pre-aggregated statistics model for fast dashboard queries
const dashboardStatsSchema = new mongoose.Schema({
  // Composite key fields
  uploadedBy: { type: String, required: true, index: true },
  city: { type: String, required: true, index: true },
  uploadType: { 
    type: String, 
    enum: ["ro_billing", "operations", "warranty", "service_booking"],
    required: true,
    index: true
  },
  
  // Time-based partitioning
  periodType: { 
    type: String, 
    enum: ["daily", "weekly", "monthly", "yearly"],
    required: true,
    index: true
  },
  periodStart: { type: Date, required: true, index: true },
  periodEnd: { type: Date, required: true },
  
  // Pre-aggregated metrics for RO Billing
  roBillingStats: {
    totalRevenue: { type: Number, default: 0 },
    totalLabour: { type: Number, default: 0 },
    totalParts: { type: Number, default: 0 },
    totalLabourTax: { type: Number, default: 0 },
    totalPartTax: { type: Number, default: 0 },
    roCount: { type: Number, default: 0 },
    avgROValue: { type: Number, default: 0 },
    
    // Advisor-wise breakdown
    advisorPerformance: [{
      advisor: String,
      totalAmount: Number,
      labourAmount: Number,
      partAmount: Number,
      roCount: Number,
      avgROValue: Number
    }],
    
    // Work type breakdown
    workTypeBreakdown: [{
      workType: String,
      count: Number,
      totalAmount: Number,
      percentage: Number
    }],
    
    // Daily trend
    dailyTrend: [{
      date: Date,
      revenue: Number,
      roCount: Number
    }]
  },
  
  // Pre-aggregated metrics for Operations
  operationsStats: {
    totalOperations: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    uniqueOperationTypes: { type: Number, default: 0 },
    
    // Top operations
    topOperations: [{
      operation: String,
      count: Number,
      totalAmount: Number,
      avgAmount: Number
    }]
  },
  
  // Pre-aggregated metrics for Warranty
  warrantyStats: {
    totalClaims: { type: Number, default: 0 },
    totalLabour: { type: Number, default: 0 },
    totalParts: { type: Number, default: 0 },
    totalClaimValue: { type: Number, default: 0 },
    
    // Claim type breakdown
    claimTypeBreakdown: [{
      claimType: String,
      count: Number,
      totalValue: Number
    }],
    
    // Status breakdown
    statusBreakdown: [{
      status: String,
      count: Number,
      percentage: Number
    }]
  },
  
  // Pre-aggregated metrics for Service Booking
  serviceBookingStats: {
    totalBookings: { type: Number, default: 0 },
    
    // Advisor-wise bookings
    advisorBookings: [{
      advisor: String,
      count: Number,
      percentage: Number
    }],
    
    // Status breakdown
    statusBreakdown: [{
      status: String,
      count: Number,
      percentage: Number
    }],
    
    // Work type breakdown
    workTypeBreakdown: [{
      workType: String,
      count: Number,
      percentage: Number
    }]
  },
  
  // Metadata
  lastUpdated: { type: Date, default: Date.now },
  recordCount: { type: Number, default: 0 }
});

// Compound indexes for fast lookups
dashboardStatsSchema.index({ 
  uploadedBy: 1, 
  city: 1, 
  uploadType: 1, 
  periodType: 1, 
  periodStart: -1 
});

dashboardStatsSchema.index({ 
  city: 1, 
  uploadType: 1, 
  periodType: 1, 
  periodStart: -1 
});

dashboardStatsSchema.index({ periodStart: -1, periodEnd: -1 });

const DashboardStats = mongoose.model("DashboardStats", dashboardStatsSchema);

export default DashboardStats;
