import mongoose from "mongoose";

// Disable command buffering to surface connection errors immediately
mongoose.set('bufferCommands', false);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: "los-pollos",
      serverSelectionTimeoutMS: 30000, // increase timeout to 30s
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1); // exit if DB cannot connect
  }
};

export default connectDB;
