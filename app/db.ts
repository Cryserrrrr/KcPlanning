import mongoose from "mongoose";

const MONGO_URI =
  process.env.MONGO_URL || "mongodb://localhost:27017/mydatabase";

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
  }
}
