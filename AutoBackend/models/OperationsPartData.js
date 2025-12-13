import mongoose from "mongoose";
import { getISTDate } from "../utils/dateUtils.js";

// Schema for storing Operations/Part Code CSV data
const operationsPartDataSchema = new mongoose.Schema({
  uploaded_file_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UploadedFileMetaDetails',
    required: true
  },
  OP_Part_Code: {
    type: String,
    required: true
  },
  showroom_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  
  // Operations/Part specific fields
  op_part_description: String,
  operation_type: String,
  part_category: String,
  labour_time: {
    type: Number,
    default: 0
  },
  labour_rate: {
    type: Number,
    default: 0
  },
  part_cost: {
    type: Number,
    default: 0
  },
  total_amount: {
    type: Number,
    default: 0
  },
  
  // Additional operation fields
  skill_level_required: String,
  department: String,
  operation_group: String,
  warranty_period: String,
  supplier_code: String,
  supplier_name: String,
  part_number: String,
  manufacturer_code: String,
  
  // Inventory related
  stock_quantity: {
    type: Number,
    default: 0
  },
  minimum_stock: {
    type: Number,
    default: 0
  },
  reorder_level: {
    type: Number,
    default: 0
  },
  unit_of_measure: String,
  
  // Pricing and costing
  cost_price: {
    type: Number,
    default: 0
  },
  selling_price: {
    type: Number,
    default: 0
  },
  markup_percentage: {
    type: Number,
    default: 0
  },
  discount_applicable: {
    type: Boolean,
    default: false
  },
  max_discount_percentage: {
    type: Number,
    default: 0
  },
  
  // Status and validity
  is_active: {
    type: Boolean,
    default: true
  },
  effective_from: String,
  effective_to: String,
  
  // Usage statistics
  usage_count: {
    type: Number,
    default: 0
  },
  last_used_date: String,
  
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

// Compound unique index: OP_Part_Code must be unique within each showroom
operationsPartDataSchema.index({ OP_Part_Code: 1, showroom_id: 1 }, { unique: true });

// Additional indexes for efficient querying
operationsPartDataSchema.index({ uploaded_file_id: 1 });
operationsPartDataSchema.index({ showroom_id: 1, operation_type: 1 });
operationsPartDataSchema.index({ part_category: 1, showroom_id: 1 });
operationsPartDataSchema.index({ department: 1, showroom_id: 1 });
operationsPartDataSchema.index({ supplier_code: 1, showroom_id: 1 });
operationsPartDataSchema.index({ is_active: 1, showroom_id: 1 });
operationsPartDataSchema.index({ created_at: -1 });

// Update the updated_at field before saving (in IST)
operationsPartDataSchema.pre('save', function(next) {
  this.updated_at = getISTDate();
  next();
});

const OperationsPartData = mongoose.model("OperationsPartData", operationsPartDataSchema);

export default OperationsPartData;
