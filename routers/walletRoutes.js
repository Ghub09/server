import express from "express";
import { isUserAuthenticated } from "../middlewares/auth.js";
import { transferFunds } from "../controllers/tradeController.js";

const walletRouter = express.Router();

walletRouter.post("/transfer", isUserAuthenticated, transferFunds);

export default walletRouter;
