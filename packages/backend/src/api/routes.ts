/**
 * API Route Definitions
 *
 * Defines the REST API routes for the backend gateway.
 * Each route maps an HTTP method + path to a handler that delegates
 * to the appropriate service layer.
 *
 * Requirements: 1.1, 6.1, 6.2, 6.3, 7.1, 10.3
 */

import type { AuthResult, Campaign, SessionState } from '@trixy/shared';
import type { AuthService } from '../auth/auth-service.js';
import type { CampaignManager } from '../session/campaign-manager.js';
import type { SessionService } from '../session/session-service.js';
import type { GameEngine, EngineResponse, PlayerMessageInput } from '../game-engine/game-engine.js';
import type { JwtProvider } from './middleware.js';
import { authenticateRequest } from './middleware.js';

// ─── Request/Response Types ──────────────────────────────────────────────────

export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  headers: Record<string, string | undefined>;
  params: Record<string, string>;
  body: unknown;
}

export interface ApiResponse {
  status: number;
  body: unknown;
}

/** Route handler function signature. */
export type RouteHandler = (req: ApiRequest) => Promise<ApiResponse>;

/** Route definition linking method + path pattern to a handler. */
export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  handler: RouteHandler;
  requiresAuth: boolean;
}

// ─── Service Dependencies ────────────────────────────────────────────────────

export interface ApiDependencies {
  authService: AuthService;
  campaignManager: CampaignManager;
  sessionService: SessionService;
  gameEngine: GameEngine;
  jwtProvider: JwtProvider;
}

// ─── Route Factory ───────────────────────────────────────────────────────────

/**
 * Creates all route definitions for the API gateway.
 * Routes are grouped by domain: Auth, Campaigns, Sessions, Messages.
 */
export function createRoutes(deps: ApiDependencies): RouteDefinition[] {
  return [
    // ─── Auth Routes (public) ──────────────────────────────────────────
    {
      method: 'POST',
      path: '/auth/register',
      requiresAuth: false,
      handler: createRegisterHandler(deps),
    },
    {
      method: 'POST',
      path: '/auth/login',
      requiresAuth: false,
      handler: createLoginHandler(deps),
    },
    {
      method: 'POST',
      path: '/auth/oauth/:provider',
      requiresAuth: false,
      handler: createOAuthHandler(deps),
    },

    // ─── Campaign Routes (authenticated) ───────────────────────────────
    {
      method: 'GET',
      path: '/campaigns',
      requiresAuth: true,
      handler: createListCampaignsHandler(deps),
    },
    {
      method: 'POST',
      path: '/campaigns',
      requiresAuth: true,
      handler: createCreateCampaignHandler(deps),
    },

    // ─── Session Routes (authenticated) ────────────────────────────────
    {
      method: 'POST',
      path: '/characters',
      requiresAuth: true,
      handler: createCharacterHandler(deps),
    },

    {
      method: 'GET',
      path: '/sessions/:campaignId',
      requiresAuth: true,
      handler: createLoadSessionHandler(deps),
    },

    // ─── Message Routes (authenticated) ────────────────────────────────
    {
      method: 'POST',
      path: '/sessions/:sessionId/messages',
      requiresAuth: true,
      handler: createHandleMessageHandler(deps),
    },
  ];
}

// ─── Auth Handlers ───────────────────────────────────────────────────────────

function createRegisterHandler(deps: ApiDependencies): RouteHandler {
  return async (req: ApiRequest): Promise<ApiResponse> => {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      return { status: 400, body: { error: 'email and password are required' } };
    }

    const result: AuthResult = await deps.authService.register({ email, password });
    return mapAuthResult(result, deps.jwtProvider);
  };
}

function createLoginHandler(deps: ApiDependencies): RouteHandler {
  return async (req: ApiRequest): Promise<ApiResponse> => {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      return { status: 400, body: { error: 'email and password are required' } };
    }

    const result: AuthResult = await deps.authService.login({ email, password });
    return mapAuthResult(result, deps.jwtProvider);
  };
}

function createOAuthHandler(deps: ApiDependencies): RouteHandler {
  return async (req: ApiRequest): Promise<ApiResponse> => {
    const provider = req.params.provider as 'google' | 'apple';
    const { idToken } = req.body as { idToken: string };

    if (!provider || !idToken) {
      return { status: 400, body: { error: 'provider and idToken are required' } };
    }

    if (provider !== 'google' && provider !== 'apple') {
      return { status: 400, body: { error: 'provider must be google or apple' } };
    }

    const result: AuthResult = await deps.authService.loginWithProvider(provider, idToken);
    return mapAuthResult(result, deps.jwtProvider);
  };
}

// ─── Campaign Handlers ───────────────────────────────────────────────────────

function createListCampaignsHandler(deps: ApiDependencies): RouteHandler {
  return async (req: ApiRequest): Promise<ApiResponse> => {
    const authResult = authenticateRequest(deps.jwtProvider, req.headers.authorization);
    if (authResult.kind !== 'valid') {
      return mapAuthError(authResult.kind);
    }

    const campaigns: Campaign[] = await deps.campaignManager.listCampaigns(
      authResult.context.userId,
    );
    return { status: 200, body: { campaigns } };
  };
}

