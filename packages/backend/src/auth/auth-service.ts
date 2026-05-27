import { AuthResult, User } from '@trixy/shared';
import { validateEmail, validatePassword } from './validation';

/**
 * Injectable interface for user persistence.
 */
export interface UserStore {
  findByEmail(email: string): Promise<User | undefined>;
  create(user: User): Promise<void>;
  update(user: User): Promise<void>;
}

/**
 * Interface for OAuth provider token verification.
 * Each provider (Google, Apple) implements this to verify ID tokens.
 */
export interface OAuthProvider {
  verifyToken(idToken: string): Promise<{ email: string; name?: string } | null>;
}

/**
 * In-memory implementation of UserStore for testing.
 */
export class InMemoryUserStore implements UserStore {
  private users: Map<string, User> = new Map();

  async findByEmail(email: string): Promise<User | undefined> {
    const normalized = email.toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === normalized) {
        return user;
      }
    }
    return undefined;
  }

  async create(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  async update(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  /** Test helper: get all stored users */
  getAll(): User[] {
    return [...this.users.values()];
  }
}

/**
 * Generates a simple hash placeholder for passwords.
 * In production this would use bcrypt or argon2.
 */
function hashPassword(password: string): string {
  return `hashed:${password}`;
}

/** Generates a UUID-like string. */
function generateId(): string {
  return crypto.randomUUID();
}

/** Generates a placeholder token. */
function generateToken(): string {
  return crypto.randomUUID();
}

/** OAuth provider timeout in milliseconds. */
const OAUTH_TIMEOUT_MS = 5000;

/**
 * Authentication service handling registration, login, OAuth, and token management.
 */
export class AuthService {
  private readonly oauthProviders: Map<'google' | 'apple', OAuthProvider>;

  constructor(
    private readonly userStore: UserStore,
    oauthProviders?: Map<'google' | 'apple', OAuthProvider>,
  ) {
    this.oauthProviders = oauthProviders ?? new Map();
  }

  /**
   * Logs in a user via a third-party OAuth provider (Google or Apple).
   *
   * - Verifies the ID token with the provider (5s timeout)
   * - If valid: finds or creates user by email, returns tokens
   * - If invalid token: returns invalid_credentials
   * - If provider times out (5s): returns provider_unavailable
   */
  async loginWithProvider(
    provider: 'google' | 'apple',
    idToken: string,
  ): Promise<AuthResult> {
    const oauthProvider = this.oauthProviders.get(provider);
    if (!oauthProvider) {
      return { kind: 'provider_unavailable' };
    }

    // Verify token with timeout
    let verifyResult: { email: string; name?: string } | null;
    try {
      verifyResult = await Promise.race([
        oauthProvider.verifyToken(idToken),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('provider_timeout')), OAUTH_TIMEOUT_MS),
        ),
      ]);
    } catch {
      return { kind: 'provider_unavailable' };
    }

    // Invalid token
    if (verifyResult === null) {
      return { kind: 'invalid_credentials' };
    }

    // Find or create user by email
    const email = verifyResult.email.toLowerCase();
    let user = await this.userStore.findByEmail(email);

    if (!user) {
      // Create new user for OAuth login
      const userId = generateId();
      user = {
        id: userId,
        email,
        passwordHash: undefined,
        authProviders: [provider],
        createdAt: new Date(),
        failedLoginCount: 0,
        lockedUntil: undefined,
        voiceInputEnabled: false,
        voiceLanguage: 'de',
      };
      await this.userStore.create(user);
    } else {
      // Add provider to existing user if not already present
      if (!user.authProviders.includes(provider)) {
        const updatedUser: User = {
          ...user,
          authProviders: [...user.authProviders, provider],
        };
        await this.userStore.update(updatedUser);
        user = updatedUser;
      }
    }

    // Generate tokens and return success
    const accessToken = generateToken();
    const refreshToken = generateToken();

    return { kind: 'ok', userId: user.id, accessToken, refreshToken };
  }

  /**
   * Logs in a user with email and password.
   *
   * - Checks if account is locked (lockedUntil > now) → returns account_locked with remainingSeconds
   * - Verifies password against stored hash
   * - On success: resets failedLoginCount to 0, returns tokens
   * - On failure: increments failedLoginCount, if count >= 3 sets lockedUntil = now + 15 minutes
   */
  async login(input: { email: string; password: string }): Promise<AuthResult> {
    // 1. Find user by email
    const user = await this.userStore.findByEmail(input.email);
    if (!user) {
      return { kind: 'invalid_credentials' };
    }

    // 2. Check if account is locked
    if (user.lockedUntil) {
      const now = new Date();
      if (user.lockedUntil > now) {
        const remainingMs = user.lockedUntil.getTime() - now.getTime();
        const remainingSeconds = Math.ceil(remainingMs / 1000);
        return { kind: 'account_locked', remainingSeconds };
      }
    }

    // 3. Verify password
    const expectedHash = hashPassword(input.password);
    if (user.passwordHash !== expectedHash) {
      // Increment failed login count
      const newFailedCount = user.failedLoginCount + 1;
      const updatedUser: User = {
        ...user,
        failedLoginCount: newFailedCount,
        lockedUntil: newFailedCount >= 3
          ? new Date(Date.now() + 15 * 60 * 1000)
          : user.lockedUntil,
      };
      await this.userStore.update(updatedUser);
      return { kind: 'invalid_credentials' };
    }

    // 4. Successful login: reset failed count
    const updatedUser: User = {
      ...user,
      failedLoginCount: 0,
      lockedUntil: undefined,
    };
    await this.userStore.update(updatedUser);

    // 5. Generate tokens and return success
    const accessToken = generateToken();
    const refreshToken = generateToken();

    return { kind: 'ok', userId: user.id, accessToken, refreshToken };
  }

  /**
   * Registers a new user with email and password.
   *
   * - Validates email format (RFC-5322)
   * - Validates password format (8-128 chars, ≥1 uppercase, ≥1 lowercase, ≥1 digit)
   * - Checks email uniqueness case-insensitively
   * - Returns 'email_in_use' if the email already exists without modifying the existing account
   */
  async register(input: { email: string; password: string }): Promise<AuthResult> {
    // 1. Validate email
    const emailResult = validateEmail(input.email);
    if (!emailResult.valid) {
      return { kind: 'invalid_email_format' };
    }

    // 2. Validate password
    const passwordResult = validatePassword(input.password);
    if (!passwordResult.valid) {
      return { kind: 'invalid_password_format' };
    }

    // 3. Check email uniqueness (case-insensitive)
    const existingUser = await this.userStore.findByEmail(input.email);
    if (existingUser) {
      return { kind: 'email_in_use' };
    }

    // 4. Hash password
    const passwordHash = hashPassword(input.password);

    // 5. Create and persist user
    const userId = generateId();
    const user: User = {
      id: userId,
      email: input.email.toLowerCase(),
      passwordHash,
      authProviders: ['local'],
      createdAt: new Date(),
      failedLoginCount: 0,
      lockedUntil: undefined,
      voiceInputEnabled: false,
      voiceLanguage: 'de',
    };

    await this.userStore.create(user);

    // 6. Generate tokens and return success
    const accessToken = generateToken();
    const refreshToken = generateToken();

    return { kind: 'ok', userId, accessToken, refreshToken };
  }
}
