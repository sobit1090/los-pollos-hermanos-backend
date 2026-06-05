import User from "../models/User.js";
import { ErrorHandler, catchAsync } from "../utils/ErrorHandler.js";
import { sendToken } from "../utils/sendToken.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL
);

// ─── Register ─────────────────────────────────────────────
export const register = catchAsync(async (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return next(new ErrorHandler("Please provide name, email and password", 400));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ErrorHandler("Email already registered", 400));
  }

  const user = await User.create({ name, email, password, authProvider: "local" });
  sendToken(user, 201, res, "Registration successful");
});

// ─── Login ────────────────────────────────────────────────
export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorHandler("Please provide email and password", 400));
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return next(new ErrorHandler("Invalid email or password", 401));
  }

  // Block Google-only accounts from password login
  if (user.authProvider === "google" && !user.password) {
    return next(
      new ErrorHandler("This account uses Google Sign In. Please login with Google.", 400)
    );
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(new ErrorHandler("Invalid email or password", 401));
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  sendToken(user, 200, res, "Login successful");
});

// ─── Google OAuth ─────────────────────────────────────────
export const googleLogin = catchAsync(async (req, res, next) => {
  const { idToken } = req.body;

  if (!idToken) {
    return next(new ErrorHandler("Google token is required", 400));
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const { name, email, picture, sub: googleId } = ticket.getPayload();

  let user = await User.findOne({ email });

  if (user) {
    // If user registered with password, don't merge automatically
    if (user.authProvider === "local") {
      return next(
        new ErrorHandler(
          "An account with this email already exists. Please login with your password.",
          400
        )
      );
    }
    // Update Google user info
    user.googleId = googleId;
    user.lastLogin = new Date();
    if (!user.photo?.url || user.photo.url === "/default-user.png") {
      user.photo = { public_id: "", url: picture };
    }
    await user.save({ validateBeforeSave: false });
  } else {
    // Create new Google user
    user = await User.create({
      name,
      email,
      googleId,
      authProvider: "google",
      photo: { public_id: "", url: picture },
    });
  }

  sendToken(user, 200, res, "Google login successful");
});

// ─── Google OAuth Redirection ──────────────────────────────
export const googleLoginRedirect = (req, res) => {
  const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  const options = {
    redirect_uri: process.env.GOOGLE_CALLBACK_URL || "http://localhost:8080/api/v1/login",
    client_id: process.env.GOOGLE_CLIENT_ID,
    access_type: "offline",
    response_type: "code",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
  };

  const queryString = new URLSearchParams(options).toString();
  res.redirect(`${rootUrl}?${queryString}`);
};

// ─── Google OAuth Callback ─────────────────────────────────
export const googleCallback = catchAsync(async (req, res, next) => {
  const { code } = req.query;

  if (!code) {
    return next(new ErrorHandler("Authorization code not found", 400));
  }

  // Exchange code for tokens
  const tokenResponse = await googleClient.getToken({
    code,
    redirectUri: process.env.GOOGLE_CALLBACK_URL || "http://localhost:8080/api/v1/login",
  });

  const idToken = tokenResponse.tokens.id_token;
  if (!idToken) {
    return next(new ErrorHandler("Failed to get Google ID token", 400));
  }

  // Verify the ID token and login/register user
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const { name, email, picture, sub: googleId } = ticket.getPayload();

  let user = await User.findOne({ email });

  if (user) {
    // Check local accounts
    if (user.authProvider === "local") {
      return next(
        new ErrorHandler(
          "An account with this email already exists. Please login with your password.",
          400
        )
      );
    }
    user.googleId = googleId;
    user.lastLogin = new Date();
    if (!user.photo?.url || user.photo.url === "/default-user.png") {
      user.photo = { public_id: "", url: picture };
    }
    await user.save({ validateBeforeSave: false });
  } else {
    user = await User.create({
      name,
      email,
      googleId,
      authProvider: "google",
      photo: { public_id: "", url: picture },
    });
  }

  const token = user.getJWT();
  const cookieOptions = {
    expires: new Date(
      Date.now() + (parseInt(process.env.COOKIE_EXPIRE) || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
  };

  res.cookie("token", token, cookieOptions);
  
  const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
  res.redirect(`${frontendUrl}/profile`);
});

// ─── Logout ───────────────────────────────────────────────
export const logout = catchAsync(async (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
  });
  res.status(200).json({ success: true, message: "Logged out successfully" });
});

// ─── Get My Profile ───────────────────────────────────────
export const getMyProfile = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.status(200).json({ success: true, user });
});

// ─── Update Profile ───────────────────────────────────────
export const updateProfile = catchAsync(async (req, res, next) => {
  const { name } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  if (name) user.name = name;

  // Handle photo upload if file provided
  if (req.file) {
    // Delete old photo from Cloudinary if it exists
    if (user.photo?.public_id) {
      await deleteFromCloudinary(user.photo.public_id);
    }
    const result = await uploadToCloudinary(req.file.buffer, "los-pollos/profiles");
    user.photo = result;
  }

  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    user,
  });
});

// ─── Change Password ──────────────────────────────────────
export const changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");

  if (user.authProvider === "google") {
    return next(new ErrorHandler("Google accounts cannot change password here", 400));
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return next(new ErrorHandler("Current password is incorrect", 400));
  }

  user.password = newPassword;
  await user.save();

  sendToken(user, 200, res, "Password changed successfully");
});
