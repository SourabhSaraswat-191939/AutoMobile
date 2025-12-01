import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const connectDB = async (retries = 5) => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    
    if (retries > 0) {
      console.log(`⏳ Retrying connection... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      return connectDB(retries - 1);
    } else {
      console.error("❌ All connection attempts failed");
      process.exit(1);
    }
  }
};

export default connectDB;
