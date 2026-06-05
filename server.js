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

let connected = false;

async function connectDB() {
  if (connected) return;

  await mongoose.connect(process.env.MONGO_URI, {
    dbName: "los-pollos",
  });

  connected = true;
  console.log("✅ MongoDB connected");
}

export default async function handler(req, res) {
  await connectDB();
  return app(req, res);
}