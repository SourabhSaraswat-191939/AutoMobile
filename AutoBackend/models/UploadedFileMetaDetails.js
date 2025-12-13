import mongoose from "mongoose";
import { getISTDate } from "../utils/dateUtils.js";

// Schema for storing metadata about uploaded CSV files
const uploadedFileMetaDetailsSchema = new mongoose.Schema({
  db_file_name: {
    type: String,
    required: true,
    unique: true
  },
  uploaded_file_name: {
    type: String,
    required: true
  },
  rows_count: {
    type: Number,
    required: true,
    min: 0
  },
  uploaded_by: {
    type: String,
    required: true
  },
  uploaded_at: {
    type: Date,
    default: getISTDate,
    required: true
  },
  org_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  showroom_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  file_type: {
    type: String,
    enum: ["ro_billing", "warranty", "booking_list", "operations_part", "repair_order_list"],
    required: true
  },
  file_size: {
    type: Number
  },
  processing_status: {
    type: String,
    enum: ["pending", "processing", "completed", "failed"],
    default: "pending"
  },
  error_message: {
    type: String
  },
  file_hash: {
    type: String,
    required: true,
    index: true
  },
  upload_case: {
    type: String,
    enum: ["CASE_1_NEW_FILE", "CASE_2_DUPLICATE_FILE", "CASE_3_MIXED_FILE"],
    default: "CASE_1_NEW_FILE"
  },
  rows_inserted: {
    type: Number,
    default: 0
  },
  rows_updated: {
    type: Number,
    default: 0
  },
  rollback_reason: {
    type: String
  }
});

// Virtual field to get IST time
uploadedFileMetaDetailsSchema.virtual('uploaded_at_ist').get(function() {
  if (this.uploaded_at) {
    // Convert UTC to IST (UTC + 5:30)
    const istTime = new Date(this.uploaded_at.getTime() + (5.5 * 60 * 60 * 1000));
    return istTime.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }
  return null;
});

// Include virtuals when converting to JSON
uploadedFileMetaDetailsSchema.set('toJSON', { virtuals: true });

// Indexes for efficient querying
uploadedFileMetaDetailsSchema.index({ showroom_id: 1, uploaded_at: -1 });
uploadedFileMetaDetailsSchema.index({ uploaded_by: 1, uploaded_at: -1 });
uploadedFileMetaDetailsSchema.index({ file_type: 1, showroom_id: 1 });
uploadedFileMetaDetailsSchema.index({ processing_status: 1 });

const UploadedFileMetaDetails = mongoose.model("UploadedFileMetaDetails", uploadedFileMetaDetailsSchema);

export default UploadedFileMetaDetails;
