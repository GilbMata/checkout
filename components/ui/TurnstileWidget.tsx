"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
  onExpired?: () => void;
  className?: string;
  action?:
    | "phone-validation"
    | "form-submit"
    | "resend-otp"
    | "create-prospect";
  enabled?: boolean;
}

/**
 * TurnstileWidget - Cloudflare Turnstile integration
 *
 * Using invisible mode for bot protection without user friction.
 * The widget runs challenges automatically and returns a token on success.
 *
 * Docs: https://developers.cloudflare.com/turnstile/
 */
export function TurnstileWidget({
  onVerify,
  onError,
  onExpired,
  className,
  action = "form-submit",
  enabled = true,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Get site key from environment
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // Load Turnstile script - solo una vez
  useEffect(() => {
    if (!enabled || !siteKey) {
      console.warn("[Turnstile] Widget disabled or no site key");
      return;
    }

    // Si ya existe, marcar como listo
    if (window.turnstile) {
      setIsReady(true);
      return;
    }

    // Cargar script
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log("[Turnstile] Script loaded");
      setIsReady(true);
    };

    script.onerror = () => {
      console.error("[Turnstile] Failed to load script");
      onError?.("Failed to load security verification");
    };

    document.head.appendChild(script);
  }, [enabled, siteKey, onError]);

  // Render/cleanup widget
  useEffect(() => {
    if (!isReady || !siteKey || !containerRef.current) return;

    const container = containerRef.current;

    // Cleanup previous widget if exists
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        // Ignore cleanup errors
      }
      widgetIdRef.current = null;
    }

    // Esperar que window.turnstile esté disponible
    if (!window.turnstile) {
      console.warn("[Turnstile] Not ready yet, waiting...");
      return;
    }

    try {
      // Render widget with compact size - better CSP compatibility
      const id = window.turnstile.render(container, {
        sitekey: siteKey,
        action: action,
        theme: "dark",
        size: "normal", // compact for better CSP compatibility
        retry: "auto",
        "retry-interval": 800,
        refreshExpired: "auto",
        // Callback se dispara cuando la verificación es exitosa
        callback: (token: string) => {
          console.log(
            `[Turnstile] Verified (action: ${action}), token: ${token.substring(0, 20)}...`,
          );
          onVerify(token);
        },
        "error-callback": (errorCode: string) => {
          console.error(`[Turnstile] Error (${action}):`, errorCode);
          onError?.(errorCode);
        },
        "expired-callback": () => {
          console.warn(`[Turnstile] Token expired (${action})`);
          onExpired?.();
        },
        "timeout-callback": () => {
          console.warn(`[Turnstile] Timeout (${action})`);
          onError?.("Verification timed out");
        },
      });

      widgetIdRef.current = id;
      console.log(`[Turnstile] Widget rendered (id: ${id}, action: ${action})`);
    } catch (err) {
      console.error("[Turnstile] Render error:", err);
      onError?.("Failed to initialize security verification");
    }

    // Cleanup al desmontar
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore cleanup errors
        }
        widgetIdRef.current = null;
      }
    };
  }, [isReady, siteKey, action, onVerify, onError, onExpired]);

  if (!enabled || !siteKey) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn("turnstile-container", className)}
      data-turnstile-action={action}
    />
  );
}

// Type declarations for window.turnstile
declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          action?: string;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "flexible"; // compact for better compatibility
          callback?: (token: string) => void;
          "error-callback"?: (errorCode: string) => void;
          "expired-callback"?: () => void;
          "timeout-callback"?: (errorCode: string) => void;
          retry?: "auto" | "never";
          "retry-interval"?: number;
          refreshExpired?: "auto" | "never";
        },
      ) => string;
      reset: (containerOrWidgetId: HTMLElement | string) => void;
      remove: (containerOrWidgetId: HTMLElement | string) => void;
    };
  }
}

export default TurnstileWidget;
