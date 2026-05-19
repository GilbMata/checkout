/**
 * WhatsApp/Platica Sender Module
 *
 * Provides typed client for sending WhatsApp messages via Platica API.
 * Includes retry logic, timeout, and result type for robust error handling.
 */

import { logger } from "./logger/logger";

// ============================================
// Types
// ============================================

/**
 * Simple Result type for explicit error handling
 */
type Result<T, E = string> = { ok: true; data: T } | { ok: false; error: E };

/**
 * Configuration for Platica client
 */
interface PlaticaClientConfig {
  channelId: string;
  apiKey: string;
  apiUrl: string;
  apiUrlOTP?: string;
  campaignId?: string;
  timeout?: number;
  retries?: number;
}

/**
 * Default timeout in milliseconds
 */
const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Default number of retry attempts
 */
const DEFAULT_RETRIES = 3;

/**
 * Retry delays in milliseconds (exponential backoff)
 */
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000];

/**
 * Platica API request for OTP messages
 */
interface PlaticaMessageRequestOTP {
  channelId: string;
  conversationId: string;
  template: {
    name: string;
    params: string[];
    buttons?: {
      index: number;
      sub_type: string;
      parameters: { type: string; text: string }[];
    }[];
  };
}

/**
 * Platica API request for regular messages
 */
interface PlaticaMessageRequest {
  channelId: string;
  conversationId: string;
  campaignId?: string;
  template: {
    name: string;
    params: string[];
  };
}

/**
 * Platica API error response
 */
interface PlaticaErrorResponse {
  error?: string;
  message?: string;
  details?: unknown;
}

/**
 * Platica API success response (generic)
 */
interface PlaticaSuccessResponse {
  success?: boolean;
  id?: string;
  messageId?: string;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Clean phone number - remove all non-digit characters
 */
function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Validate required credentials
 */
function validateCredentials(
  channelId: string | undefined,
  apiKey: string | undefined,
  apiUrl: string | undefined,
): Result<{ channelId: string; apiKey: string; apiUrl: string }, string> {
  if (!channelId) {
    return { ok: false, error: "PLATICA_CHANNEL_ID is not configured" };
  }
  if (!apiKey) {
    return { ok: false, error: "PLATICA_API_KEY is not configured" };
  }
  if (!apiUrl) {
    return { ok: false, error: "PLATICA_API_URL is not configured" };
  }
  return { ok: true, data: { channelId, apiKey, apiUrl } };
}

/**
 * Parse error response from Platica API
 */
function parseErrorResponse(response: unknown): string {
  if (response && typeof response === "object") {
    const error = response as PlaticaErrorResponse;
    return error.error || error.message || JSON.stringify(error);
  }
  return String(response);
}

// ============================================
// Core Request Handler with Retry & Timeout
// ============================================

interface RequestOptions {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  timeout: number;
  retries: number;
}

async function executeWithRetry<T>(
  options: RequestOptions,
  parseResponse: (response: unknown) => T,
): Promise<Result<T, string>> {
  const { url, method, headers, body, timeout, retries } = options;
  let lastError: string = "Unknown error";

  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        lastError = parseErrorResponse(errorData);
        console.warn(
          `Platica API error (attempt ${attempt + 1}/${retries}): ${lastError}`,
        );
        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          return { ok: false, error: lastError };
        }
        // Retry on server errors (5xx) or network errors
        if (attempt < retries - 1) {
          const delay =
            RETRY_DELAYS_MS[attempt] ||
            RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        return { ok: false, error: lastError };
      }

      const data = await response.json().catch(() => ({}));
      return { ok: true, data: parseResponse(data) };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          lastError = `Request timeout after ${timeout}ms`;
        } else {
          lastError = error.message;
        }
      } else {
        lastError = String(error);
      }

      console.warn(
        `Platica request error (attempt ${attempt + 1}/${retries}): ${lastError}`,
      );

      // Retry on network errors
      if (attempt < retries - 1) {
        const delay =
          RETRY_DELAYS_MS[attempt] ||
          RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  return { ok: false, error: `Failed after ${retries} attempts: ${lastError}` };
}

