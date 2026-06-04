import User from "../models/User.js";
import Order from "../models/Order.js";
import { ErrorHandler, catchAsync } from "../utils/ErrorHandler.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

// ─── Helper: normalise user object for frontend ───────────────────────────────
// Maps DB fields → what the frontend expects
const normaliseUser = (user) => {
  const obj = user.toObject ? user.toObject() : { ...user };

  // status field (frontend reads user.status)
  obj.status = user.isActive ? "Active" : "Suspended";

  // photo: frontend reads user.photo as a URL string
  // DB stores { public_id, url } — expose the url at top level too
  if (obj.photo && typeof obj.photo === "object") {
    obj.photo = obj.photo.url || "/default-user.png";
  }

  // lastActive alias (DB field is lastLogin)
  obj.lastActive = user.lastLogin || null;

  return obj;
};

// ─── Get All Users ────────────────────────────────────────────────────────────
export const getAllUsers = catchAsync(async (req, res) => {
  const { page = 1, limit = 50, search } = req.query;

  const query = search
    ? {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    }
    : {};

  const [users, totalCount] = await Promise.all([
    User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    User.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    users: users.map(normaliseUser),
    totalCount,
  });
});

// ─── Get Single User ──────────────────────────────────────────────────────────
export const getSingleUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).select("-password");
  if (!user) return next(new ErrorHandler("User not found", 404));

  res.status(200).json({ success: true, user: normaliseUser(user) });
});

// ─── Update User Role ─────────────────────────────────────────────────────────
export const updateUserRole = catchAsync(async (req, res, next) => {
  const { role } = req.body;

  const validRoles = ["user", "admin", "moderator"];
  if (!validRoles.includes(role)) {
    return next(new ErrorHandler(`Invalid role. Must be one of: ${validRoles.join(", ")}`, 400));
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true, runValidators: false } // runValidators: false allows moderator if schema is strict
  );

  if (!user) return next(new ErrorHandler("User not found", 404));

  res.status(200).json({ success: true, message: "User role updated", user: normaliseUser(user) });
});

// ─── Toggle User Active Status ────────────────────────────────────────────────
export const toggleUserStatus = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  // Prevent admin from suspending themselves
  if (user._id.toString() === req.user._id.toString()) {
    return next(new ErrorHandler("You cannot suspend your own account", 400));
  }

  user.isActive = !user.isActive;
  await user.save({ validateBeforeSave: false });

  const newStatus = user.isActive ? "Active" : "Suspended";

  res.status(200).json({
    success: true,
    message: `User ${newStatus.toLowerCase()} successfully`,
    status: newStatus,
    user: normaliseUser(user),
  });
});

// ─── Delete User ──────────────────────────────────────────────────────────────
export const deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  if (user._id.toString() === req.user._id.toString()) {
    return next(new ErrorHandler("You cannot delete your own account", 400));
  }

  // Clean up Cloudinary photo if present
  if (user.photo?.public_id) {
    await deleteFromCloudinary(user.photo.public_id).catch(() => { });
  }

  await user.deleteOne();
  res.status(200).json({ success: true, message: "User deleted successfully" });
});

// ─── Admin: Add New User ──────────────────────────────────────────────────────
export const addNewUser = catchAsync(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return next(new ErrorHandler("Please provide name, email and password", 400));
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return next(new ErrorHandler("Email already registered", 400));
  }

  const validRoles = ["user", "admin", "moderator"];
  const assignedRole = validRoles.includes(role) ? role : "user";

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role: assignedRole,
    isActive: true,
    authProvider: "local",
  });

  res.status(201).json({
    success: true,
    message: "User added successfully",
    user: normaliseUser(user),
  });
});

// ─── Admin: Update User (name, role, password, photo, addresses) ──────────────
export const updateUserAdmin = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).select("+password");
  if (!user) return next(new ErrorHandler("User not found", 404));

  const { name, role, password } = req.body;

  if (name && name.trim()) user.name = name.trim();

  if (role) {
    const validRoles = ["user", "admin", "moderator"];
    if (!validRoles.includes(role)) {
      return next(new ErrorHandler(`Invalid role. Must be one of: ${validRoles.join(", ")}`, 400));
    }
    user.role = role;
  }

  if (password && password.trim()) {
    if (password.length < 6) {
      return next(new ErrorHandler("Password must be at least 6 characters", 400));
    }
    user.password = password; // pre-save hook hashes it
  }

  // Addresses
  let addresses = req.body.addresses;
  if (addresses) {
    if (typeof addresses === "string") {
      try { addresses = JSON.parse(addresses); } catch (e) { /* ignore bad JSON */ }
    }
    if (Array.isArray(addresses)) user.addresses = addresses;
  }

  // Photo upload to Cloudinary
  if (req.file) {
    if (user.photo?.public_id) {
      await deleteFromCloudinary(user.photo.public_id).catch(() => { });
    }
    const result = await uploadToCloudinary(req.file.buffer, "los-pollos/profiles");
    user.photo = result;
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: "User updated successfully",
    user: normaliseUser(user),
  });
});

// ─── Admin: Get User Orders ───────────────────────────────────────────────────
export const getUserOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find({ user: req.params.id })
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  // Map totalAmount → totalPrice for frontend compatibility
  const mapped = orders.map((order) => {
    const obj = order.toObject();
    obj.totalPrice = order.totalAmount;
    return obj;
  });

  res.status(200).json({ success: true, orders: mapped });
});
