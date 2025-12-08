import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import uploadRoutes from "./routes/uploadRoutes.js";
import serviceManagerRoutes from "./routes/serviceManagerRoutes.js";
import rbacRoutes from "./routes/rbacRoutes.js";

dotenv.config();
const app = express();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("📁 Created uploads directory");
}

app.use(cors());
app.use(express.json());

// Register routes
app.use("/api", uploadRoutes);
app.use("/api/service-manager", serviceManagerRoutes);
app.use("/api/rbac", rbacRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "Auto Backend API is running",
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});

// 404 handler - must return JSON
app.use((req, res, next) => {
  res.status(404).json({ 
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
    error: "Not Found"
  });
});

// Error handler - must return JSON
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === 'production' ? 'Server Error' : err.stack
  });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected successfully");

    // Start server only after DB connects (for local development)
    if (process.env.NODE_ENV !== 'production') {
      app.listen(5000, () => console.log("🚀 Server running on port 5000"));
    }
  })
  .catch(err => {
    console.error("❌ MongoDB connection failed:", err.message);
  });

// Export for Vercel serverless
export default app;
