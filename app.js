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

// Load .env locally; on Vercel env vars come from the dashboard (no file needed)
dotenv.config({ path: "./config/config.env" });

const app = express();

// Trust Vercel/Render proxy headers so rate limiting works correctly
app.set("trust proxy", 1);

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Build the allowed-origins list from env + known dev origins
const buildOrigins = () => {
  const origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:4000",
    // Hardcoded Vercel URLs as fallback in case env var isn't loaded yet
    "https://los-pollos-hermanos-ten.vercel.app",
    "https://los-pollos-hermanos-sobits-projects-f6fb2783.vercel.app",
    "https://los-pollos-hermanos-git-main-sobits-projects-f6fb2783.vercel.app",
  ];

  // Accept comma-separated list in FRONTEND_URL, e.g.
  //   FRONTEND_URL=https://los-pollos-hermanos-front.onrender.com
  if (process.env.FRONTEND_URL) {
    process.env.FRONTEND_URL.split(",")
      .map((u) => u.trim().replace(/\/$/, ""))
      .filter(Boolean)
      .forEach((u) => origins.push(u));
  }

  return [...new Set(origins)]; // deduplicate
};

const allowedOrigins = buildOrigins();

// ── Respond to OPTIONS preflight with the SAME corsOptions (not bare cors())
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  exposedHeaders: ["Set-Cookie"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(mongoSanitize());

// ─── Rate limiting ────────────────────────────────────────────────────────────
// Skip rate limiting on Vercel (stateless + no shared memory store between lambdas).
// For production-grade limiting, use upstash-ratelimit with Redis instead.
const isVercel = !!process.env.VERCEL;

if (!isVercel) {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests, please try again later." },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many auth attempts, please try again later." },
  });

  app.use("/api/v1/", limiter);
  app.use("/api/v1/login", authLimiter);
  app.use("/api/v1/register", authLimiter);
}

// ─── Core parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ─── Health check (useful for Render + monitoring) ────────────────────────────
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Los Pollos Hermanos API is running 🍔",
    env: process.env.NODE_ENV || "development",
  });
});

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({ success: true, message: "Server is healthy 🍔" });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/v1", userRoutes);
app.use("/api/v1", orderRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1", menuRoutes);

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.url}` });
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use(errorMiddleware);

export default app;
