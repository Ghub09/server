import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { config } from "dotenv";
import { dbConnection } from "./config/dbConnection.js";
import { dirname } from "node:path";
import { join } from "path";
import { fileURLToPath } from "url";
import fileUpload from "express-fileupload";
import userRouter from "./routers/userRoutes.js";
import tradeRouter from "./routers/tradeRoutes.js";
import adminRouter from "./routers/adminRoutes.js";
import depositWithdrawRouter from "./routers/depositWithdrawRoutes.js";
import futuresTradeRouter from "./routers/futuresTradeRoutes.js";
import perpetualTradeRouter from "./routers/perpetualRoutes.js";
import walletRouter from "./routers/walletRoutes.js";
import kycRouter from "./routers/kycRoutes.js";
import newsRouter from "./routers/newsRoutes.js";
import userManagement from "./routers/users/userManagement.js";
 
import { safariCompatibilityMiddleware } from "./middlewares/safariCompatibility.js";
 
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, "/config/config.env");

config({ path: envPath });

// Enhanced CORS configuration for Safari compatibility

app.use(
  cors({
    origin: [process.env.FRONTEND_URL,"http://localhost:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "Cache-Control",
      "Pragma",
      "Expires",
      "apikey",
      "X-Client-Info",
      "accept-profile",
      "Device-Key",
      "Api-Key",
    ],
    exposedHeaders: ["Date", "Content-Length", "ETag", "X-Auth", "Set-Cookie"],
    optionsSuccessStatus: 200, // Use 200 instead of 204 for Safari compatibility
    maxAge: 86400, // 24 hours
  })
);

// Handle OPTIONS requests explicitly for Safari
app.get('*', (req, res) => {
  // console.log('Checking path:', path.join(__dirname, '../client/dist/index.html'));
  res.sendFile(path.join(__dirname, ".././client/dist/index.html"));
});

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({ useTempFiles: true, tempFileDir: "/temp/" }));

// Apply Safari compatibility middleware before routes
app.use(safariCompatibilityMiddleware);
app.use("/api/user", userRouter);
app.use("/api/account", userManagement)
app.use("/api/trade", tradeRouter);
app.use("/api/admin", adminRouter);
app.use("/api/funds", depositWithdrawRouter);
app.use("/api/futures", futuresTradeRouter);
app.use("/api/perpetual", perpetualTradeRouter);
app.use("/api/kyc", kycRouter);
app.use("/api/news", newsRouter);

// Wallet routes
app.use("/api/wallet", walletRouter);

dbConnection();

export default app;
