import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";

// Helper to extract token from header (for optional unified use)
// Example: extract token from cookies or Authorization header
export const getTokenFromRequest = (req) => {
  let token = null;

  // Check cookie
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Check Authorization header
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  return token;
};


// Admin Authentication Middleware
export const isAdminAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const token = req.cookies.adminToken;

  console.log("Admin Token (cookie):", token);
  console.log("req",req.cookies);
  if (!token) {
    return next(new ErrorHandler("Admin login required", 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    console.log("Decoded Token:", decoded);

    const user = await User.findById(decoded.id);
    console.log("Fetched User:", user);

    if (!user) {
      return next(new ErrorHandler("User not found", 403));
    }

    if (user.role.toLowerCase() !== "admin") {
      return next(new ErrorHandler(`${user.role} is not authorized as admin`, 403));
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Admin token verification failed:", err);
    return next(new ErrorHandler("Invalid or expired token", 401));
  }
});
export const isUserAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return next(new ErrorHandler("You need to Sign In First", 503));
  }

  try {
    const decodedTokenData = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const user = await User.findById(decodedTokenData.id);
    console.log("Fetched User:", user);
    if (!user) {
      return next(new ErrorHandler("You Need To Register As User First", 403));
    }

    req.user = user;
    if (!user.role === "user") {
      return next(new ErrorHandler(`${req.user.role} Is Not Authorized`, 403));
    }
    next();
  } catch (error) {
    return next(new ErrorHandler("Invalid or expired token", 401));
  }
});
