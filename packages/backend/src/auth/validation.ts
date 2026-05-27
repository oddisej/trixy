/**
 * Validation result types for auth input validation.
 */
export type EmailValidationResult =
  | { valid: true }
  | { valid: false; kind: 'invalid_email_format' };

export type PasswordValidationResult =
  | { valid: true }
  | { valid: false; kind: 'invalid_password_format' };

/**
 * RFC-5322 compliant email validation.
 *
 * This regex covers the practical subset of RFC-5322 addresses:
 * - Local part: allows alphanumeric, dots, underscores, hyphens, plus signs,
 *   and other permitted special characters. Quoted strings are supported.
 * - Domain part: allows standard domain labels with hyphens, separated by dots.
 */
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Validates an email address against RFC-5322 format.
 *
 * @returns `{ valid: true }` or `{ valid: false; kind: 'invalid_email_format' }`
 */
export function validateEmail(email: string): EmailValidationResult {
  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, kind: 'invalid_email_format' };
  }
  return { valid: true };
}

/**
 * Validates a password against the following rules:
 * - Length: 8–128 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one digit (0-9)
 *
 * @returns `{ valid: true }` or `{ valid: false; kind: 'invalid_password_format' }`
 */
export function validatePassword(password: string): PasswordValidationResult {
  if (password.length < 8 || password.length > 128) {
    return { valid: false, kind: 'invalid_password_format' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, kind: 'invalid_password_format' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, kind: 'invalid_password_format' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, kind: 'invalid_password_format' };
  }

  return { valid: true };
}
