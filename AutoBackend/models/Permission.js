import mongoose from "mongoose";
import { getISTDate } from '../utils/dateUtils.js';

const permissionSchema = new mongoose.Schema(
  {
    permission_key: {
      type: String,
      required: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
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

// Create compound unique index for permission_key + showroom_id
permissionSchema.index({ permission_key: 1, showroom_id: 1 }, { unique: true });

// Index for faster queries (permission_key already has unique index from schema)

const Permission = mongoose.model("Permission", permissionSchema);

export default Permission;
