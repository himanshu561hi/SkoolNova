import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import { ZodError } from "zod";
import { env } from "./config/env.js";
import { AppError } from "./core/errors/app-error.js";
import { HTTP_STATUS } from "./config/constants.js";
import mongoosePlugin from "./core/plugins/mongoose.js";
import authPlugin from "./core/plugins/auth.js";
import { apiRoutes } from "./routes/index.js";
import { seedInitialAdmin } from "./core/utils/seed.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: env.NODE_ENV === "development" ? { transport: { target: "pino-pretty" } } : true,
  });

  // Database Connection Plugin
  app.register(mongoosePlugin);

  // Authentication & Authorization Plugin
  app.register(authPlugin);

  // Global Security Plugins
  app.register(helmet, {
    contentSecurityPolicy: false, // Allows flexible integration in dev/testing
  });

  app.register(cors, {
    origin: [env.CLIENT_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  app.register(cookie);

  app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit for PDFs and documents
    },
  });

  // Automatically seed initial admin when DB is ready
  app.addHook("onReady", async () => {
    try {
      await seedInitialAdmin();
    } catch (err) {
      app.log.error(err, "Failed to seed initial admin");
    }
  });

  // Base Health Endpoint
  app.get("/api/v1/health", async () => {
    return {
      status: "ok",
      service: "SkoolNova ERP Backend",
      database: "mongodb-atlas-connected",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  // Register All API v1 Routes
  app.register(apiRoutes, { prefix: "/api/v1" });

  // Global 404 Not Found Handler
  app.setNotFoundHandler((request, reply) => {
    reply.status(HTTP_STATUS.NOT_FOUND).send({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: `Route ${request.method} ${request.url} not found`,
      },
    });
  });

  // Global Error Handler
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
    }

    if (error instanceof ZodError) {
      return reply.status(HTTP_STATUS.BAD_REQUEST).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: error.flatten().fieldErrors,
        },
      });
    }

    // Handle Mongo Duplicate Key Error (E11000)
    if ((error as any).code === 11000) {
      const field = Object.keys((error as any).keyPattern || {})[0] || 'field';
      return reply.status(HTTP_STATUS.CONFLICT).send({
        success: false,
        error: {
          code: "DUPLICATE_KEY",
          message: `A record with this ${field} already exists in the system`,
        },
      });
    }

    // Default Unhandled Server Error
    app.log.error(error);
    const err = error as { statusCode?: number; message?: string };
    const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    return reply.status(statusCode).send({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: err.message || "Internal server error",
      },
    });
  });

  return app;
}
