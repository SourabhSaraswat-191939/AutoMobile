import mongoose from "mongoose";

// Schema for Advisor Operations data
const advisorOperationsSchema = new mongoose.Schema({
  advisorName: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  uploadedBy: {
    type: String,
    required: true,
  },
  fileName: String,
  uploadDate: {
    type: Date,
    default: Date.now,
  },
  // Date for which this data is applicable (for back-dated entries)
  dataDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  totalMatchedAmount: {
    type: Number,
    default: 0,
    index: true
  },
  totalOperationsCount: {
    type: Number,
    default: 0
  },
  matchedOperations: [{
    operation: String,
    amount: Number,
    count: { type: Number, default: 1 }
  }],
  rawData: {
    type: mongoose.Schema.Types.Mixed,
    default: [],
  },
  // Processing metadata
  processingMetadata: {
    totalRowsProcessed: Number,
    matchedRowsCount: Number,
    unmatchedRowsCount: Number
  }
});

// Optimized compound indexes for common query patterns
advisorOperationsSchema.index({ advisorName: 1, city: 1, dataDate: -1 });
advisorOperationsSchema.index({ uploadedBy: 1, city: 1, dataDate: -1 });
advisorOperationsSchema.index({ city: 1, dataDate: -1, totalMatchedAmount: -1 });
advisorOperationsSchema.index({ uploadDate: -1 });
advisorOperationsSchema.index({ dataDate: -1 });

const AdvisorOperations = mongoose.model("AdvisorOperations", advisorOperationsSchema);

export default AdvisorOperations;
