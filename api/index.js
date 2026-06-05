/**
 * api/index.js  ←  VERCEL SERVERLESS ENTRY POINT
 *
 * Vercel routes all requests here via vercel.json.
 * We connect to MongoDB once per cold-start (cached across warm invocations).
 */

import dotenv from "dotenv";
// On Vercel, env vars come from the dashboard — dotenv is a no-op but harmless.
// Locally (if you run this file directly) it loads from the file.
dotenv.config({ path: "./config/config.env" });

import connectDB from "../config/database.js";
import app from "../app.js";
import serverless from "serverless-http";

// Connect DB once (cached between warm Lambda invocations)
let isConnected = false;

const handler = serverless(app);

export default async function (req, res) {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
  return handler(req, res);
}