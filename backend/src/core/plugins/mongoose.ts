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
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  return mongoose;
};

const mongoosePlugin: FastifyPluginAsync = async (fastify) => {
  try {
    await connectMongo();
    fastify.log.info("Connected to MongoDB Atlas database successfully");
  } catch (error) {
    fastify.log.error(error, "Failed to connect to MongoDB Atlas");
    throw error;
  }

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

