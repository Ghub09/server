import express from "express";
import { fetchOpenOrders, getSpotTradesHistory, placeOrder } from "../controllers/tradeController.js";
import {
  isAdminAuthenticated,
  isUserAuthenticated,
} from "../middlewares/auth.js";
import { fetchPendingOrders } from "../controllers/tradeController.js";
 
const router = express.Router();

router.post("/placeOrder", isUserAuthenticated, placeOrder);
router.get("/pending-orders",isAdminAuthenticated, fetchPendingOrders);
router.get("/history", isUserAuthenticated, getSpotTradesHistory);
router.post("/userhistory",getSpotTradesHistory    );
router.get("/open-orders", isUserAuthenticated, fetchOpenOrders);


export default router;
