import mongoose from "mongoose";
import { getISTDate } from '../utils/dateUtils.js';

const userRoleMappingSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    role_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true
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
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: false
  }
);

// Compound index to ensure unique user-role-showroom combinations
userRoleMappingSchema.index({ user_id: 1, role_id: 1, showroom_id: 1 }, { unique: true });
userRoleMappingSchema.index({ user_id: 1 });
userRoleMappingSchema.index({ role_id: 1 });

const UserRoleMapping = mongoose.model("UserRoleMapping", userRoleMappingSchema);

export default UserRoleMapping;
