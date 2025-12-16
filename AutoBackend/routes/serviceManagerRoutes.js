import express from "express";
import multer from "multer";
import {
  uploadServiceManagerFile,
  getServiceManagerUploads,
  getUploadData,
  getDashboardData,
  getGMDashboardData,
  deleteUpload,
  resetDatabase,
} from "../controllers/serviceManagerController.js";
import {
  uploadAdvisorOperations,
  uploadAdvisorOperationsWithCases,
  getAdvisorOperations,
  getAdvisorOperationDetails,
  deleteAdvisorOperations,
  getAdvisorOperationsSummary,
} from "../controllers/advisorOperationsController.js";
import {
  uploadExcel,
} from "../controllers/excelUploadController.js";
import {
  getNewDashboardData,
  getNewAdvisorOperations,
} from "../controllers/newDashboardController.js";
import { validateServiceManager, ensureDataOwnership } from "../middleware/authMiddleware.js";

const router = express.Router();

// Configure multer for file uploads
// Use /tmp directory for Vercel serverless environment
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = process.env.NODE_ENV === 'production' ? '/tmp' : 'uploads/';
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const uploadType = req.body.uploadType || "unknown";
    const city = req.body.city || "unknown";
    cb(null, `${city}_${uploadType}_${timestamp}_${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.mimetype === "application/vnd.ms-excel"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only .xlsx or .xls files are allowed"), false);
  }
};

const upload = multer({ storage, fileFilter });

// Routes with authentication middleware
router.post("/upload", upload.single("file"), validateServiceManager, uploadServiceManagerFile);
router.get("/uploads", ensureDataOwnership, getServiceManagerUploads);
router.get("/upload/:uploadId", ensureDataOwnership, getUploadData);
router.get("/dashboard-data", ensureDataOwnership, getNewDashboardData);
router.get("/gm-dashboard-data", getGMDashboardData); // GM dashboard route (no user-specific auth)
router.delete("/upload/:uploadId", ensureDataOwnership, deleteUpload);
router.delete("/reset-database", ensureDataOwnership, resetDatabase);

// Advisor Operations Routes
router.post("/advisor-operations/upload", upload.single("file"), validateServiceManager, uploadAdvisorOperations);
router.post("/advisor-operations/upload-with-cases", upload.single("file"), validateServiceManager, uploadAdvisorOperationsWithCases);
router.get("/advisor-operations", ensureDataOwnership, getNewAdvisorOperations);
router.get("/advisor-operations/summary", ensureDataOwnership, getAdvisorOperationsSummary);
router.get("/advisor-operations/details", ensureDataOwnership, getAdvisorOperationDetails);
router.delete("/advisor-operations", ensureDataOwnership, deleteAdvisorOperations);

// Repair Order List Routes
router.post("/repair-order-list/upload", upload.single("excelFile"), uploadExcel);

export default router;
