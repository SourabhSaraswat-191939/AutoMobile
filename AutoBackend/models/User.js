import mongoose from "mongoose";
import { getISTDate } from '../utils/dateUtils.js';

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    org_id: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    }
  },
  {
    timestamps: false
  }
);

userSchema.add({
  created_at: {
    type: Date,
    default: getISTDate
  },
  updated_at: {
    type: Date,
    default: getISTDate
  }
});

userSchema.pre('save', function(next) {
  this.updated_at = getISTDate();
  next();
});

// Index for faster queries (email and username already have unique indexes from schema)
userSchema.index({ org_id: 1 });

const User = mongoose.model("User", userSchema);

export default User;
