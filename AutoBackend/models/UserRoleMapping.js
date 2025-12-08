import mongoose from "mongoose";

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

// Compound index to ensure unique user-role combinations
userRoleMappingSchema.index({ user_id: 1, role_id: 1 }, { unique: true });
userRoleMappingSchema.index({ user_id: 1 });
userRoleMappingSchema.index({ role_id: 1 });

const UserRoleMapping = mongoose.model("UserRoleMapping", userRoleMappingSchema);

export default UserRoleMapping;
