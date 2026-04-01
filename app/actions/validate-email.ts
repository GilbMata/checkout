"use server";

/**
 * Email validation Server Action
 *
 * Validates email addresses using @isdisposable/js and logs attempts
 * to the database for fraud/spam analysis.
 */

import { db } from "@/lib/db/index";
import { emailValidationLogs } from "@/lib/db/schema";
import {
  validateEmail,
  type EmailValidationResult,
} from "@/lib/email-validation";
import { headers } from "next/headers";
import { v4 as uuidv4 } from "uuid";

export type ValidateEmailActionResult = EmailValidationResult;

interface ValidateEmailOptions {
  /** Context where validation is happening (for logging) */
  context?: "checkout_registration" | "prospect_update" | "otp_request";
  /** Whether to skip logging (e.g., for testing) */
  skipLog?: boolean;
}

/**
 * Validate an email address and check if it's disposable
 *
 * This is the primary validation method - it validates the email,
 * logs the attempt, and returns detailed results.
 *
 * @param email - Email address to validate
 * @param options - Optional configuration
 * @returns Validation result with disposable status
 */
export async function validateEmailAction(
  email: string,
  options: ValidateEmailOptions = {},
): Promise<ValidateEmailActionResult> {
  const { context = "checkout_registration", skipLog = false } = options;

  // Perform validation
  const result = validateEmail(email);

  // Log attempt if not skipped
  if (!skipLog) {
    try {
      await logValidationAttempt(result, context);
    } catch (error) {
      // Log error but don't fail the validation
      console.error("Failed to log email validation attempt:", error);
    }
  }

  return result;
}

/**
 * Log validation attempt to database for fraud analysis
 */
async function logValidationAttempt(
  result: EmailValidationResult,
  context: ValidateEmailOptions["context"],
): Promise<void> {
  const headersList = await headers();

  // Extract IP address (handle proxies)
  const forwardedFor = headersList.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    "unknown";

  // Extract user agent
  const userAgent = headersList.get("user-agent") ?? "unknown";

  const id = uuidv4();
  const now = Date.now();

  await db.insert(emailValidationLogs).values({
    id,
    email: result.email,
    domain: result.domain,
    isDisposable: result.isDisposable,
    ipAddress,
    userAgent,
    validationContext: context,
    createdAt: now,
  });
}

/**
 * Quick check if email is disposable (no logging)
 * Use this for inline validation in forms
 */
export async function isDisposableEmail(email: string): Promise<boolean> {
  const result = validateEmail(email);
  return result.isDisposable;
}
