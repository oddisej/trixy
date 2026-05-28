/**
 * JWT Authentication Middleware
 *
 * Extracts and verifies JWT tokens from incoming requests.
 * Attaches the authenticated userId to the request context.
 *
 * Requirements: 10.3 (access within 3s after valid credentials)
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/** Represents an authenticated request context after JWT verification. */
export interface AuthenticatedContext {
  userId: string;
  /** ISO timestamp when the token expires */
  expiresAt: string;
}

/** Result of JWT verification. */
export type JwtVerifyResult =
  | { kind: 'valid'; context: AuthenticatedContext }
  | { kind: 'expired' }
  | { kind: 'invalid' }
  | { kind: 'missing' };

/** Injectable interface for JWT token operations. */
export interface JwtProvider {
  verify(token: string): JwtVerifyResult;
  sign(payload: { userId: string }): string;
}

// ─── Middleware ──────────────────────────────────────────────────────────────

/**
 * Extracts the Bearer token from an Authorization header value.
 * Returns null if the header is missing or malformed.
 */
export function extractBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) return null;
  const parts = authorizationHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1] ?? null;
}

/**
 * JWT authentication middleware function.
 *
 * Given a JwtProvider and an Authorization header value, returns either
 * an authenticated context or an error result indicating why auth failed.
 */
export function authenticateRequest(
  jwtProvider: JwtProvider,
  authorizationHeader: string | undefined,
): JwtVerifyResult {
  const token = extractBearerToken(authorizationHeader);
  if (!token) {
    return { kind: 'missing' };
  }
  return jwtProvider.verify(token);
}

// ─── Placeholder JWT Provider ────────────────────────────────────────────────

/**
 * Placeholder JWT provider for development/testing.
 *
 * In production, this would use a proper JWT library (e.g., jose, jsonwebtoken)
 * with RS256 or ES256 signing.
 */
export class PlaceholderJwtProvider implements JwtProvider {
  private readonly secret: string;
  private readonly expiresInMs: number;

  constructor(secret = 'dev-secret', expiresInMs = 3600_000) {
    this.secret = secret;
    this.expiresInMs = expiresInMs;
  }

  /**
   * Signs a payload and returns a placeholder token.
   * Format: base64(JSON({ userId, expiresAt }))
   */
  sign(payload: { userId: string }): string {
    const expiresAt = new Date(Date.now() + this.expiresInMs).toISOString();
    const data = JSON.stringify({ userId: payload.userId, expiresAt, secret: this.secret });
    return Buffer.from(data).toString('base64url');
  }

  /**
   * Verifies a placeholder token by decoding and checking expiry.
   */
  verify(token: string): JwtVerifyResult {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf-8'));

      if (!decoded.userId || !decoded.expiresAt || decoded.secret !== this.secret) {
        return { kind: 'invalid' };
      }

      const expiresAt = new Date(decoded.expiresAt);
      if (expiresAt <= new Date()) {
        return { kind: 'expired' };
      }

      return {
        kind: 'valid',
        context: { userId: decoded.userId, expiresAt: decoded.expiresAt },
      };
    } catch {
      return { kind: 'invalid' };
    }
  }
}
