import express from "express";
import {
  register,
  login,
  googleLogin,
  googleLoginRedirect,
  googleCallback,
  logout,
  getMyProfile,
  updateProfile,
  changePassword,
} from "../controllers/user.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { upload } from "../middlewares/multer.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.get("/login", googleCallback); // Google OAuth redirect callback
router.get("/googlelogin", googleLoginRedirect); // Initiate Google Login redirect
router.post("/auth/google", googleLogin);
router.get("/logout", isAuthenticated, logout);

// Protected routes
router.get("/me", isAuthenticated, getMyProfile);
router.put("/me/update", isAuthenticated, upload.single("photo"), updateProfile);
router.put("/update/profile-photo", isAuthenticated, upload.single("photo"), updateProfile);
router.put("/me/password", isAuthenticated, changePassword);

export default router;
