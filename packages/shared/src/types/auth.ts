/**
 * Authentication result types.
 */

export type AuthResult =
  | { kind: 'ok'; userId: string; accessToken: string; refreshToken: string }
  | { kind: 'invalid_credentials' }
  | { kind: 'account_locked'; remainingSeconds: number }
  | { kind: 'email_in_use' }
  | { kind: 'invalid_email_format' }
  | { kind: 'invalid_password_format' }
  | { kind: 'provider_unavailable' };
