import express from "express";
import {
  getAllUsers,
  getSingleUser,
  updateUserRole,
  toggleUserStatus,
  deleteUser,
  addNewUser,
  updateUserAdmin,
  getUserOrders,
} from "../controllers/admin.js";
import { isAuthenticated, isAdmin } from "../middlewares/auth.js";
import { upload } from "../middlewares/multer.js";

const router = express.Router();

// All admin routes require authentication + admin role
router.use(isAuthenticated, isAdmin);

router.get("/users", getAllUsers);
router.post("/register/addnewuser", addNewUser); // Admin: create new user
router.get("/user/:id", getSingleUser);
router.put("/user/:id", upload.single("photo"), updateUserAdmin); // Admin: update user details/photo/addresses
router.get("/user/:id/orders", getUserOrders); // Admin: get a specific user's orders

// Plural route compatibility
router.delete("/user/:id", deleteUser);
router.delete("/users/:id", deleteUser);
router.put("/user/:id/role", updateUserRole);
router.put("/user/:id/toggle", toggleUserStatus);
router.put("/users/:id/toggle", toggleUserStatus);

export default router;
