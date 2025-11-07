import express from "express";
import multer from "multer";
import { uploadExcel } from "../controllers/uploadController.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = process.env.NODE_ENV === 'production' ? '/tmp' : 'uploads/';
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
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

router.post("/upload", upload.single("file"), uploadExcel);

export default router;