// ============================================
// Plática Client Factory
// ============================================

/**
 * Factory function to create a typed Plática client
 *
 * @example
 * ```typescript
 * const client = createPlaticaClient({
 *   channelId: process.env.PLATICA_CHANNEL_ID!,
 *   apiKey: process.env.PLATICA_API_KEY!,
 *   apiUrl: process.env.PLATICA_API_URL!,
 *   apiUrlOTP: process.env.PLATICA_API_URLOTP!,
 *   timeout: 10000,
 *   retries: 3
 * });
 *
 * // Send OTP
 * const otpResult = await client.sendOTP("+1234567890", "123456");
 * if (!otpResult.ok) {
 *   console.error("Failed to send OTP:", otpResult.error);
 *   return;
 * }
 *
 * // Send regular message
 * const msgResult = await client.sendpaymentfailedMessage("+1234567890", "Hello!");
 * ```
 */
export function createPlaticaClient(config: PlaticaClientConfig) {
  const {
    channelId,
    apiKey,
    apiUrl,
    apiUrlOTP,
    campaignId,
    timeout = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
  } = config;

  // const { traceId } = useCheckoutStore();

  /**
   * Send OTP via WhatsApp template
   */
  async function sendOTP(
    phone: string,
    otp: string,
  ): Promise<Result<boolean, string>> {
    // Use apiUrlOTP if available, otherwise fallback to apiUrl
    const otpApiUrl = apiUrlOTP ?? apiUrl;
    // Validate credentials
    const credsResult = validateCredentials(channelId, apiKey, otpApiUrl);
    if (!credsResult.ok) {
      console.error("Platica credentials error:", credsResult.error);
      return { ok: false, error: credsResult.error };
    }

    const cleanPhoneNumber = cleanPhone(phone);
    const requestBody: PlaticaMessageRequestOTP = {
      channelId: credsResult.data.channelId,
      conversationId: cleanPhoneNumber,
      template: {
        name: "verificacion_no_borrar",
        params: [otp],
        buttons: [
          {
            index: 0,
            sub_type: "url",
            parameters: [{ type: "text", text: otp }],
          },
        ],
      },
    };

    const result = await executeWithRetry<boolean>(
      {
        url: otpApiUrl,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${credsResult.data.apiKey}`,
        },
        body: requestBody,
        timeout,
        retries,
      },
      () => {
        logger.info({
          eventType: "ACCESS",
          // traceId,
          payload: {
            msg: `[Platica] OTP sent successfully to ${cleanPhoneNumber.substring(
              0,
              6,
            )}***`,
            OTP: otp,
          },
        });
        return true;
      },
    );

    if (!result.ok) {
      console.error(
        `[Platica] Failed to send OTP to ${cleanPhoneNumber.substring(0, 6)}***:`,
        result.error,
      );
    }

    return result;
  }

  /**
   * Send a regular WhatsApp message
   */
  async function sendpaymentfailedMessage(
    phone: string,
    name: string,
    planName: string,
    magicLink: string,
  ): Promise<Result<boolean, string>> {
    // Validate credentials
    const credsResult = validateCredentials(channelId, apiKey, apiUrl);
    if (!credsResult.ok) {
      console.error("Platica credentials error:", credsResult.error);
      return { ok: false, error: credsResult.error };
    }

    const cleanPhoneNumber = cleanPhone(phone);
    const requestBody: PlaticaMessageRequest = {
      channelId: credsResult.data.channelId,
      conversationId: cleanPhoneNumber,
      ...(campaignId && { campaignId }),
      template: {
        name: "actualizacion_pago_membresia",
        params: [name, planName, magicLink],
      },
    };

    const result = await executeWithRetry<boolean>(
      {
        url: apiUrl,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${credsResult.data.apiKey}`,
        },
        body: requestBody,
        timeout,
        retries,
      },
      () => {
        console.log(
          `[Platica] Message sent successfully to ${cleanPhoneNumber.substring(
            0,
            6,
          )}***`,
        );
        return true;
      },
    );

    if (!result.ok) {
      console.error(
        `[Platica] Failed to send message to ${cleanPhoneNumber.substring(0, 6)}***:`,
        result.error,
      );
    }

    return result;
  }

  /**
   * Send payment success notification via WhatsApp
   */
  async function sendpaymentsuccessMessage(
    phone: string,
    name: string,
    planName: string,
  ): Promise<Result<boolean, string>> {
    // Validate credentials
    const credsResult = validateCredentials(channelId, apiKey, apiUrl);
    if (!credsResult.ok) {
      console.error("Platica credentials error:", credsResult.error);
      return { ok: false, error: credsResult.error };
    }

    const cleanPhoneNumber = cleanPhone(phone);
    const requestBody: PlaticaMessageRequest = {
      channelId: credsResult.data.channelId,
      conversationId: cleanPhoneNumber,
      ...(campaignId && { campaignId }),
      template: {
        name: "pago_aprobado_membresia", // Template para pago exitoso
        params: [name, planName],
      },
    };

    const result = await executeWithRetry<boolean>(
      {
        url: apiUrl,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${credsResult.data.apiKey}`,
        },
        body: requestBody,
        timeout,
        retries,
      },
      () => {
        console.log(
          `[Platica] Payment success message sent to ${cleanPhoneNumber.substring(
            0,
            6,
          )}***`,
        );
        return true;
      },
    );

    if (!result.ok) {
      console.error(
        `[Platica] Failed to send payment success message to ${cleanPhoneNumber.substring(0, 6)}***:`,
        result.error,
      );
    }

    return result;
  }

  return {
    sendOTP,
    sendpaymentfailedMessage,
    sendpaymentsuccessMessage,
  };
}

// ============================================
// Environment-based Client Instance
// ============================================

/**
 * Get default client from environment variables
 */
function getDefaultClient(): ReturnType<typeof createPlaticaClient> | null {
  const channelId = process.env.PLATICA_CHANNEL_ID;
  const apiKey = process.env.PLATICA_API_KEY;
  const apiUrl = process.env.PLATICA_API_URL;
  const apiUrlOTP = process.env.PLATICA_API_URLOTP;

  if (!channelId || !apiKey || !apiUrl) {
    return null;
  }

  return createPlaticaClient({
    channelId,
    apiKey,
    apiUrl,
    apiUrlOTP: apiUrlOTP || undefined,
  });
}

// ============================================
// Legacy Functions (Backward Compatibility)
// ============================================

/**
 * Send OTP via WhatsApp - Legacy function
 * @deprecated Use createPlaticaClient for better error handling
 */
export async function sendOTPWhatsApp(
  phone: string,
  otp: string,
): Promise<boolean> {
  const client = getDefaultClient();
  if (!client) {
    console.error("Platica credentials not configured");
    return false;
  }

  const result = await client.sendOTP(phone, otp);
  return result.ok && result.data;
}

/**
 * Send WhatsApp message - Legacy function
 * @deprecated Use createPlaticaClient for better error handling
 */
export async function sendWhatsApp(phone: string): Promise<boolean> {
  const client = getDefaultClient();
  if (!client) {
    console.error("Platica credentials not configured");
    return false;
  }

  const result = await client.sendpaymentfailedMessage(
    phone,
    "Usuario",
    "Plan",
    "https://station24.com.mx",
  );
  return result.ok && result.data;
}

// ============================================
// Export Types for consumers
// ============================================

export type {
  PlaticaClientConfig,
  PlaticaErrorResponse,
  PlaticaMessageRequest,
  PlaticaMessageRequestOTP,
  PlaticaSuccessResponse,
  Result,
};
