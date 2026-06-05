/**
 * api/index.js  ←  VERCEL SERVERLESS ENTRY POINT
 *
 * DB connection starts at module-load so cold-start connection
 * overlaps with Vercel's init time before the first request arrives.
 */

import connectDB from "../config/database.js";
import app from "../app.js";

// Routes that must respond instantly without waiting for DB
const DB_FREE_ROUTES = [
  "/",
  "/api/v1/health",
  "/api/v1/googlelogin",
];

// Start DB connection in background immediately at module load
let dbReady = false;
let dbError = null;

connectDB()
  .then(() => { dbReady = true; })
  .catch((err) => {
    dbError = err.message;
    console.error("❌ DB connect failed on cold start:", err.message);
  });

export default async function (req, res) {
  const url = (req.url || "").split("?")[0];

  // Health & OAuth routes respond instantly — no DB wait
  if (DB_FREE_ROUTES.includes(url)) {
    return app(req, res);
  }

  // If DB not ready yet, wait up to 5 s then fail gracefully
  if (!dbReady) {
    try {
      await Promise.race([
        connectDB().then(() => { dbReady = true; }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("DB timeout")), 5000)),
      ]);
    } catch (err) {
      return res.status(503).json({
        success: false,
        message: "Server is starting up, please try again in a moment.",
      });
    }
  }

  return app(req, res);
}