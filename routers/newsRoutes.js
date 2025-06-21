import express from "express";
import {
  createNews,
  getAllNews,
  getAllNewsAdmin,
  updateNews,
  deleteNews,
} from "../controllers/newsController.js";
import {
  isAdminAuthenticated,
} from "../middlewares/auth.js";

const router = express.Router();

// Public routes
router.get("/", getAllNews);

// Admin routes
router.get("/admin", getAllNewsAdmin);
router.post("/", isAdminAuthenticated, createNews);
router.put("/:id", isAdminAuthenticated, updateNews);
router.delete("/:id", isAdminAuthenticated, deleteNews);

export default router;
