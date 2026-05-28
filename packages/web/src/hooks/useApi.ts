/**
 * Hook for REST API calls with automatic token management.
 * Stores the access token after login/register and includes it in subsequent requests.
 */

import type { AuthResult, Campaign, Character, ConversationMessage, SessionState } from '../types';

export interface ApiHook {
  /** Login with email and password */
  login(email: string, password: string): Promise<AuthResult>;
  /** Login with OAuth provider */
  loginWithProvider(provider: 'google' | 'apple'): Promise<AuthResult>;
  /** Register a new account */
  register(email: string, password: string): Promise<AuthResult>;
  /** Fetch campaigns for the current user */
  listCampaigns(): Promise<Campaign[]>;
  /** Create a new campaign with the given character */
  createCampaign(characterId: string, title: string): Promise<Campaign>;
  /** Load a session for a campaign */
  loadSession(campaignId: string): Promise<SessionState>;
  /** Send a player message in a session */
  sendMessage(sessionId: string, text: string): Promise<ConversationMessage>;
  /** Create a new character */
  createCharacter(character: Omit<Character, 'id' | 'userId' | 'level' | 'experience' | 'abilities' | 'inventory'>): Promise<Character>;
}

const API_BASE = '/api';

// Simple token store (shared across hook instances)
let accessToken: string | null = null;

function setToken(token: string | null) {
  accessToken = token;
}

/**
 * Hook providing REST API access with automatic auth token management.
 */
export function useApi(): ApiHook {
  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Auth endpoints return structured JSON even on 4xx — parse it
    const json = await res.json();
    if (!res.ok && !json.kind && !json.error) {
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }
    return json as T;
  }

  async function authRequest(method: string, path: string, body?: unknown): Promise<AuthResult> {
    const result = await request<AuthResult>(method, path, body);
    if (result.kind === 'ok') {
      setToken(result.accessToken);
    }
    return result;
  }

  return {
    login: (email, password) =>
      authRequest('POST', '/auth/login', { email, password }),

    loginWithProvider: (provider) =>
      authRequest('POST', `/auth/oauth/${provider}`),

    register: (email, password) =>
      authRequest('POST', '/auth/register', { email, password }),

    listCampaigns: async () => {
      const result = await request<{ campaigns: Campaign[] }>('GET', '/campaigns');
      return result.campaigns ?? [];
    },

    createCampaign: (characterId, title) =>
      request<Campaign>('POST', '/campaigns', { characterId, title }),

    loadSession: (campaignId) =>
      request<SessionState>('GET', `/sessions/${campaignId}`),

    sendMessage: (sessionId, text) =>
      request<ConversationMessage>('POST', `/sessions/${sessionId}/messages`, { text }),

    createCharacter: (character) =>
      request<Character>('POST', '/characters', character),
  };
}
