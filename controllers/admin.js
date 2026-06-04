import User from "../models/User.js";
import Order from "../models/Order.js";
import { ErrorHandler, catchAsync } from "../utils/ErrorHandler.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

// ─── Get All Users ────────────────────────────────────────
export const getAllUsers = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const query = search
    ? { $or: [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }] }
    : {};

  const [users, totalCount] = await Promise.all([
    User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    User.countDocuments(query),
  ]);

  const usersWithStatus = users.map(user => {
    const userObj = user.toObject();
    userObj.status = user.isActive ? "Active" : "Suspended";
    return userObj;
  });

  res.status(200).json({ success: true, users: usersWithStatus, totalCount });
});

// ─── Get Single User ──────────────────────────────────────
export const getSingleUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).select("-password");
  if (!user) return next(new ErrorHandler("User not found", 404));

  const userObj = user.toObject();
  userObj.status = user.isActive ? "Active" : "Suspended";

  res.status(200).json({ success: true, user: userObj });
});

// ─── Update User Role ─────────────────────────────────────
export const updateUserRole = catchAsync(async (req, res, next) => {
  const { role } = req.body;

  if (!["user", "admin"].includes(role)) {
    return next(new ErrorHandler("Invalid role", 400));
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true, runValidators: true }
  );

  if (!user) return next(new ErrorHandler("User not found", 404));

  res.status(200).json({ success: true, message: "User role updated", user });
});

// ─── Toggle User Active Status ────────────────────────────
export const toggleUserStatus = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  user.isActive = !user.isActive;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: `User ${user.isActive ? "activated" : "suspended"} successfully`,
    status: user.isActive ? "Active" : "Suspended",
    user,
  });
});

// ─── Delete User ──────────────────────────────────────────
export const deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  // Prevent admin from deleting themselves
  if (user._id.toString() === req.user._id.toString()) {
    return next(new ErrorHandler("You cannot delete your own account", 400));
  }

  await user.deleteOne();
  res.status(200).json({ success: true, message: "User deleted successfully" });
});

// ─── Admin: Add New User ──────────────────────────────────
export const addNewUser = catchAsync(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return next(new ErrorHandler("Please provide name, email and password", 400));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ErrorHandler("Email already registered", 400));
  }

  const user = await User.create({
    name,
    email,
    password,
    role: role || "user",
    isActive: true,
  });

  const userObj = user.toObject();
  userObj.status = "Active";

  res.status(201).json({ success: true, message: "User added successfully", user: userObj });
});

// ─── Admin: Update User Profile & Addresses ───────────────
export const updateUserAdmin = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  const { name, role, password } = req.body;

  if (name) user.name = name;
  if (role) {
    if (!["user", "admin"].includes(role)) {
      return next(new ErrorHandler("Invalid role", 400));
    }
    user.role = role;
  }
  if (password) {
    user.password = password; // pre-save hook hashes it
  }

  // Parse and save addresses if provided
  let addresses = req.body.addresses;
  if (addresses) {
    if (typeof addresses === "string") {
      try {
        addresses = JSON.parse(addresses);
      } catch (e) {
        console.error("Failed to parse addresses:", e);
      }
    }
    if (Array.isArray(addresses)) {
      user.addresses = addresses;
    }
  }

  if (req.file) {
    if (user.photo?.public_id) {
      await deleteFromCloudinary(user.photo.public_id);
    }
    const result = await uploadToCloudinary(req.file.buffer, "los-pollos/profiles");
    user.photo = result;
  }

  await user.save();

  const userObj = user.toObject();
  userObj.status = user.isActive ? "Active" : "Suspended";

  res.status(200).json({ success: true, message: "User updated successfully", user: userObj });
});

// ─── Admin: Get User Orders ───────────────────────────────
export const getUserOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find({ user: req.params.id })
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  // Map totalPrice field for UserDetail.jsx frontend compatibility
  const ordersWithPrice = orders.map(order => {
    const orderObj = order.toObject();
    orderObj.totalPrice = order.totalAmount;
    return orderObj;
  });

  res.status(200).json({ success: true, orders: ordersWithPrice });
});
