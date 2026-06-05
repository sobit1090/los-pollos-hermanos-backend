/**
 * api/index.js  ←  VERCEL SERVERLESS ENTRY POINT
 *
 * - DB connection is cached across warm Lambda invocations.
 * - Routes that don't need DB (OAuth redirects) skip the DB wait.
 * - If DB fails, we return a clean 503 instead of hanging for 300 s.
 */

import connectDB from "../config/database.js";
import app from "../app.js";
import serverless from "serverless-http";

const handler = serverless(app);

// Cached promise — parallel cold-start requests share one connection attempt
let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = connectDB().catch((err) => {
      dbPromise = null; // reset so next request retries
      throw err;
    });
  }
  return dbPromise;
}

// Routes that perform a simple redirect and don't touch the DB.
// Skipping the DB wait for these prevents OAuth from timing out on cold start.
const DB_FREE_ROUTES = ["/api/v1/googlelogin", "/api/v1/login"];

function isDbFreeRoute(url = "") {
  return DB_FREE_ROUTES.some((route) => url === route || url.startsWith(route + "?"));
}

export default async function (req, res) {
  // Skip DB wait for OAuth redirect routes (they just redirect to Google)
  if (isDbFreeRoute(req.url)) {
    return handler(req, res);
  }

  try {
    await getDB();
  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
    res.status(503).json({
      success: false,
      message: "Database unavailable. Please try again in a moment.",
    });
    return;
  }

  return handler(req, res);
}