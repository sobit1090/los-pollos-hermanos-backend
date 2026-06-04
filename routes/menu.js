import express from "express";
import {
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from "../controllers/menu.js";
import { isAuthenticated, isAdmin } from "../middlewares/auth.js";
import { upload } from "../middlewares/multer.js";

const router = express.Router();

router.get("/menu", getMenuItems);
router.post("/admin/menu", isAuthenticated, isAdmin, upload.single("image"), createMenuItem);
router.put("/admin/menu/:id", isAuthenticated, isAdmin, upload.single("image"), updateMenuItem);
router.delete("/admin/menu/:id", isAuthenticated, isAdmin, deleteMenuItem);

export default router;
