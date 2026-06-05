import mongoose from "mongoose";

// Disable Mongoose command buffering so errors surface immediately in serverless
mongoose.set("bufferCommands", false);

// Module-level cached connection — avoids reconnecting on every warm Vercel invocation
let cachedConnection = null;

const connectDB = async () => {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  // Reset stale cache if connection dropped
  if (mongoose.connection.readyState === 0) {
    cachedConnection = null;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: "los-pollos",
      // ⚡ Reduced from 30s → 8s so cold-starts fail fast instead of causing 504
      // ⚡ Vercel Hobby plan = 10s max. Keep timeouts well under that.
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 15000,
      connectTimeoutMS: 5000,
    });

    cachedConnection = conn;
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    // Don't call process.exit() in serverless — caller handles the error
    throw err;
  }
};

export default connectDB;
