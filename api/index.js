/**
 * api/index.js  ←  VERCEL SERVERLESS ENTRY POINT
 *
 * KEY TRICK: Start DB connection immediately at module-load time.
 * Vercel initialises the module before the first request arrives,
 * so the connection is (often) ready by the time the request hits.
 * This is the standard pattern for Mongoose on Vercel / AWS Lambda.
 */

import connectDB from "../config/database.js";
import app from "../app.js";
import serverless from "serverless-http";

const handler = serverless(app);

// ── Start connecting immediately (don't await — let it run in background) ──
// We store the promise so we can await it per-request.
let dbPromise = connectDB().catch((err) => {
  console.error("❌ Initial DB connect failed, will retry on request:", err.message);
  dbPromise = null; // allow retry on next cold start
});

// Routes that don't touch MongoDB — skip DB wait for instant response
const DB_FREE_PREFIXES = ["/api/v1/googlelogin"];

export default async function handler_fn(req, res) {
  const url = req.url || "";

  // Skip DB wait for pure-redirect OAuth routes
  if (DB_FREE_PREFIXES.some((p) => url.startsWith(p))) {
    return handler(req, res);
  }

  // Ensure DB is connected before processing request
  if (dbPromise) {
    try {
      await dbPromise;
    } catch (err) {
      console.error("❌ DB connection failed on request:", err.message);
      // Retry once for this request
      try {
        await connectDB();
      } catch (retryErr) {
        res.status(503).json({
          success: false,
          message: "Database unavailable, please try again in a moment.",
        });
        return;
      }
    }
  }

  return handler(req, res);
}