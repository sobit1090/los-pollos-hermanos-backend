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

const PORT = process.env.PORT || 8080;

let connected = false;

async function connectDB() {
  if (connected) return;

  await mongoose.connect(process.env.MONGO_URI, {
    dbName: "los-pollos",
  });

  connected = true;
  console.log("✅ MongoDB connected");
}

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server running locally on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
};

startServer();