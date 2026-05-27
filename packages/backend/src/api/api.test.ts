/**
 * Tests for the API Gateway: middleware, routes, and WebSocket handler.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  extractBearerToken,
  authenticateRequest,
  PlaceholderJwtProvider,
} from './middleware.js';
import type { JwtProvider } from './middleware.js';
import { createRoutes } from './routes.js';
import type { ApiRequest, ApiDependencies } from './routes.js';
import { WebSocketHandler } from './websocket.js';
import type { WebSocketSender, ServerMessage, ClientMessage } from './websocket.js';
import type { AuthResult } from '@trixy/shared';

// ─── Middleware Tests ────────────────────────────────────────────────────────

describe('extractBearerToken', () => {
  it('returns null for undefined header', () => {
    expect(extractBearerToken(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractBearerToken('')).toBeNull();
  });

  it('returns null for non-Bearer scheme', () => {
    expect(extractBearerToken('Basic abc123')).toBeNull();
  });

  it('returns null for malformed header (no space)', () => {
    expect(extractBearerToken('Bearerabc123')).toBeNull();
  });

  it('extracts token from valid Bearer header', () => {
    expect(extractBearerToken('Bearer my-token-123')).toBe('my-token-123');
  });
});

describe('PlaceholderJwtProvider', () => {
  let provider: PlaceholderJwtProvider;

  beforeEach(() => {
    provider = new PlaceholderJwtProvider('test-secret', 60_000);
  });

  it('signs and verifies a valid token', () => {
    const token = provider.sign({ userId: 'user-1' });
    const result = provider.verify(token);

    expect(result.kind).toBe('valid');
    if (result.kind === 'valid') {
      expect(result.context.userId).toBe('user-1');
    }
  });

  it('returns expired for an expired token', () => {
    // Create a provider with 0ms expiry
    const expiredProvider = new PlaceholderJwtProvider('test-secret', -1000);
    const token = expiredProvider.sign({ userId: 'user-1' });
    const result = provider.verify(token);

    expect(result.kind).toBe('expired');
  });

  it('returns invalid for a garbage token', () => {
    const result = provider.verify('not-a-valid-token!!!');
    expect(result.kind).toBe('invalid');
  });

  it('returns invalid for a token signed with a different secret', () => {
    const otherProvider = new PlaceholderJwtProvider('other-secret', 60_000);
    const token = otherProvider.sign({ userId: 'user-1' });
    const result = provider.verify(token);

    expect(result.kind).toBe('invalid');
  });
});

describe('authenticateRequest', () => {
  let provider: PlaceholderJwtProvider;

  beforeEach(() => {
    provider = new PlaceholderJwtProvider('test-secret', 60_000);
  });

  it('returns missing when no header is provided', () => {
    const result = authenticateRequest(provider, undefined);
    expect(result.kind).toBe('missing');
  });

  it('returns valid for a correct Bearer token', () => {
    const token = provider.sign({ userId: 'user-42' });
    const result = authenticateRequest(provider, `Bearer ${token}`);

    expect(result.kind).toBe('valid');
    if (result.kind === 'valid') {
      expect(result.context.userId).toBe('user-42');
    }
  });
});

// ─── Route Tests ─────────────────────────────────────────────────────────────

describe('createRoutes', () => {
  function createMockDeps(): ApiDependencies {
    const jwtProvider = new PlaceholderJwtProvider('test-secret', 60_000);

    return {
      authService: {
        register: async () => ({ kind: 'ok', userId: 'u1', accessToken: 'at', refreshToken: 'rt' }) as AuthResult,
        login: async () => ({ kind: 'ok', userId: 'u1', accessToken: 'at', refreshToken: 'rt' }) as AuthResult,
        loginWithProvider: async () => ({ kind: 'ok', userId: 'u1', accessToken: 'at', refreshToken: 'rt' }) as AuthResult,
      } as any,
      campaignManager: {
        listCampaigns: async () => [],
        createCampaign: async () => ({ id: 'c1', title: 'Test' }),
      } as any,
      sessionService: {
        loadSession: async () => null,
      } as any,
      gameEngine: {
        handlePlayerMessage: async () => ({ kind: 'narration', text: 'The dragon roars.' }),
      } as any,
      jwtProvider,
    };
  }

  it('creates 7 route definitions', () => {
    const routes = createRoutes(createMockDeps());
    expect(routes).toHaveLength(7);
  });

  it('has correct auth routes (public)', () => {
    const routes = createRoutes(createMockDeps());
    const authRoutes = routes.filter((r) => r.path.startsWith('/auth'));

    expect(authRoutes).toHaveLength(3);
    expect(authRoutes.every((r) => r.requiresAuth === false)).toBe(true);
    expect(authRoutes.every((r) => r.method === 'POST')).toBe(true);
  });

  it('has correct campaign routes (authenticated)', () => {
    const routes = createRoutes(createMockDeps());
    const campaignRoutes = routes.filter((r) => r.path.startsWith('/campaigns'));

    expect(campaignRoutes).toHaveLength(2);
    expect(campaignRoutes.every((r) => r.requiresAuth === true)).toBe(true);
  });

  it('has correct session and message routes (authenticated)', () => {
    const routes = createRoutes(createMockDeps());
    const sessionRoutes = routes.filter((r) => r.path.startsWith('/sessions'));

    expect(sessionRoutes).toHaveLength(2);
    expect(sessionRoutes.every((r) => r.requiresAuth === true)).toBe(true);
  });

  describe('register handler', () => {
    it('returns 200 on successful registration', async () => {
      const deps = createMockDeps();
      const routes = createRoutes(deps);
      const registerRoute = routes.find((r) => r.path === '/auth/register')!;

      const req: ApiRequest = {
        method: 'POST',
        path: '/auth/register',
        headers: {},
        params: {},
        body: { email: 'test@example.com', password: 'Password1' },
      };

      const res = await registerRoute.handler(req);
      expect(res.status).toBe(200);
      expect((res.body as any).userId).toBe('u1');
    });

    it('returns 400 when email is missing', async () => {
      const deps = createMockDeps();
      const routes = createRoutes(deps);
      const registerRoute = routes.find((r) => r.path === '/auth/register')!;

      const req: ApiRequest = {
        method: 'POST',
        path: '/auth/register',
        headers: {},
        params: {},
        body: { password: 'Password1' },
      };

      const res = await registerRoute.handler(req);
      expect(res.status).toBe(400);
    });
  });

  describe('campaigns handler', () => {
    it('returns 401 when no auth header is provided', async () => {
      const deps = createMockDeps();
      const routes = createRoutes(deps);
      const listRoute = routes.find((r) => r.path === '/campaigns' && r.method === 'GET')!;

      const req: ApiRequest = {
        method: 'GET',
        path: '/campaigns',
        headers: {},
        params: {},
        body: null,
      };

      const res = await listRoute.handler(req);
      expect(res.status).toBe(401);
    });

    it('returns 200 with campaigns when authenticated', async () => {
      const deps = createMockDeps();
      const token = (deps.jwtProvider as PlaceholderJwtProvider).sign({ userId: 'user-1' });
      const routes = createRoutes(deps);
      const listRoute = routes.find((r) => r.path === '/campaigns' && r.method === 'GET')!;

      const req: ApiRequest = {
        method: 'GET',
        path: '/campaigns',
        headers: { authorization: `Bearer ${token}` },
        params: {},
        body: null,
      };

      const res = await listRoute.handler(req);
      expect(res.status).toBe(200);
      expect((res.body as any).campaigns).toEqual([]);
    });
  });

  describe('messages handler', () => {
    it('returns narration response when authenticated', async () => {
      const deps = createMockDeps();
      const token = (deps.jwtProvider as PlaceholderJwtProvider).sign({ userId: 'user-1' });
      const routes = createRoutes(deps);
      const messageRoute = routes.find((r) => r.path === '/sessions/:sessionId/messages')!;

      const req: ApiRequest = {
        method: 'POST',
        path: '/sessions/session-1/messages',
        headers: { authorization: `Bearer ${token}` },
        params: { sessionId: 'session-1' },
        body: { text: 'I attack the dragon', origin: 'text' },
      };

      const res = await messageRoute.handler(req);
      expect(res.status).toBe(200);
      expect((res.body as any).kind).toBe('narration');
      expect((res.body as any).text).toBe('The dragon roars.');
    });
  });
});

// ─── WebSocket Handler Tests ─────────────────────────────────────────────────

describe('WebSocketHandler', () => {
  let handler: WebSocketHandler;
  let jwtProvider: PlaceholderJwtProvider;
  let sentMessages: { connectionId: string; message: ServerMessage }[];
  let closedConnections: { connectionId: string; code?: number; reason?: string }[];
  let sender: WebSocketSender;

  beforeEach(() => {
    jwtProvider = new PlaceholderJwtProvider('ws-secret', 60_000);
    sentMessages = [];
    closedConnections = [];

    sender = {
      send(connectionId: string, message: ServerMessage) {
        sentMessages.push({ connectionId, message });
      },
      close(connectionId: string, code?: number, reason?: string) {
        closedConnections.push({ connectionId, code, reason });
      },
    };

    handler = new WebSocketHandler({ jwtProvider, sender });
  });

  it('tracks connections on connect/disconnect', () => {
    handler.onConnect('conn-1');
    expect(handler.getConnectionCount()).toBe(1);

    handler.onConnect('conn-2');
    expect(handler.getConnectionCount()).toBe(2);

    handler.onDisconnect('conn-1');
    expect(handler.getConnectionCount()).toBe(1);
  });

  it('authenticates a connection with a valid token', () => {
    const token = jwtProvider.sign({ userId: 'user-ws' });
    handler.onConnect('conn-1');
    handler.onMessage('conn-1', { type: 'authenticate', token });

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0].message).toEqual({
      type: 'authenticated',
      userId: 'user-ws',
    });
    expect(handler.getAuthenticatedCount()).toBe(1);
  });

  it('rejects authentication with an invalid token', () => {
    handler.onConnect('conn-1');
    handler.onMessage('conn-1', { type: 'authenticate', token: 'garbage' });

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0].message.type).toBe('auth_error');
    expect(closedConnections).toHaveLength(1);
    expect(closedConnections[0].code).toBe(4001);
  });

  it('responds to ping with pong', () => {
    handler.onConnect('conn-1');
    handler.onMessage('conn-1', { type: 'ping' });

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0].message).toEqual({ type: 'pong' });
  });

  it('allows subscription after authentication', () => {
    const token = jwtProvider.sign({ userId: 'user-ws' });
    handler.onConnect('conn-1');
    handler.onMessage('conn-1', { type: 'authenticate', token });
    handler.onMessage('conn-1', { type: 'subscribe_session', sessionId: 'session-1' });

    expect(sentMessages).toHaveLength(2);
    expect(sentMessages[1].message).toEqual({ type: 'subscribed', sessionId: 'session-1' });
  });

  it('rejects subscription without authentication', () => {
    handler.onConnect('conn-1');
    handler.onMessage('conn-1', { type: 'subscribe_session', sessionId: 'session-1' });

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0].message.type).toBe('auth_error');
  });

  it('broadcasts narration to subscribed connections', () => {
    const token = jwtProvider.sign({ userId: 'user-ws' });
    handler.onConnect('conn-1');
    handler.onMessage('conn-1', { type: 'authenticate', token });
    handler.onMessage('conn-1', { type: 'subscribe_session', sessionId: 'session-1' });

    sentMessages = []; // Clear setup messages

    handler.broadcastNarration('session-1', {
      kind: 'narration',
      text: 'The orc falls.',
    });

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0].message).toEqual({
      type: 'narration_end',
      sessionId: 'session-1',
      fullText: 'The orc falls.',
      mechanics: undefined,
    });
  });

  it('does not broadcast to unsubscribed connections', () => {
    const token = jwtProvider.sign({ userId: 'user-ws' });
    handler.onConnect('conn-1');
    handler.onMessage('conn-1', { type: 'authenticate', token });
    // Not subscribed to session-1

    sentMessages = [];

    handler.broadcastNarration('session-1', {
      kind: 'narration',
      text: 'The orc falls.',
    });

    expect(sentMessages).toHaveLength(0);
  });

  it('streams narration chunks to subscribers', () => {
    const token = jwtProvider.sign({ userId: 'user-ws' });
    handler.onConnect('conn-1');
    handler.onMessage('conn-1', { type: 'authenticate', token });
    handler.onMessage('conn-1', { type: 'subscribe_session', sessionId: 'session-1' });

    sentMessages = [];

    handler.streamNarrationChunks('session-1', ['The ', 'dragon ', 'roars.']);

    // 1 narration_start + 3 chunks
    expect(sentMessages).toHaveLength(4);
    expect(sentMessages[0].message.type).toBe('narration_start');
    expect(sentMessages[1].message).toEqual({
      type: 'narration_chunk',
      sessionId: 'session-1',
      text: 'The ',
      index: 0,
    });
    expect(sentMessages[3].message).toEqual({
      type: 'narration_chunk',
      sessionId: 'session-1',
      text: 'roars.',
      index: 2,
    });
  });
});
