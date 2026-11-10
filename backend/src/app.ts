import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { HTTP_STATUS } from "./config/constants.js";
import { connectMongo, mongoose } from "./core/database/connection.js";
import { apiRoutes } from "./routes/index.js";
import { errorHandler } from "./core/middleware/error-handler.js";
import { seedInitialAdmin } from "./core/utils/seed.js";

export function createApp(): Express {
  const app = express();

  // Global Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );

  // CORS Configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          origin === env.CLIENT_ORIGIN ||
          origin.includes("localhost") ||
          origin.includes("127.0.0.1") ||
          origin.endsWith(".vercel.app")
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    })
  );

  // Body and Cookie Parsers
  app.use(cookieParser());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Root & Health Endpoints (Immediate liveness probes for Vercel/Monitoring)
  const rootResponse = () => ({
    status: "ok",
    service: "SkoolNova ERP Backend",
    version: "1.0.0",
    database: mongoose.connection.readyState === 1 ? "connected" : "connecting",
    timestamp: new Date().toISOString(),
  });

  app.get("/", (_req: Request, res: Response) => {
    res.json(rootResponse());
  });

  app.get("/api", (_req: Request, res: Response) => {
    res.json(rootResponse());
  });

  app.get("/api/", (_req: Request, res: Response) => {
    res.json(rootResponse());
  });

  app.get("/api/v1/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      service: "SkoolNova ERP Backend",
      database: mongoose.connection.readyState === 1 ? "connected" : "connecting",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Ensure Database Connection for API data endpoints (Serverless cold-start connection)
  app.use(async (_req: Request, _res: Response, next: NextFunction) => {
    try {
      await connectMongo();
      // Asynchronously trigger admin seed in background if not already seeded
      seedInitialAdmin().catch((err) => {
        console.warn("Deferred admin seed attempt:", err?.message || err);
      });
      next();
    } catch (err) {
      next(err);
    }
  });

  // Mount API v1 Routes
  app.use("/api/v1", apiRoutes);

  // 404 Handler
  app.use((req: Request, res: Response) => {
    res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: `Route ${req.method} ${req.originalUrl} not found`,
      },
    });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
