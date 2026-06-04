import express from "express";
import {
  createOrder,
  getMyOrders,
  getOrderDetails,
  getAllOrders,
  updateOrderStatus,
  getDashboardStats,
  createRazorpayOrder,
  paymentVerification,
} from "../controllers/order.js";
import { isAuthenticated, isAdmin } from "../middlewares/auth.js";

const router = express.Router();

// User routes
router.post("/order/new", isAuthenticated, createOrder);
router.post("/createorder", isAuthenticated, createOrder); // Compatibility endpoint
router.get("/orders/me", isAuthenticated, getMyOrders);
router.get("/myorders", isAuthenticated, getMyOrders); // Compatibility endpoint
router.get("/order/:id", isAuthenticated, getOrderDetails);

// Online Payments (Razorpay)
router.post("/createorderonline", isAuthenticated, createRazorpayOrder);
router.post("/paymentverification", isAuthenticated, paymentVerification);

// Admin routes
router.get("/admin/orders", isAuthenticated, isAdmin, getAllOrders);
router.route("/admin/order/:id")
  .get(isAuthenticated, isAdmin, updateOrderStatus) // Support status-cycling GET
  .put(isAuthenticated, isAdmin, updateOrderStatus); // Support specific status PUT
router.get("/admin/stats", isAuthenticated, isAdmin, getDashboardStats);

export default router;
