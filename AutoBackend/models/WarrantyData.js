import mongoose from "mongoose";
import { getISTDate } from "../utils/dateUtils.js";

// Schema for storing Warranty CSV data
const warrantyDataSchema = new mongoose.Schema({
  uploaded_file_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UploadedFileMetaDetails',
    required: true
  },
  RO_No: {
    type: String,
    required: false  // Changed to false since we're using claim_number as unique field
  },
  showroom_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  
  // Warranty specific fields
  claim_date: String,
  claim_type: String,
  claim_status: String,
  labour_amount: {
    type: Number,
    default: 0
  },
  part_amount: {
    type: Number,
    default: 0
  },
  claim_number: String,
  vehicle_number: String,
  customer_name: String,
  
  // Additional warranty fields
  warranty_type: String,
  defect_code: String,
  defect_description: String,
  part_number: String,
  part_description: String,
  technician_name: String,
  service_advisor: String,
  approval_status: String,
  approval_date: String,
  rejection_reason: String,
  vehicle_model: String,
  vehicle_make: String,
  vehicle_vin: String,
  mileage: String,
  purchase_date: String,
  warranty_start_date: String,
  warranty_end_date: String,
  
  // Financial fields
  total_claim_amount: {
    type: Number,
    default: 0
  },
  approved_amount: {
    type: Number,
    default: 0
  },
  deductible_amount: {
    type: Number,
    default: 0
  },
  
  // Timestamps in IST
  created_at: {
    type: Date,
    default: getISTDate
  },
  updated_at: {
    type: Date,
    default: getISTDate
  }
});

// Compound unique index: claim_number must be unique within each showroom
warrantyDataSchema.index({ claim_number: 1, showroom_id: 1 }, { unique: true });

// Additional indexes for efficient querying
warrantyDataSchema.index({ uploaded_file_id: 1 });
warrantyDataSchema.index({ showroom_id: 1, claim_date: -1 });
warrantyDataSchema.index({ vehicle_number: 1, showroom_id: 1 });
warrantyDataSchema.index({ claim_status: 1, showroom_id: 1 });
warrantyDataSchema.index({ service_advisor: 1, showroom_id: 1 });
warrantyDataSchema.index({ created_at: -1 });

// Update the updated_at field before saving (in IST)
warrantyDataSchema.pre('save', function(next) {
  this.updated_at = getISTDate();
  next();
});

const WarrantyData = mongoose.model("WarrantyData", warrantyDataSchema);

export default WarrantyData;
