import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService, InMemoryUserStore, OAuthProvider } from './auth-service';

describe('AuthService.register', () => {
  let store: InMemoryUserStore;
  let authService: AuthService;

  beforeEach(() => {
    store = new InMemoryUserStore();
    authService = new AuthService(store);
  });

  it('successfully registers a user with valid email and password', async () => {
    const result = await authService.register({
      email: 'user@example.com',
      password: 'ValidPass1',
    });

    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.userId).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    }
  });

  it('persists the user after successful registration', async () => {
    await authService.register({
      email: 'user@example.com',
      password: 'ValidPass1',
    });

    const users = store.getAll();
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('user@example.com');
    expect(users[0].authProviders).toEqual(['local']);
  });

  it('stores email in lowercase', async () => {
    await authService.register({
      email: 'User@Example.COM',
      password: 'ValidPass1',
    });

    const users = store.getAll();
    expect(users[0].email).toBe('user@example.com');
  });

  it('returns invalid_email_format for invalid email', async () => {
    const result = await authService.register({
      email: 'not-an-email',
      password: 'ValidPass1',
    });

    expect(result).toEqual({ kind: 'invalid_email_format' });
  });

  it('returns invalid_password_format for weak password', async () => {
    const result = await authService.register({
      email: 'user@example.com',
      password: 'short',
    });

    expect(result).toEqual({ kind: 'invalid_password_format' });
  });

  it('returns email_in_use when email already exists', async () => {
    await authService.register({
      email: 'user@example.com',
      password: 'ValidPass1',
    });

    const result = await authService.register({
      email: 'user@example.com',
      password: 'AnotherPass2',
    });

    expect(result).toEqual({ kind: 'email_in_use' });
  });

  it('returns email_in_use case-insensitively', async () => {
    await authService.register({
      email: 'user@example.com',
      password: 'ValidPass1',
    });

    const result = await authService.register({
      email: 'USER@EXAMPLE.COM',
      password: 'AnotherPass2',
    });

    expect(result).toEqual({ kind: 'email_in_use' });
  });

  it('does not modify existing account when email_in_use is returned', async () => {
    await authService.register({
      email: 'user@example.com',
      password: 'OriginalPass1',
    });

    const usersBefore = store.getAll();
    const originalUser = { ...usersBefore[0] };

    await authService.register({
      email: 'user@example.com',
      password: 'DifferentPass2',
    });

    const usersAfter = store.getAll();
    expect(usersAfter).toHaveLength(1);
    expect(usersAfter[0].id).toBe(originalUser.id);
    expect(usersAfter[0].email).toBe(originalUser.email);
    expect(usersAfter[0].passwordHash).toBe(originalUser.passwordHash);
  });

  it('allows registration of different emails', async () => {
    const result1 = await authService.register({
      email: 'user1@example.com',
      password: 'ValidPass1',
    });
    const result2 = await authService.register({
      email: 'user2@example.com',
      password: 'ValidPass2',
    });

    expect(result1.kind).toBe('ok');
    expect(result2.kind).toBe('ok');
    expect(store.getAll()).toHaveLength(2);
  });

  it('returns email_in_use with mixed case variations', async () => {
    await authService.register({
      email: 'Test.User@Example.com',
      password: 'ValidPass1',
    });

    const result = await authService.register({
      email: 'test.user@example.com',
      password: 'AnotherPass2',
    });

    expect(result).toEqual({ kind: 'email_in_use' });
  });
});

