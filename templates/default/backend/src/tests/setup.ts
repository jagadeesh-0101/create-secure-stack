/**
 * setupFiles runs in each worker before any test file imports.
 * Sets env vars so env.ts validation passes when app.ts is imported.
 * DB setup is handled by globalSetup.ts (runs once before workers start).
 */

// Must be set before any module that imports env.ts is loaded.
process.env["DATABASE_URL"] = "file:./test.db";
process.env["JWT_SECRET"] =
  "test-only-jwt-secret-must-be-at-least-32-chars-long!!";
process.env["FIELD_ENCRYPTION_KEY"] = "a".repeat(64); // 64 valid hex chars
process.env["FRONTEND_URL"] = "http://localhost:5173";
process.env["NODE_ENV"] = "test";
