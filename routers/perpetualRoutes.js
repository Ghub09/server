import express from "express";
import {
  openPerpetualPosition,
  closePerpetualPosition,
  applyFundingRates,
  fetchOpenPerpetualTrades,
  getPerpetualTradesHistory,
} from "../controllers/perpetualController.js";
import { isUserAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

router.post("/open", isUserAuthenticated, openPerpetualPosition);
router.post("/close", isUserAuthenticated, closePerpetualPosition);
router.get("/funding-rates", applyFundingRates);
router.get("/open-positions", isUserAuthenticated, fetchOpenPerpetualTrades);
router.get("/history", isUserAuthenticated, getPerpetualTradesHistory);


export default router;
