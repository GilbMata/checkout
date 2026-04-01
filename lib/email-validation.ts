/**
 * Email validation utilities using @isdisposable/js
 *
 * Detects disposable/temporary email addresses using a blocklist
 * of 160,000+ known disposable domains.
 */

import { isDisposable, isDomainDisposable } from "@isdisposable/js";

export interface EmailValidationResult {
  valid: boolean;
  isDisposable: boolean;
  domain: string;
  email: string;
  reason?: string;
}

/**
 * Validate an email address and check if it's disposable
 *
 * @param email - Email address to validate
 * @returns Detailed validation result
 */
export function validateEmail(email: string): EmailValidationResult {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";

  if (!domain) {
    return {
      valid: false,
      isDisposable: false,
      domain: "",
      email,
      reason: "Invalid email format",
    };
  }

  const disposable = isDisposable(email);

  return {
    valid: !disposable,
    isDisposable: disposable,
    domain,
    email,
    reason: disposable ? "Disposable email domain detected" : undefined,
  };
}

/**
 * Check if a domain is disposable (without full email)
 *
 * @param domain - Domain to check
 * @returns True if domain is disposable
 */
export function isDisposableDomain(domain: string): boolean {
  return isDomainDisposable(domain.toLowerCase());
}

/**
 * Validate multiple emails in bulk
 *
 * @param emails - Array of email addresses
 * @returns Array of validation results
 */
export function validateEmailBulk(emails: string[]): EmailValidationResult[] {
  return emails.map(validateEmail);
}

/**
 * Extract domain from email address
 *
 * @param email - Email address
 * @returns Domain or empty string
 */
export function extractDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() ?? "";
}
