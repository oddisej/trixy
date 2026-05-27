/**
 * Placeholder hook for REST API calls.
 * Provides typed methods for interacting with the backend API.
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

/**
 * Hook providing REST API access. Currently a placeholder that returns
 * structured errors — will be connected to the real backend.
 */
export function useApi(): ApiHook {
  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }
    return res.json() as Promise<T>;
  }

  return {
    login: (email, password) =>
      request<AuthResult>('POST', '/auth/login', { email, password }),

    loginWithProvider: (provider) =>
      request<AuthResult>('POST', `/auth/oauth/${provider}`),

    register: (email, password) =>
      request<AuthResult>('POST', '/auth/register', { email, password }),

    listCampaigns: () =>
      request<Campaign[]>('GET', '/campaigns'),

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