describe('AuthService.login', () => {
  let store: InMemoryUserStore;
  let authService: AuthService;

  beforeEach(async () => {
    store = new InMemoryUserStore();
    authService = new AuthService(store);
    // Register a user for login tests
    await authService.register({
      email: 'user@example.com',
      password: 'ValidPass1',
    });
  });

  it('returns ok with tokens on successful login', async () => {
    const result = await authService.login({
      email: 'user@example.com',
      password: 'ValidPass1',
    });

    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.userId).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    }
  });

  it('returns invalid_credentials for wrong password', async () => {
    const result = await authService.login({
      email: 'user@example.com',
      password: 'WrongPass1',
    });

    expect(result).toEqual({ kind: 'invalid_credentials' });
  });

  it('returns invalid_credentials for non-existent email', async () => {
    const result = await authService.login({
      email: 'nobody@example.com',
      password: 'ValidPass1',
    });

    expect(result).toEqual({ kind: 'invalid_credentials' });
  });

  it('finds user case-insensitively by email', async () => {
    const result = await authService.login({
      email: 'USER@EXAMPLE.COM',
      password: 'ValidPass1',
    });

    expect(result.kind).toBe('ok');
  });

  it('increments failedLoginCount on wrong password', async () => {
    await authService.login({
      email: 'user@example.com',
      password: 'WrongPass1',
    });

    const user = store.getAll()[0];
    expect(user.failedLoginCount).toBe(1);
  });

  it('locks account after 3 consecutive failed attempts', async () => {
    await authService.login({ email: 'user@example.com', password: 'Wrong1xx' });
    await authService.login({ email: 'user@example.com', password: 'Wrong2xx' });
    await authService.login({ email: 'user@example.com', password: 'Wrong3xx' });

    const user = store.getAll()[0];
    expect(user.failedLoginCount).toBe(3);
    expect(user.lockedUntil).toBeDefined();
    expect(user.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
  });

  it('returns account_locked with remainingSeconds when locked', async () => {
    // Lock the account
    await authService.login({ email: 'user@example.com', password: 'Wrong1xx' });
    await authService.login({ email: 'user@example.com', password: 'Wrong2xx' });
    await authService.login({ email: 'user@example.com', password: 'Wrong3xx' });

    // Try to login again
    const result = await authService.login({
      email: 'user@example.com',
      password: 'ValidPass1',
    });

    expect(result.kind).toBe('account_locked');
    if (result.kind === 'account_locked') {
      expect(result.remainingSeconds).toBeGreaterThan(0);
      expect(result.remainingSeconds).toBeLessThanOrEqual(15 * 60);
    }
  });

  it('resets failedLoginCount on successful login', async () => {
    // Fail twice
    await authService.login({ email: 'user@example.com', password: 'Wrong1xx' });
    await authService.login({ email: 'user@example.com', password: 'Wrong2xx' });

    // Succeed
    await authService.login({ email: 'user@example.com', password: 'ValidPass1' });

    const user = store.getAll()[0];
    expect(user.failedLoginCount).toBe(0);
    expect(user.lockedUntil).toBeUndefined();
  });

  it('does not lock account if successful login intervenes', async () => {
    await authService.login({ email: 'user@example.com', password: 'Wrong1xx' });
    await authService.login({ email: 'user@example.com', password: 'Wrong2xx' });
    // Successful login resets counter
    await authService.login({ email: 'user@example.com', password: 'ValidPass1' });
    // Two more failures should not lock (counter was reset)
    await authService.login({ email: 'user@example.com', password: 'Wrong3xx' });
    await authService.login({ email: 'user@example.com', password: 'Wrong4xx' });

    const user = store.getAll()[0];
    expect(user.failedLoginCount).toBe(2);
    expect(user.lockedUntil).toBeUndefined();
  });

  it('allows login after lock period expires', async () => {
    // Manually set lockedUntil in the past
    const user = store.getAll()[0];
    const pastLock = new Date(Date.now() - 1000); // 1 second ago
    await store.update({ ...user, failedLoginCount: 3, lockedUntil: pastLock });

    const result = await authService.login({
      email: 'user@example.com',
      password: 'ValidPass1',
    });

    expect(result.kind).toBe('ok');
  });

  it('resets lock state after successful login post-expiry', async () => {
    // Manually set lockedUntil in the past
    const user = store.getAll()[0];
    const pastLock = new Date(Date.now() - 1000);
    await store.update({ ...user, failedLoginCount: 3, lockedUntil: pastLock });

    await authService.login({
      email: 'user@example.com',
      password: 'ValidPass1',
    });

    const updatedUser = store.getAll()[0];
    expect(updatedUser.failedLoginCount).toBe(0);
    expect(updatedUser.lockedUntil).toBeUndefined();
  });

  it('sets lockedUntil to approximately 15 minutes in the future', async () => {
    await authService.login({ email: 'user@example.com', password: 'Wrong1xx' });
    await authService.login({ email: 'user@example.com', password: 'Wrong2xx' });
    await authService.login({ email: 'user@example.com', password: 'Wrong3xx' });

    const user = store.getAll()[0];
    const expectedLockTime = Date.now() + 15 * 60 * 1000;
    // Allow 5 seconds tolerance for test execution time
    expect(user.lockedUntil!.getTime()).toBeGreaterThan(expectedLockTime - 5000);
    expect(user.lockedUntil!.getTime()).toBeLessThanOrEqual(expectedLockTime);
  });
});


