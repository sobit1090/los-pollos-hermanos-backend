import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { errorMiddleware } from "./middlewares/errorMiddleware.js";

// Route imports
import userRoutes from "./routes/user.js";
import orderRoutes from "./routes/order.js";
import adminRoutes from "./routes/admin.js";
import menuRoutes from "./routes/menu.js";

dotenv.config({ path: "./config/config.env" });

const app = express();
app.set("trust proxy", 1);
// ─── Security Middleware ──────────────────────────────────
app.use(helmet());
app.use(mongoSanitize()); // prevent NoSQL injection

// ─── Rate Limiting ────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/v1/", limiter);

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many auth attempts, please try again later.",
});
app.use("/api/v1/login", authLimiter);
app.use("/api/v1/register", authLimiter);

// ─── Core Middleware ──────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─── Health Check ─────────────────────────────────────────
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({ success: true, message: "Server is healthy 🍔" });
});

// ─── API Routes ───────────────────────────────────────────
app.use("/api/v1", userRoutes);
app.use("/api/v1", orderRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1", menuRoutes);

// ─── Centralized Error Handler ────────────────────────────
app.use(errorMiddleware);

export default app;
