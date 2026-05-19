// lib/logger/index.ts
// Logger del sistema usando Pino
// Destinos: consola en desarrollo, archivo .jsonl en producción

import pino, { Logger } from "pino";

// ============================================================
// Tipos de dominio
// ============================================================

export type LogLevel = "debug" | "info" | "warn" | "error";

export type EventType =
  | "PAYMENT_INITIATED"
  | "PAYMENT_COMPLETED"
  | "PAYMENT_FAILED"
  | "PAYMENT_REFUNDED"
  | "PAYMENT_CANCELLED"
  | "PROSPECT_CREATED"
  | "PROSPECT_UPDATED"
  | "PROSPECT_CONVERTED"
  | "PROSPECT_REJECTED"
  | "WEBHOOK_RECEIVED"
  | "WEBHOOK_PROCESSED"
  | "WEBHOOK_FAILED"
  | "WEBHOOK_RETRIED"
  | "SYSTEM_ERROR"
  | "AUTH_LOGIN"
  | "AUTH_LOGOUT"
  | "AUTH_FAILED"
  | "ACCESS";

export interface LogContext {
  eventType: EventType;
  userId?: string;
  traceId?: string;
  ipAddress?: string;
  success?: boolean;
  durationMs?: number;
  err?: Error;
  payload?: Record<string, unknown>;
}

// ============================================================
// Instancia de Pino
// ============================================================

const isDev = process.env.NODE_ENV !== "production";

const instance: Logger = pino(
  isDev
    ? // ── Desarrollo: consola con colores y formato legible ──
      {
        level: "debug",
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:HH:MM:ss",
            ignore: "pid,hostname",
            messageFormat: "[{eventType}] {msg}",
          },
        },
      }
    : // ── Producción: archivo .jsonl con rotación diaria ──
      {
        level: "info",
        transport: {
          target: "pino-roll",
          options: {
            file: "./logs/app.jsonl", // ruta relativa a la raíz del proyecto
            frequency: "daily", // un archivo por día: 2026-05-18.jsonl
            size: "20m", // rota también si supera 20 MB
            mkdir: true, // crea la carpeta si no existe
          },
        },
      },
);

// ============================================================
// Clase wrapper con helpers de dominio
// ============================================================

class AppLogger {
  private log: Logger;

  constructor(service: string) {
    // child() añade el campo "service" a todos los logs de este módulo
    this.log = instance.child({ service });
  }

  info(ctx: LogContext, msg = "") {
    this.log.info(ctx, msg || ctx.eventType);
  }

  warn(ctx: LogContext, msg = "") {
    this.log.warn(ctx, msg || ctx.eventType);
  }

  error(ctx: LogContext, msg = "") {
    this.log.error(ctx, msg || ctx.eventType);
  }

  debug(ctx: LogContext, msg = "") {
    this.log.debug(ctx, msg || ctx.eventType);
  }

  /** Igual que info() pero con flag audit:true para poder filtrarlo */
  audit(ctx: LogContext, msg = "") {
    this.log.info({ ...ctx, audit: true }, msg || ctx.eventType);
  }

  /**
   * Ejecuta una operación y registra automáticamente:
   * - si tuvo éxito o falló
   * - cuánto tardó en ms
   */
  async measure<T>(
    ctx: Omit<LogContext, "durationMs" | "success" | "err">,
    operation: () => Promise<T>,
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await operation();
      this.info({ ...ctx, success: true, durationMs: Date.now() - start });
      return result;
    } catch (err) {
      this.error({
        ...ctx,
        success: false,
        durationMs: Date.now() - start,
        err: err instanceof Error ? err : new Error(String(err)),
      });
      throw err;
    }
  }
}

// ============================================================
// Un logger por módulo — cada uno añade su "service" automáticamente
// ============================================================

export const logger = new AppLogger("app");
export const paymentLogger = new AppLogger("payments");
export const prospectLogger = new AppLogger("prospects");
export const webhookLogger = new AppLogger("webhooks");
