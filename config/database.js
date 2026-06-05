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
      serverSelectionTimeoutMS: 8000,
      // How long a single socket operation can take
      socketTimeoutMS: 20000,
      // How long to wait for a connection from the pool
      connectTimeoutMS: 8000,
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
