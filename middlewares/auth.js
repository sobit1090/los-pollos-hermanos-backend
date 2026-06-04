import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { ErrorHandler } from "../utils/ErrorHandler.js";
import { catchAsync } from "../utils/catchAsync.js";

export const isAuthenticated = catchAsync(async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return next(new ErrorHandler("Please login to access this resource", 401));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    console.error("❌ JWT verification failed:", err.message);
    return next(new ErrorHandler("Invalid or expired token, please login again", 401));
  }

  const user = await User.findById(decoded._id);
  if (!user) {
    return next(new ErrorHandler("User not found", 401));
  }

  if (!user.isActive) {
    return next(new ErrorHandler("Your account has been suspended", 403));
  }

  req.user = user;
  next();
});

export const isAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return next(new ErrorHandler("Access denied. Admins only.", 403));
  }
  next();
};
