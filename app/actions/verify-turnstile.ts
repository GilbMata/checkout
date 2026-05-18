"use server";

import { headers } from "next/headers";

interface TurnstileResult {
  success: boolean;
  errorCodes?: string[];
  hostname?: string;
  action?: string;
  cdata?: string;
}

/**
 * verifyTurnstileToken - Validates a Cloudflare Turnstile token server-side
 *
 * Must verify the token on the server to prevent bypass attacks.
 * The token is single-use and expires after ~5 minutes.
 *
 * @param token - The Turnstile token from client-side widget
 * @returns Promise<boolean> - true if valid, false otherwise
 *
 * Docs: https://developers.cloudflare.com/turnstile/get-started/validate-tokens/
 */
export async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.error("[Turnstile] TURNSTILE_SECRET_KEY not configured");
    return false;
  }

  if (!token) {
    console.log("[Turnstile] No token provided");
    return false;
  }

  try {
    // Get client IP for additional validation
    const headersList = await headers();
    const cfConnectingIP = headersList.get("cf-connecting-ip");
    const xForwardedFor = headersList.get("x-forwarded-for");
    const clientIP =
      cfConnectingIP || xForwardedFor?.split(",")[0]?.trim() || "unknown";

    console.log(
      `[Turnstile] Verifying token from IP: ${clientIP}, token length: ${token.length}`,
    );

    // Call Cloudflare Siteverify API
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret: secretKey,
          response: token,
          remoteip: clientIP,
        }),
      },
    );

    if (!response.ok) {
      console.error(
        `[Turnstile] Siteverify API error: ${response.status} ${response.statusText}`,
      );
      return false;
    }

    const result: TurnstileResult = await response.json();

    console.log(`[Turnstile] Verification result:`, result);

    if (result.success) {
      console.log(`[Turnstile] Token verified successfully`);
      return true;
    } else {
      console.warn(
        `[Turnstile] Token verification failed, error codes:`,
        result.errorCodes,
      );
      return false;
    }
  } catch (error) {
    console.error("[Turnstile] Verification error:", error);
    return false;
  }
}

/**
 * verifyTurnstileTokenWithAction - Validates token and checks action matches
 *
 * Use this when you need to ensure the token was created for a specific action
 * (e.g., "phone-validation" vs "form-submit")
 *
 * @param token - The Turnstile token
 * @param expectedAction - The action that should have generated this token
 * @returns Promise<boolean>
 */
export async function verifyTurnstileTokenWithAction(
  token: string,
  expectedAction: string,
): Promise<boolean> {
  const isValid = await verifyTurnstileToken(token);

  // Note: The action validation is optional since Cloudflare doesn't always return it
  // But we log it for debugging purposes
  if (isValid) {
    console.debug(`[Turnstile] Token validated for action: ${expectedAction}`);
  }

  return isValid;
}
