import mongoose from "mongoose";

// Disable Mongoose command buffering so errors surface immediately in serverless
mongoose.set("bufferCommands", false);

// Cache both connection promise and the connection itself
let cachedConnection = null;
let cachedPromise = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!cachedPromise) {
    cachedPromise = mongoose.connect(process.env.MONGO_URI, {
      dbName: "los-pollos",
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 15000,
      connectTimeoutMS: 5000,
    }).then((conn) => {
      cachedConnection = conn;
      console.log(`✅ MongoDB connected: ${conn.connection.host}`);
      return conn;
    }).catch((err) => {
      cachedPromise = null; // Clear cached promise on error so we can retry
      console.error("❌ MongoDB connection error:", err.message);
      throw err;
    });
  }

  return cachedPromise;
};

export default connectDB;
