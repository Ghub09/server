import express from "express";
import { createDepositWithdrawRequest } from "../controllers/depositWithdrawController.js";
import { isUserAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

router.post("/request", isUserAuthenticated, createDepositWithdrawRequest);

export default router;
