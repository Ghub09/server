import express from "express";
import {
  uploadKycDocuments,
  getPendingKycVerifications,
  verifyKycDocuments,
  getKycStatus,
} from "../controllers/kycController.js";
import {  isAdminAuthenticated, isUserAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

// User routes
router.post("/upload", isUserAuthenticated, uploadKycDocuments);
router.get("/status", isUserAuthenticated, getKycStatus);

// Admin routes
router.get("/pending", isUserAuthenticated, isAdminAuthenticated, getPendingKycVerifications);
router.post("/verify", isUserAuthenticated, isAdminAuthenticated, verifyKycDocuments);

export default router;
