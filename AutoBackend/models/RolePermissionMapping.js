import mongoose from "mongoose";

const rolePermissionMappingSchema = new mongoose.Schema(
  {
    role_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true
    },
    permission_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Permission",
      required: true
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
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
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

// Compound index to ensure unique role-permission combinations
rolePermissionMappingSchema.index({ role_id: 1, permission_id: 1 }, { unique: true });
rolePermissionMappingSchema.index({ role_id: 1 });
rolePermissionMappingSchema.index({ permission_id: 1 });

const RolePermissionMapping = mongoose.model("RolePermissionMapping", rolePermissionMappingSchema);

export default RolePermissionMapping;
