import mongoose from "mongoose";
import { env } from "../../config/env.js";

export const connectMongo = async (): Promise<typeof mongoose> => {
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return mongoose;
  }

  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
    });
    console.log("Connected to MongoDB Atlas database successfully");
  } catch (err) {
    console.error("MongoDB Atlas connection attempt failed:", err);
    throw err;
  }

  return mongoose;
};

export { mongoose };
