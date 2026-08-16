/**
 * Centralised error class. Throw (or pass to next()) anywhere in routes.
 * The global error handler in app.ts catches it and returns { error, code }.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "AppError";
    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code = "BAD_REQUEST") {
    return new AppError(400, message, code);
  }
  static unauthorized(message = "Authentication required", code = "UNAUTHORIZED") {
    return new AppError(401, message, code);
  }
  static forbidden(message = "Forbidden", code = "FORBIDDEN") {
    return new AppError(403, message, code);
  }
  static notFound(message = "Not found", code = "NOT_FOUND") {
    return new AppError(404, message, code);
  }
  static internal(message = "Internal server error", code = "INTERNAL_ERROR") {
    return new AppError(500, message, code);
  }
}
