import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import uploadRoutes from "./routes/uploadRoutes.js";
import excelUploadRoutes from "./routes/excelUploadRoutes.js";
import serviceManagerRoutes from "./routes/serviceManagerRoutes.js";
import rbacRoutes from "./routes/rbacRoutes.js";
import bookingListRoutes from "./routes/bookingListRoutes.js";

dotenv.config();
const app = express();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directories if they don't exist
const uploadsDir = path.join(__dirname, "uploads");
const excelUploadsDir = path.join(__dirname, "uploads", "excel");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("📁 Created uploads directory");
}

if (!fs.existsSync(excelUploadsDir)) {
  fs.mkdirSync(excelUploadsDir, { recursive: true });
  console.log("📁 Created Excel uploads directory");
}

// Configure CORS with explicit options
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all origins in development, or specific origins in production
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // In production, you can whitelist specific origins if needed
    // For now, allow all origins
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// CORS middleware already handles preflight OPTIONS requests automatically
// No need for explicit app.options() - the cors() middleware handles it

app.use(express.json());

// Register routes
app.use("/api", uploadRoutes);
app.use("/api/excel", excelUploadRoutes);
app.use("/api/service-manager", serviceManagerRoutes);
app.use("/api/rbac", rbacRoutes);
app.use("/api/booking-list", bookingListRoutes);

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
      // Listen on all interfaces (0.0.0.0) to allow access from network IPs
      app.listen(5000, '0.0.0.0', () => {
        console.log("🚀 Server running on port 5000");
        console.log("📡 Accessible at:");
        console.log("   - http://localhost:5000");
        console.log("   - http://127.0.0.1:5000");
        console.log("   - http://[your-network-ip]:5000");
      });
    }
  })
  .catch(err => {
    console.error("❌ MongoDB connection failed:", err.message);
  });

// Export for Vercel serverless
export default app;
