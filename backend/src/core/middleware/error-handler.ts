import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error.js";
import { HTTP_STATUS } from "../../config/constants.js";

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: error.flatten().fieldErrors,
      },
    });
    return;
  }

  // Handle Mongo Duplicate Key Error (E11000)
  if ((error as any).code === 11000) {
    const field = Object.keys((error as any).keyPattern || {})[0] || "field";
    res.status(HTTP_STATUS.CONFLICT).json({
      success: false,
      error: {
        code: "DUPLICATE_KEY",
        message: `A record with this ${field} already exists in the system`,
      },
    });
    return;
  }

  console.error("Unhandled Server Error:", error);
  const statusCode = (error as any).statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  res.status(statusCode).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: error.message || "Internal server error",
    },
  });
};
