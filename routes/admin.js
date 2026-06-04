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

// ─── User list + create ───────────────────────────────────────────────────────
router.get("/users", getAllUsers);
router.post("/register/addnewuser", addNewUser);

// ─── Single user — support BOTH /user/:id AND /users/:id ─────────────────────
// The frontend calls /admin/users/:id (plural) for detail + orders
// The backend originally only had /admin/user/:id (singular)
// Both are supported here so nothing breaks.

router.get("/users/:id", getSingleUser);
router.get("/user/:id", getSingleUser);

router.put("/users/:id", upload.single("photo"), updateUserAdmin);
router.put("/user/:id", upload.single("photo"), updateUserAdmin);

router.get("/users/:id/orders", getUserOrders);
router.get("/user/:id/orders", getUserOrders);

router.delete("/users/:id", deleteUser);
router.delete("/user/:id", deleteUser);

router.put("/users/:id/role", updateUserRole);
router.put("/user/:id/role", updateUserRole);

router.put("/users/:id/toggle", toggleUserStatus);
router.put("/user/:id/toggle", toggleUserStatus);

export default router;
