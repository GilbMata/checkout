// lib/logger/pino-http.ts
// Middleware para loguear automáticamente todas las requests HTTP en Next.js

import { NextRequest, NextResponse } from "next/server";
import { logger } from "./logger";

/**
 * Middleware que registra cada request automáticamente.
 * Úsalo en middleware.ts en la raíz de tu proyecto Next.js.
 *
 * @example
 * // middleware.ts
 * export { loggerMiddleware as middleware } from "@/lib/logger/pino-http";
 */
export async function loggerMiddleware(req: NextRequest) {
  const start = Date.now();
  const traceId =
    req.headers.get("x-trace-id") ?? crypto.randomUUID().slice(0, 8);

  // Continuar con la request
  const res = NextResponse.next();
  res.headers.set("x-trace-id", traceId);

  const durationMs = Date.now() - start;
  const status = res.status;

  // Solo loguear APIs (no assets estáticos)
  if (req.nextUrl.pathname.startsWith("/api/")) {
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";

    if (level === "error") {
      logger.error({
        eventType: "SYSTEM_ERROR",
        traceId,
        durationMs,
        ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
        payload: {
          method: req.method,
          path: req.nextUrl.pathname,
          status,
        },
      });
    } else {
      logger.info({
        eventType: "SYSTEM_ERROR", // usa SYSTEM_ERROR como catch-all para HTTP
        traceId,
        durationMs,
        payload: {
          method: req.method,
          path: req.nextUrl.pathname,
          status,
        },
      });
    }
  }

  return res;
}
