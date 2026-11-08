import { HTTP_STATUS } from "../../config/constants.js";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number = HTTP_STATUS.BAD_REQUEST, code: string = "BAD_REQUEST", details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static badRequest(message: string, code = "BAD_REQUEST", details?: unknown) {
    return new AppError(message, HTTP_STATUS.BAD_REQUEST, code, details);
  }

  static unauthorized(message = "Unauthorized access", code = "UNAUTHORIZED") {
    return new AppError(message, HTTP_STATUS.UNAUTHORIZED, code);
  }

  static forbidden(message = "Forbidden resource", code = "FORBIDDEN") {
    return new AppError(message, HTTP_STATUS.FORBIDDEN, code);
  }

  static notFound(message = "Resource not found", code = "NOT_FOUND") {
    return new AppError(message, HTTP_STATUS.NOT_FOUND, code);
  }

  static conflict(message: string, code = "CONFLICT") {
    return new AppError(message, HTTP_STATUS.CONFLICT, code);
  }

  static internal(message = "An unexpected server error occurred", code = "INTERNAL_SERVER_ERROR") {
    return new AppError(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, code);
  }
}

