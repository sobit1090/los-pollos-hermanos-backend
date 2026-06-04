import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const addressSchema = new mongoose.Schema({
  addressType: { type: String, default: "Home" },
  address1: { type: String, required: true },
  address2: { type: String },
  city: { type: String, required: true },
  state: { type: String },
  pinCode: { type: String, required: true },
  country: { type: String, default: "IN" },
  phoneNumber: { type: String },
  isDefault: { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
      index: true,
    },
    password: {
      type: String,
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    photo: {
      public_id: { type: String, default: "" },
      url: { type: String, default: "/default-user.png" },
    },
    role: {
      type: String,
      // ✅ Added "moderator" — was missing, causing updateUserAdmin to silently fail
      enum: ["user", "admin", "moderator"],
      default: "user",
    },
    addresses: [addressSchema],
    googleId: { type: String, sparse: true, index: true },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtual: lastActive (alias for lastLogin — used by frontend) ─────────────
userSchema.virtual("lastActive").get(function () {
  return this.lastLogin || null;
});

// ─── Hash password before save ────────────────────────────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ─── Methods ──────────────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

userSchema.methods.getJWT = function () {
  let expire = process.env.JWT_EXPIRE || "7d";
  
  // If it's a bare number/numeric string (e.g. "7" or 7), default it to days ("7d")
  if (/^\d+$/.test(expire.toString())) {
    expire = `${expire}d`;
  }

  return jwt.sign({ _id: this._id }, process.env.JWT_SECRET, {
    expiresIn: expire,
  });
};

userSchema.methods.getPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
  return resetToken;
};

const User = mongoose.model("User", userSchema);
export default User;
