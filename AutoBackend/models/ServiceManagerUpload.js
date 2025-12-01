import mongoose from "mongoose";

// Schema for RO Billing data
const roBillingSchema = new mongoose.Schema({
  billDate: String,
  serviceAdvisor: String,
  labourAmt: Number,
  partAmt: Number,
  workType: String,
  roNumber: String,
  vehicleNumber: String,
  customerName: String,
  totalAmount: Number,
});

// Schema for Operations data (Operation Wise Analysis)
const operationsSchema = new mongoose.Schema({
  opPartDescription: String, // OP/Part Desc.
  count: Number,
  amount: Number,
});

// Schema for Advisor Operations data (per advisor upload)
const advisorOperationsSchema = new mongoose.Schema({
  advisorName: String,
  fileName: String,
  uploadDate: {
    type: Date,
    default: Date.now,
  },
  totalMatchedAmount: Number,
  matchedOperations: [{
    operation: String,
    amount: Number,
  }],
});

// Schema for Warranty Claim data
const warrantySchema = new mongoose.Schema({
  claimDate: String,
  claimType: String,
  status: String,
  labour: Number,
  part: Number,
  claimNumber: String,
  vehicleNumber: String,
  customerName: String,
});

// Schema for Service Booking data (Booking List)
const serviceBookingSchema = new mongoose.Schema({
  serviceAdvisor: String,
  btDateTime: String, // B.T Date & Time
  workType: String,
  status: String,
  bookingNumber: String,
  vehicleNumber: String,
  customerName: String,
});

// Main upload schema that stores metadata and references to data
const serviceManagerUploadSchema = new mongoose.Schema({
  uploadedBy: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  uploadType: {
    type: String,
    enum: ["ro_billing", "operations", "warranty", "service_booking"],
    required: true,
  },
  fileName: String,
  uploadDate: {
    type: Date,
    default: Date.now,
  },
  startDate: { type: Date, index: true },
  endDate: { type: Date, index: true },
  totalRows: Number,
  
  // Quick summary stats (computed on upload for fast access)
  quickStats: {
    totalRevenue: Number,
    totalLabour: Number,
    totalParts: Number,
    roCount: Number,
    uniqueAdvisors: Number,
    dateRange: String
  },
  
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: [],
  },
  
  // Aggregation status
  aggregationStatus: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending"
  }
});

// Optimized compound indexes for common query patterns
serviceManagerUploadSchema.index({ uploadedBy: 1, city: 1, uploadType: 1, uploadDate: -1 });
serviceManagerUploadSchema.index({ city: 1, uploadType: 1, startDate: -1, endDate: -1 });
serviceManagerUploadSchema.index({ uploadDate: -1 });
serviceManagerUploadSchema.index({ startDate: -1, endDate: -1 });

const ServiceManagerUpload = mongoose.model("ServiceManagerUpload", serviceManagerUploadSchema);

export default ServiceManagerUpload;