function createCreateCampaignHandler(deps: ApiDependencies): RouteHandler {
  return async (req: ApiRequest): Promise<ApiResponse> => {
    const authResult = authenticateRequest(deps.jwtProvider, req.headers.authorization);
    if (authResult.kind !== 'valid') {
      return mapAuthError(authResult.kind);
    }

    const { characterId, title, setting, worldState } = req.body as {
      characterId: string;
      title: string;
      setting: unknown;
      worldState: unknown;
    };

    if (!characterId || !title) {
      return { status: 400, body: { error: 'characterId and title are required' } };
    }

    const result = await deps.campaignManager.createCampaign(authResult.context.userId, {
      characterId,
      title,
      setting: setting as any,
      worldState: worldState as any,
    });

    if ('kind' in result && result.kind === 'capacity_exceeded') {
      return { status: 409, body: { error: 'capacity_exceeded', message: 'Maximum campaigns reached' } };
    }

    return { status: 201, body: { campaign: result } };
  };
}

// ─── Character Handlers ──────────────────────────────────────────────────────

function createCharacterHandler(deps: ApiDependencies): RouteHandler {
  return async (req: ApiRequest): Promise<ApiResponse> => {
    const authResult = authenticateRequest(deps.jwtProvider, req.headers.authorization);
    if (authResult.kind !== 'valid') {
      return mapAuthError(authResult.kind);
    }

    const { name, race, class: charClass, attributes, backgroundStory } = req.body as {
      name: string;
      race: string;
      class: string;
      attributes: Record<string, number>;
      backgroundStory?: string;
    };

    if (!name || !race || !charClass || !attributes) {
      return { status: 400, body: { error: 'name, race, class, and attributes are required' } };
    }

    // Create character in-memory
    const character = {
      id: crypto.randomUUID(),
      userId: authResult.context.userId,
      name,
      race,
      class: charClass,
      level: 1,
      experience: 0,
      attributes,
      abilities: [],
      inventory: [],
      backgroundStory: backgroundStory ?? '',
    };

    return { status: 201, body: character };
  };
}

// ─── Session Handlers ────────────────────────────────────────────────────────

function createLoadSessionHandler(deps: ApiDependencies): RouteHandler {
  return async (req: ApiRequest): Promise<ApiResponse> => {
    const authResult = authenticateRequest(deps.jwtProvider, req.headers.authorization);
    if (authResult.kind !== 'valid') {
      return mapAuthError(authResult.kind);
    }

    const { campaignId } = req.params;
    if (!campaignId) {
      return { status: 400, body: { error: 'campaignId is required' } };
    }

    const session: SessionState | null = await deps.sessionService.loadSession(
      authResult.context.userId,
      campaignId,
    );

    if (!session) {
      return { status: 404, body: { error: 'session_not_found' } };
    }

    return { status: 200, body: { session } };
  };
}

// ─── Message Handlers ────────────────────────────────────────────────────────

function createHandleMessageHandler(deps: ApiDependencies): RouteHandler {
  return async (req: ApiRequest): Promise<ApiResponse> => {
    const authResult = authenticateRequest(deps.jwtProvider, req.headers.authorization);
    if (authResult.kind !== 'valid') {
      return mapAuthError(authResult.kind);
    }

    const { sessionId } = req.params;
    const { text, origin } = req.body as { text: string; origin?: 'text' | 'voice' };

    if (!sessionId || !text) {
      return { status: 400, body: { error: 'sessionId and text are required' } };
    }

    const input: PlayerMessageInput = {
      sessionId,
      rawText: text,
      origin: origin ?? 'text',
    };

    const response: EngineResponse = await deps.gameEngine.handlePlayerMessage(input);
    return mapEngineResponse(response);
  };
}

// ─── Response Mappers ────────────────────────────────────────────────────────

function mapAuthResult(result: AuthResult, jwtProvider?: JwtProvider): ApiResponse {
  switch (result.kind) {
    case 'ok': {
      // Sign a proper JWT token if provider is available
      const token = jwtProvider
        ? jwtProvider.sign({ userId: result.userId })
        : result.accessToken;
      return {
        status: 200,
        body: {
          kind: 'ok',
          userId: result.userId,
          accessToken: token,
          refreshToken: result.refreshToken,
        },
      };
    }
    case 'invalid_credentials':
      return { status: 401, body: { kind: 'invalid_credentials' } };
    case 'account_locked':
      return {
        status: 423,
        body: { kind: 'account_locked', remainingSeconds: result.remainingSeconds },
      };
    case 'email_in_use':
      return { status: 409, body: { kind: 'email_in_use' } };
    case 'invalid_email_format':
      return { status: 422, body: { kind: 'invalid_email_format' } };
    case 'invalid_password_format':
      return { status: 422, body: { kind: 'invalid_password_format' } };
    case 'provider_unavailable':
      return { status: 503, body: { kind: 'provider_unavailable' } };
  }
}

function mapAuthError(kind: 'expired' | 'invalid' | 'missing'): ApiResponse {
  switch (kind) {
    case 'missing':
      return { status: 401, body: { error: 'authorization_required' } };
    case 'expired':
      return { status: 401, body: { error: 'token_expired' } };
    case 'invalid':
      return { status: 401, body: { error: 'invalid_token' } };
  }
}

function mapEngineResponse(response: EngineResponse): ApiResponse {
  switch (response.kind) {
    case 'narration':
      return {
        status: 200,
        body: { kind: 'narration', text: response.text, mechanics: response.mechanics },
      };
    case 'input_rejected':
      return { status: 422, body: { kind: 'input_rejected', reason: response.reason } };
    case 'temporarily_unavailable':
      return { status: 503, body: { kind: 'temporarily_unavailable', retryable: true } };
    case 'safe_fallback':
      return { status: 200, body: { kind: 'safe_fallback', text: response.text } };
  }
}
