import fp from "fastify-plugin";
import { FastifyPluginAsync } from "fastify";
import mongoose from "mongoose";
import { env } from "../../config/env.js";

declare module "fastify" {
  interface FastifyInstance {
    mongoose: typeof mongoose;
  }
}

export const connectMongo = async (): Promise<typeof mongoose> => {
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return mongoose;
  }

  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
    });
  } catch (err) {
    console.error("MongoDB Atlas connection attempt failed:", err);
    throw err;
  }

  return mongoose;
};

const mongoosePlugin: FastifyPluginAsync = async (fastify) => {
  // Non-blocking connection attempt for instant serverless startup
  void connectMongo()
    .then(() => fastify.log.info("Connected to MongoDB Atlas database successfully"))
    .catch((error) =>
      fastify.log.warn("Initial MongoDB connection deferred: " + (error?.message || error))
    );

  // Ensure DB connection before processing business data routes
  fastify.addHook("onRequest", async (request) => {
    // Bypass health check endpoints so uptime monitors never fail
    if (request.url === "/" || request.url === "/api/v1/health") {
      return;
    }
    if (mongoose.connection.readyState !== 1) {
      await connectMongo();
    }
  });

  fastify.decorate("mongoose", mongoose);

  fastify.addHook("onClose", async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      fastify.log.info("Disconnected from MongoDB database");
    }
  });
};

export default fp(mongoosePlugin, { name: "mongoose" });
export { mongoose };
