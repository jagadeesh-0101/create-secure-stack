import pino from "pino";
import { env } from "./env.js";

/**
 * Structured logger (pino). Use this everywhere instead of console.log/error.
 * In development, pretty-prints. In production, emits JSON lines.
 * Never log secrets — audit log metadata already enforces this pattern.
 */
export const logger = pino(
  { level: "info" },
  env.isProd
    ? pino.destination(1)
    : pino.transport({ target: "pino-pretty", options: { colorize: true } })
);
