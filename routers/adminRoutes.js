import express from "express";

import {
  getUserRequests,
  getAllRequests,
  rejectRequest,
  getAllUsers,
  addTokens,
  approveWithDrawRequest,
  changeWithdrawRequeststatus,
} from "../controllers/depositWithdrawController.js";
import { isAdminAuthenticated } from "../middlewares/auth.js";
import { logoutAdmin } from "../controllers/userController.js";
import { approveOrder, deleteUserTradeHistory, fetchOpenTrades, getAllPerpetualTradesHistory, getAllSpotHistories, getAllUsersTradeHistory, liquidateTrade, rejectOrder } from "../controllers/adminController.js";
import { getUserHistory } from "../controllers/history/History.js";

const router = express.Router();

router.post('/logout', isAdminAuthenticated, logoutAdmin);
router.get("/user-requests", getUserRequests);
router.get("/all-requests", getAllRequests);

router.get('/all-users', isAdminAuthenticated, getAllUsers);

router.get("/all-trades/:userId", isAdminAuthenticated, getAllUsersTradeHistory);
router.get("/all-perpetual/:userId", isAdminAuthenticated, getAllPerpetualTradesHistory);
router.get("/all-spot/:userId", isAdminAuthenticated, getAllSpotHistories);
router.post("/delete-histories", isAdminAuthenticated, deleteUserTradeHistory);


router.get("/user-history/:userId", isAdminAuthenticated, getUserHistory);
router.post("/user/add-tokens", isAdminAuthenticated, addTokens);
router.put("/approve-withdraw/:requestId", isAdminAuthenticated, approveWithDrawRequest);
router.put("/change-status/:requestId", isAdminAuthenticated, changeWithdrawRequeststatus);
router.put("/reject/:requestId", isAdminAuthenticated, rejectRequest);
router.put("/approve-order/:orderId", isAdminAuthenticated, approveOrder);
router.put("/reject-order/:orderId", isAdminAuthenticated, rejectOrder);
router.get("/open-trades", isAdminAuthenticated, fetchOpenTrades);
router.post("/liquidate-trade/:tradeId", isAdminAuthenticated, liquidateTrade);

export default router;
 