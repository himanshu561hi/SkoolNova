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
    logger:
      !process.env.VERCEL && env.NODE_ENV === "development"
        ? { transport: { target: "pino-pretty" } }
        : true,
    rewriteUrl(req) {
      const originalPath = req.headers["x-matched-path"] as string;
      if (originalPath && typeof originalPath === "string" && !originalPath.includes("[")) {
        const queryIdx = req.url?.indexOf("?") ?? -1;
        const search = queryIdx !== -1 ? req.url!.substring(queryIdx) : "";
        return originalPath + search;
      }
      return req.url || "/";
    },
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
    origin: (origin, cb) => {
      // Allow requests with no origin (curl, mobile apps, postman)
      if (!origin) return cb(null, true);

      // Allow configured origin, localhost, or any vercel.app domains
      if (
        origin === env.CLIENT_ORIGIN ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin.endsWith(".vercel.app")
      ) {
        return cb(null, true);
      }
      return cb(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  app.register(cookie);

  app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit for PDFs and documents
    },
  });

  // Automatically seed initial admin in background without blocking server readiness
  app.addHook("onReady", async () => {
    seedInitialAdmin().catch((err) => {
      app.log.warn("Deferred admin seed attempt: " + (err?.message || err));
    });
  });

  // Root & Health Endpoints
  const rootResponse = () => ({
    status: "ok",
    service: "SkoolNova ERP Backend",
    version: "1.0.0",
    database: "ready",
    timestamp: new Date().toISOString(),
  });

  app.get("/", async () => rootResponse());
  app.get("/api", async () => rootResponse());
  app.get("/api/", async () => rootResponse());

  app.get("/api/v1/health", async () => {
    return {
      status: "ok",
      service: "SkoolNova ERP Backend",
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
