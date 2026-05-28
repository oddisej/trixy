/**
 * Placeholder hook for REST API calls.
 * Will be connected to the backend API Gateway once available.
 */

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

interface UseApiReturn {
  login(email: string, password: string): Promise<ApiResponse<{ accessToken: string }>>;
  loginWithProvider(provider: 'google' | 'apple'): Promise<ApiResponse<{ accessToken: string }>>;
  register(email: string, password: string): Promise<ApiResponse<{ accessToken: string }>>;
  createCharacter(input: {
    name: string;
    race: string;
    characterClass: string;
    attributes: Record<string, number>;
    backgroundStory: string;
  }): Promise<ApiResponse<{ characterId: string }>>;
  listCampaigns(): Promise<ApiResponse<{ campaigns: Array<{ id: string; title: string; lastPlayedAt: string }> }>>;
  createCampaign(characterId: string): Promise<ApiResponse<{ campaignId: string }>>;
  sendMessage(sessionId: string, text: string, origin: 'text' | 'voice'): Promise<ApiResponse<{
    narration: string;
    diceResult?: {
      rollResult: number;
      modifier: number;
      difficulty: number;
      total: number;
      succeeded: boolean;
    };
  }>>;
  loadSession(campaignId: string): Promise<ApiResponse<{ sessionId: string; messages: Array<{ role: string; text: string }> }>>;
}

export function useApi(): UseApiReturn {
  // TODO: configure baseUrl from environment

  async function request<T>(_endpoint: string, _options?: RequestInit): Promise<ApiResponse<T>> {
    // Placeholder implementation — will be replaced with actual fetch calls
    return { data: null, error: 'API not connected', loading: false };
  }

  return {
    async login(email: string, password: string) {
      return request<{ accessToken: string }>('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
    },

    async loginWithProvider(provider: 'google' | 'apple') {
      return request<{ accessToken: string }>(`/auth/oauth/${provider}`, {
        method: 'POST',
      });
    },

    async register(email: string, password: string) {
      return request<{ accessToken: string }>('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
    },

    async createCharacter(input) {
      return request<{ characterId: string }>('/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
    },

    async listCampaigns() {
      return request<{ campaigns: Array<{ id: string; title: string; lastPlayedAt: string }> }>('/campaigns');
    },

    async createCampaign(characterId: string) {
      return request<{ campaignId: string }>('/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId }),
      });
    },

    async sendMessage(sessionId: string, text: string, origin: 'text' | 'voice') {
      return request<{
        narration: string;
        diceResult?: {
          rollResult: number;
          modifier: number;
          difficulty: number;
          total: number;
          succeeded: boolean;
        };
      }>(`/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, origin }),
      });
    },

    async loadSession(campaignId: string) {
      return request<{ sessionId: string; messages: Array<{ role: string; text: string }> }>(
        `/campaigns/${campaignId}/session`
      );
    },
  };
}
