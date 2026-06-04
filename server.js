/**
 * server.js  ←  LOCAL DEVELOPMENT ONLY
 *
 * Vercel uses api/index.js as the entry point.
 * This file is only used when running `npm run dev` or `npm start` locally.
 */

import dotenv from "dotenv";
dotenv.config({ path: "./config/config.env" });

import mongoose from "mongoose";
import app from "./app.js";

const PORT = process.env.PORT || 4000;

const connectAndListen = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: "los-pollos",
      serverSelectionTimeoutMS: 30000,
    });
    console.log("✅ MongoDB connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
};

connectAndListen();
