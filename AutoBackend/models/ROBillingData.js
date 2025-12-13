import mongoose from "mongoose";
import { getISTDate } from "../utils/dateUtils.js";

// Schema for storing RO Billing CSV data
const roBillingDataSchema = new mongoose.Schema({
  uploaded_file_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UploadedFileMetaDetails',
    required: true
  },
  RO_No: {
    type: String,
    required: true
  },
  showroom_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  
  // RO Billing specific fields
  bill_date: String,
  service_advisor: String,
  labour_amt: {
    type: Number,
    default: 0
  },
  part_amt: {
    type: Number,
    default: 0
  },
  work_type: String,
  vehicle_number: String,
  customer_name: String,
  total_amount: {
    type: Number,
    default: 0
  },
  
  // Additional common fields that might be in CSV
  invoice_number: String,
  invoice_date: String,
  technician_name: String,
  job_card_number: String,
  vehicle_model: String,
  vehicle_make: String,
  mileage: String,
  payment_mode: String,
  discount_amount: {
    type: Number,
    default: 0
  },
  tax_amount: {
    type: Number,
    default: 0
  },
  
  // Additional fields from Excel mapping
  round_off_amount: {
    type: Number,
    default: 0
  },
  service_tax: {
    type: Number,
    default: 0
  },
  vat_amount: {
    type: Number,
    default: 0
  },
  labour_tax: {
    type: Number,
    default: 0
  },
  part_tax: {
    type: Number,
    default: 0
  },
  other_amount: {
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

// Compound unique index: RO_No must be unique within each showroom
roBillingDataSchema.index({ RO_No: 1, showroom_id: 1 }, { unique: true });

// Additional indexes for efficient querying
roBillingDataSchema.index({ uploaded_file_id: 1 });
roBillingDataSchema.index({ showroom_id: 1, bill_date: -1 });
roBillingDataSchema.index({ service_advisor: 1, showroom_id: 1 });
roBillingDataSchema.index({ vehicle_number: 1, showroom_id: 1 });
roBillingDataSchema.index({ created_at: -1 });

// Update the updated_at field before saving (in IST)
roBillingDataSchema.pre('save', function(next) {
  this.updated_at = getISTDate();
  next();
});

const ROBillingData = mongoose.model("ROBillingData", roBillingDataSchema);

export default ROBillingData;
