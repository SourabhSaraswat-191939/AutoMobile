import mongoose from "mongoose";
import { getISTDate } from '../utils/dateUtils.js';

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    desc: {
      type: String,
      trim: true
    },
    showroom_id: {
      type: String,
      required: true,
      trim: true,
      default: "674c5b3b8f8a5c2d4e6f7891" // Default showroom_id
    },
    created_at: {
      type: Date,
      default: getISTDate
    },
    updated_at: {
      type: Date,
      default: getISTDate
    }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

// Create compound unique index for name + showroom_id
roleSchema.index({ name: 1, showroom_id: 1 }, { unique: true });

// Index for faster queries (name already has unique index from schema)

const Role = mongoose.model("Role", roleSchema);

export default Role;
