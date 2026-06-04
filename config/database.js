import mongoose from "mongoose";

// Disable Mongoose command buffering so errors surface immediately in serverless
mongoose.set("bufferCommands", false);

// Module-level cached connection — avoids reconnecting on every warm Vercel invocation
let cachedConnection = null;

const connectDB = async () => {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: "los-pollos",
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      // These options are no longer needed in Mongoose 6+ but harmless
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });

    cachedConnection = conn;
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    // Don't call process.exit() in serverless — let the caller handle it
    throw err;
  }
};

export default connectDB;