describe('AuthService.loginWithProvider', () => {
  let store: InMemoryUserStore;
  let authService: AuthService;
  let mockGoogleProvider: OAuthProvider;
  let mockAppleProvider: OAuthProvider;

  beforeEach(() => {
    store = new InMemoryUserStore();

    mockGoogleProvider = {
      verifyToken: async (idToken: string) => {
        if (idToken === 'valid-google-token') {
          return { email: 'google-user@example.com', name: 'Google User' };
        }
        return null;
      },
    };

    mockAppleProvider = {
      verifyToken: async (idToken: string) => {
        if (idToken === 'valid-apple-token') {
          return { email: 'apple-user@example.com', name: 'Apple User' };
        }
        return null;
      },
    };

    const providers = new Map<'google' | 'apple', OAuthProvider>([
      ['google', mockGoogleProvider],
      ['apple', mockAppleProvider],
    ]);

    authService = new AuthService(store, providers);
  });

  it('returns ok with tokens for valid Google token and creates new user', async () => {
    const result = await authService.loginWithProvider('google', 'valid-google-token');

    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.userId).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    }

    const users = store.getAll();
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('google-user@example.com');
    expect(users[0].authProviders).toContain('google');
  });

  it('returns ok with tokens for valid Apple token and creates new user', async () => {
    const result = await authService.loginWithProvider('apple', 'valid-apple-token');

    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.userId).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    }

    const users = store.getAll();
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('apple-user@example.com');
    expect(users[0].authProviders).toContain('apple');
  });

  it('maps to existing user when email already exists', async () => {
    // Register a user with the same email first
    await authService.register({
      email: 'google-user@example.com',
      password: 'ValidPass1',
    });

    const usersBefore = store.getAll();
    expect(usersBefore).toHaveLength(1);
    const existingUserId = usersBefore[0].id;

    // Login with OAuth using same email
    const result = await authService.loginWithProvider('google', 'valid-google-token');

    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.userId).toBe(existingUserId);
    }

    // Should still be only 1 user
    const usersAfter = store.getAll();
    expect(usersAfter).toHaveLength(1);
    // Provider should be added
    expect(usersAfter[0].authProviders).toContain('local');
    expect(usersAfter[0].authProviders).toContain('google');
  });

  it('does not duplicate provider in authProviders on repeated login', async () => {
    // First OAuth login creates user
    await authService.loginWithProvider('google', 'valid-google-token');
    // Second OAuth login with same provider
    await authService.loginWithProvider('google', 'valid-google-token');

    const users = store.getAll();
    expect(users).toHaveLength(1);
    const googleCount = users[0].authProviders.filter((p) => p === 'google').length;
    expect(googleCount).toBe(1);
  });

  it('returns invalid_credentials for invalid token', async () => {
    const result = await authService.loginWithProvider('google', 'invalid-token');

    expect(result).toEqual({ kind: 'invalid_credentials' });
    expect(store.getAll()).toHaveLength(0);
  });

  it('returns provider_unavailable when provider times out (5s)', async () => {
    const slowProvider: OAuthProvider = {
      verifyToken: () =>
        new Promise((resolve) => {
          // Simulate a provider that takes longer than 5s
          setTimeout(() => resolve({ email: 'slow@example.com' }), 6000);
        }),
    };

    const providers = new Map<'google' | 'apple', OAuthProvider>([
      ['google', slowProvider],
    ]);
    const service = new AuthService(store, providers);

    const result = await service.loginWithProvider('google', 'any-token');

    expect(result).toEqual({ kind: 'provider_unavailable' });
  }, 10000);

  it('returns provider_unavailable when provider throws an error', async () => {
    const errorProvider: OAuthProvider = {
      verifyToken: async () => {
        throw new Error('Network error');
      },
    };

    const providers = new Map<'google' | 'apple', OAuthProvider>([
      ['google', errorProvider],
    ]);
    const service = new AuthService(store, providers);

    const result = await service.loginWithProvider('google', 'any-token');

    expect(result).toEqual({ kind: 'provider_unavailable' });
  });

  it('returns provider_unavailable when provider is not configured', async () => {
    // Create service with no providers
    const service = new AuthService(store);

    const result = await service.loginWithProvider('google', 'any-token');

    expect(result).toEqual({ kind: 'provider_unavailable' });
  });

  it('creates OAuth-only user without passwordHash', async () => {
    await authService.loginWithProvider('google', 'valid-google-token');

    const users = store.getAll();
    expect(users[0].passwordHash).toBeUndefined();
  });

  it('normalizes email to lowercase from provider', async () => {
    const upperCaseProvider: OAuthProvider = {
      verifyToken: async () => ({ email: 'USER@EXAMPLE.COM', name: 'User' }),
    };

    const providers = new Map<'google' | 'apple', OAuthProvider>([
      ['google', upperCaseProvider],
    ]);
    const service = new AuthService(store, providers);

    await service.loginWithProvider('google', 'any-token');

    const users = store.getAll();
    expect(users[0].email).toBe('user@example.com');
  });
});
