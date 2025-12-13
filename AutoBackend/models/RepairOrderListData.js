import mongoose from "mongoose";
import { getISTDate } from "../utils/dateUtils.js";

// Schema for storing Repair Order List Excel data
const repairOrderListDataSchema = new mongoose.Schema({
  uploaded_file_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UploadedFileMetaDetails',
    required: true
  },
  showroom_id: {
    type: String,
    required: true
  },
  
  // Repair Order List specific fields (from user requirements)
  svc_adv: {
    type: String,
    required: true,
    trim: true
  },
  work_type: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  vin: {
    type: String,
    required: true,  // VIN is now the primary unique identifier
    trim: true
  },
  reg_no: {
    type: String,
    required: false,  // reg_no is optional, can be null
    trim: true
  },
  ro_status: {
    type: String,
    required: true,
    trim: true
  },
  ro_date: {
    type: String,
    required: true,
    trim: true
  },
  ro_no: {
    type: String,
    required: true,
    trim: true
  },
  vin: {
    type: String,
    required: true,
    trim: true
  },
  
  // Additional fields that might be in the Excel
  customer_name: String,
  vehicle_make: String,
  technician_name: String,
  job_card_number: String,
  mileage: String,
  estimated_amount: {
    type: Number,
    default: 0
  },
  actual_amount: {
    type: Number,
    default: 0
  },
  promise_date: String,
  delivery_date: String,
  
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

// Compound unique index: VIN must be unique within each showroom
repairOrderListDataSchema.index({ vin: 1, showroom_id: 1 }, { unique: true });

// Additional indexes for efficient querying
repairOrderListDataSchema.index({ uploaded_file_id: 1 });
repairOrderListDataSchema.index({ showroom_id: 1, ro_date: -1 });
repairOrderListDataSchema.index({ svc_adv: 1, showroom_id: 1 });
repairOrderListDataSchema.index({ work_type: 1, showroom_id: 1 });
repairOrderListDataSchema.index({ ro_status: 1, showroom_id: 1 });
repairOrderListDataSchema.index({ ro_no: 1, showroom_id: 1 }); // Keep ro_no index for queries
repairOrderListDataSchema.index({ reg_no: 1, showroom_id: 1 }); // Keep reg_no index for queries
repairOrderListDataSchema.index({ uploaded_by: 1, showroom_id: 1 });
repairOrderListDataSchema.index({ created_at: -1 });

// Update the updated_at field before saving (in IST)
repairOrderListDataSchema.pre('save', function(next) {
  this.updated_at = getISTDate();
  next();
});

const RepairOrderListData = mongoose.model("RepairOrderListData", repairOrderListDataSchema);

export default RepairOrderListData;
