import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema(
  {
    permission_key: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

// Index for faster queries (permission_key already has unique index from schema)

const Permission = mongoose.model("Permission", permissionSchema);

export default Permission;
