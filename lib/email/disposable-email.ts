import { isDisposable } from "@isdisposable/js";

/**
 * Result type for disposable email validation
 */
export interface DisposableEmailResult {
  isDisposable: boolean;
  message?: string;
}

/**
 * Validates if an email is from a disposable/temporary email provider
 * @param email - The email address to validate
 * @returns Object with validation result and user-friendly message
 */
export function validateDisposableEmail(email: string): DisposableEmailResult {
  try {
    const emailIsDisposable = isDisposable(email);

    if (emailIsDisposable) {
      return {
        isDisposable: true,
        message:
          "Los correos temporales o desechables no están permitidos. Por favor, utiliza un correo electrónico válido.",
      };
    }

    return { isDisposable: false };
  } catch (error) {
    console.error("Error validating disposable email:", error);
    // On error, allow the email but log for monitoring
    return { isDisposable: false };
  }
}

/**
 * Wrapper function that throws an error if email is disposable
 * Use this in server actions for automatic error handling
 * @param email - The email address to validate
 * @throws Error with user-friendly message if email is disposable
 */
export function assertNotDisposableEmail(email: string): void {
  const result = validateDisposableEmail(email);

  if (result.isDisposable && result.message) {
    throw new Error(result.message);
  }
}
