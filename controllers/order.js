import Order from "../models/Order.js";
import User from "../models/User.js";
import { ErrorHandler, catchAsync } from "../utils/ErrorHandler.js";
import Razorpay from "razorpay";
import crypto from "crypto";

// ─── Create Order ─────────────────────────────────────────
export const createOrder = catchAsync(async (req, res, next) => {
  const {
    orderItems,
    shippingInfo,
    serviceType,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingCharges,
    totalAmount,
  } = req.body;

  if (!orderItems || orderItems.length === 0) {
    return next(new ErrorHandler("No order items provided", 400));
  }

  const order = await Order.create({
    user: req.user._id,
    orderItems,
    shippingInfo: serviceType === "delivery" ? shippingInfo : {
      name: req.user.name,
      houseNo: "N/A",
      city: "N/A",
      state: "N/A",
      country: "IN",
      pinCode: "000000",
      phone: "N/A",
    },
    serviceType,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingCharges,
    totalAmount,
    isPaid: paymentMethod !== "cod" && paymentMethod !== "pac",
    paidAt: paymentMethod !== "cod" && paymentMethod !== "pac" ? new Date() : undefined,
  });

  res.status(201).json({
    success: true,
    message: "Order placed successfully",
    order,
  });
});

// ─── Get My Orders ────────────────────────────────────────
export const getMyOrders = catchAsync(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, orders });
});

// ─── Get Order Details ────────────────────────────────────
export const getOrderDetails = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate("user", "name email");

  if (!order) return next(new ErrorHandler("Order not found", 404));

  // Users can only see their own orders
  if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    return next(new ErrorHandler("Not authorized to view this order", 403));
  }

  res.status(200).json({ success: true, order });
});

// ─── Admin: Get All Orders ────────────────────────────────
export const getAllOrders = catchAsync(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = status ? { orderStatus: status } : {};

  const [orders, totalCount] = await Promise.all([
    Order.find(query)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    Order.countDocuments(query),
  ]);

  res.status(200).json({ success: true, orders, totalCount });
});

// ─── Admin: Update Order Status ───────────────────────────
export const updateOrderStatus = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) return next(new ErrorHandler("Order not found", 404));

  if (order.orderStatus === "Delivered") {
    return next(new ErrorHandler("Order has already been delivered", 400));
  }

  let nextStatus = req.body.status;
  
  // GET request (from processOrder) cycles the status automatically
  if (!nextStatus) {
    if (order.orderStatus === "Processing") nextStatus = "Confirmed";
    else if (order.orderStatus === "Confirmed") nextStatus = "Preparing";
    else if (order.orderStatus === "Preparing") nextStatus = "Out for Delivery";
    else if (order.orderStatus === "Out for Delivery") nextStatus = "Delivered";
  }

  if (nextStatus) {
    order.orderStatus = nextStatus;
    if (nextStatus === "Delivered") {
      order.deliveredAt = new Date();
    }
  }

  await order.save();

  res.status(200).json({ 
    success: true, 
    message: `Order status updated to ${order.orderStatus}`, 
    order 
  });
});

// ─── Admin: Dashboard Stats ───────────────────────────────
export const getDashboardStats = catchAsync(async (req, res) => {
  const [
    totalOrders,
    totalRevenue,
    processingOrders,
    preparingOrders,
    shippedOrders,
    deliveredOrders,
    cancelledOrders,
    usersCount,
  ] = await Promise.all([
    Order.countDocuments(),
    Order.aggregate([
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    Order.countDocuments({ orderStatus: "Processing" }),
    Order.countDocuments({ orderStatus: "Preparing" }),
    Order.countDocuments({ orderStatus: "Confirmed" }), // Treat confirmed/preparing nicely
    Order.countDocuments({ orderStatus: "Delivered" }),
    Order.countDocuments({ orderStatus: "Cancelled" }),
    User.countDocuments(),
  ]);

  // Monthly revenue (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyRevenue = await Order.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo }, isPaid: true } },
    {
      $group: {
        _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
        revenue: { $sum: "$totalAmount" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  const ordersByStatus = await Order.aggregate([
    { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
  ]);

  res.status(200).json({
    success: true,
    usersCount,
    ordersCount: {
      total: totalOrders,
      processing: processingOrders,
      preparing: preparingOrders + shippedOrders,
      shipped: await Order.countDocuments({ orderStatus: "Out for Delivery" }),
      delivered: deliveredOrders,
      cancelled: cancelledOrders,
    },
    totalIncome: totalRevenue[0]?.total || 0,
    stats: {
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      processingOrders,
      deliveredOrders,
      monthlyRevenue,
      ordersByStatus,
    },
  });
});

// ─── Razorpay: Create Online Order ─────────────────────────
export const createRazorpayOrder = catchAsync(async (req, res, next) => {
  const { amount } = req.body;
  if (!amount) return next(new ErrorHandler("Amount is required", 400));

  const instance = new Razorpay({
    key_id: process.env.RAZORPAY_API_KEY,
    key_secret: process.env.RAZORPAY_API_SECRET,
  });

  const options = {
    amount: Math.round(Number(amount) * 100), // convert to paise
    currency: "INR",
  };

  const razorpayOrder = await instance.orders.create(options);

  res.status(201).json({
    success: true,
    razorpayOrder,
  });
});

// ─── Razorpay: Verify Payment & Place Order ───────────────
export const paymentVerification = catchAsync(async (req, res, next) => {
  const {
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
    orderOptions,
  } = req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_API_SECRET)
    .update(body.toString())
    .digest("hex");

  const isAuthentic = expectedSignature === razorpay_signature;

  if (isAuthentic) {
    const order = await Order.create({
      user: req.user._id,
      orderItems: orderOptions.orderItems,
      shippingInfo: orderOptions.shippingInfo,
      serviceType: orderOptions.serviceType || "delivery",
      paymentMethod: "online",
      paymentInfo: {
        id: razorpay_payment_id,
        status: "succeeded",
      },
      itemsPrice: orderOptions.itemsPrice,
      taxPrice: orderOptions.taxPrice,
      shippingCharges: orderOptions.shippingCharges,
      totalAmount: orderOptions.totalAmount,
      isPaid: true,
      paidAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Order placed successfully after payment verification!",
      order,
    });
  } else {
    return next(new ErrorHandler("Payment Verification Failed", 400));
  }
});
