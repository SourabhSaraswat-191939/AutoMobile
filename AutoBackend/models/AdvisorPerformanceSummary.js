import mongoose from "mongoose";

// Advisor performance summary for fast advisor-specific queries
const advisorPerformanceSummarySchema = new mongoose.Schema({
  advisorName: { type: String, required: true, index: true },
  city: { type: String, required: true, index: true },
  uploadedBy: { type: String, required: true, index: true },
  
  // Time period
  periodType: { 
    type: String, 
    enum: ["daily", "weekly", "monthly", "yearly", "all_time"],
    required: true 
  },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  
  // Aggregated RO Billing Performance
  roBillingPerformance: {
    totalRevenue: { type: Number, default: 0 },
    totalLabour: { type: Number, default: 0 },
    totalParts: { type: Number, default: 0 },
    roCount: { type: Number, default: 0 },
    avgROValue: { type: Number, default: 0 },
    maxROValue: { type: Number, default: 0 },
    minROValue: { type: Number, default: 0 }
  },
  
  // Aggregated Operations Performance
  operationsPerformance: {
    totalMatchedAmount: { type: Number, default: 0 },
    totalOperationsCount: { type: Number, default: 0 },
    
    // Top 10 operations by amount
    topOperations: [{
      operation: String,
      totalAmount: Number,
      count: Number
    }]
  },
  
  // Rankings
  rankings: {
    revenueRank: Number,
    roCountRank: Number,
    operationsRank: Number
  },
  
  // Metadata
  lastUpdated: { type: Date, default: Date.now }
});

// Compound indexes for fast queries
advisorPerformanceSummarySchema.index({ 
  city: 1, 
  periodType: 1, 
  periodStart: -1,
  'roBillingPerformance.totalRevenue': -1 
});

advisorPerformanceSummarySchema.index({ 
  advisorName: 1, 
  city: 1, 
  periodType: 1, 
  periodStart: -1 
});

advisorPerformanceSummarySchema.index({
  uploadedBy: 1,
  city: 1,
  periodType: 1,
  periodStart: -1
});

const AdvisorPerformanceSummary = mongoose.model(
  "AdvisorPerformanceSummary", 
  advisorPerformanceSummarySchema
);

export default AdvisorPerformanceSummary;
