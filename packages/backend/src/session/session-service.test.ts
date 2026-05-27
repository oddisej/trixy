import { describe, it, expect } from 'vitest';
import {
  SessionService,
  InMemorySessionStore,
  TransientStoreError,
  MAX_SESSION_MESSAGES,
  type SessionStore,
} from './session-service.js';
import type { SessionState, ConversationMessage } from '@trixy/shared';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeMessage(index: number, createdAt: Date): ConversationMessage {
  return {
    id: `msg-${index}`,
    campaignId: 'campaign-1',
    role: 'player',
    text: `Message ${index}`,
    origin: 'text',
    createdAt,
  };
}

function makeSessionState(
  messageCount: number,
  overrides?: Partial<SessionState>,
): SessionState {
  const messages = Array.from({ length: messageCount }, (_, i) =>
    makeMessage(i, new Date(2024, 0, 1, 0, i)),
  );

  return {
    campaignId: 'campaign-1',
    character: {
      id: 'char-1',
      userId: 'user-1',
      name: 'Thorin',
      race: 'dwarf',
      class: 'warrior',
      level: 5,
      experience: 1200,
      attributes: {
        strength: 16,
        dexterity: 10,
        intelligence: 8,
        charisma: 12,
      },
      abilities: [{ id: 'a1', name: 'Shield Bash', unlockedAtLevel: 1 }],
      inventory: [{ id: 'i1', name: 'Axe', quantity: 1 }],
      backgroundStory: 'A brave dwarf warrior.',
    },
    conversation: messages,
    currentScene: {
      locationName: 'Tavern',
      description: 'A cozy tavern.',
      presentNPCs: ['Bartender'],
    },
    lastSavedAt: new Date(2024, 0, 1),
    ...overrides,
  };
}

// ─── InMemorySessionStore ────────────────────────────────────────────────────

describe('InMemorySessionStore', () => {
  it('returns null for a non-existent session', async () => {
    const store = new InMemorySessionStore();
    const result = await store.load('user-1', 'campaign-1');
    expect(result).toBeNull();
  });

  it('saves and loads a session state', async () => {
    const store = new InMemorySessionStore();
    const state = makeSessionState(5);

    await store.save(state);
    const loaded = await store.load('user-1', 'campaign-1');

    expect(loaded).toEqual(state);
  });

  it('overwrites existing state on subsequent saves', async () => {
    const store = new InMemorySessionStore();
    const state1 = makeSessionState(5);
    const state2 = makeSessionState(10);

    await store.save(state1);
    await store.save(state2);
    const loaded = await store.load('user-1', 'campaign-1');

    expect(loaded?.conversation).toHaveLength(10);
  });

  it('isolates sessions by userId and campaignId', async () => {
    const store = new InMemorySessionStore();
    const state1 = makeSessionState(3);
    const state2 = makeSessionState(7, {
      campaignId: 'campaign-2',
      character: {
        ...makeSessionState(0).character,
        userId: 'user-1',
      },
    });

    await store.save(state1);
    await store.save(state2);

    const loaded1 = await store.load('user-1', 'campaign-1');
    const loaded2 = await store.load('user-1', 'campaign-2');

    expect(loaded1?.conversation).toHaveLength(3);
    expect(loaded2?.conversation).toHaveLength(7);
  });

  it('clears all stored data', async () => {
    const store = new InMemorySessionStore();
    await store.save(makeSessionState(5));
    store.clear();

    const loaded = await store.load('user-1', 'campaign-1');
    expect(loaded).toBeNull();
  });
});

// ─── SessionService.saveSessionState ─────────────────────────────────────────

describe('SessionService.saveSessionState', () => {
  it('returns ok with savedAt on successful save', async () => {
    const store = new InMemorySessionStore();
    const service = new SessionService(store);
    const state = makeSessionState(10);

    const result = await service.saveSessionState(state);

    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.savedAt).toBeInstanceOf(Date);
    }
  });

  it('truncates conversation to the last 200 messages', async () => {
    const store = new InMemorySessionStore();
    const service = new SessionService(store);
    const state = makeSessionState(300);

    await service.saveSessionState(state);
    const loaded = await store.load('user-1', 'campaign-1');

    expect(loaded?.conversation).toHaveLength(MAX_SESSION_MESSAGES);
  });

  it('keeps the 200 most recent messages (by createdAt)', async () => {
    const store = new InMemorySessionStore();
    const service = new SessionService(store);
    const state = makeSessionState(250);

    await service.saveSessionState(state);
    const loaded = await store.load('user-1', 'campaign-1');

    // Messages 50–249 should be kept (the 200 most recent)
    expect(loaded?.conversation[0].id).toBe('msg-50');
    expect(loaded?.conversation[199].id).toBe('msg-249');
  });

  it('preserves all messages when fewer than 200', async () => {
    const store = new InMemorySessionStore();
    const service = new SessionService(store);
    const state = makeSessionState(50);

    await service.saveSessionState(state);
    const loaded = await store.load('user-1', 'campaign-1');

    expect(loaded?.conversation).toHaveLength(50);
  });

  it('sorts unsorted messages by createdAt before truncating', async () => {
    const store = new InMemorySessionStore();
    const service = new SessionService(store);

    // Create messages in reverse chronological order
    const messages = Array.from({ length: 250 }, (_, i) =>
      makeMessage(i, new Date(2024, 0, 1, 0, 249 - i)),
    );
    const state = makeSessionState(0, { conversation: messages });

    await service.saveSessionState(state);
    const loaded = await store.load('user-1', 'campaign-1');

    // Should be sorted chronologically and contain the 200 most recent
    expect(loaded?.conversation).toHaveLength(200);
    for (let i = 1; i < loaded!.conversation.length; i++) {
      expect(loaded!.conversation[i].createdAt.getTime()).toBeGreaterThanOrEqual(
        loaded!.conversation[i - 1].createdAt.getTime(),
      );
    }
  });

  it('returns transient_error with retryAfterMs on transient failure', async () => {
    const failingStore: SessionStore = {
      save: async () => {
        throw new TransientStoreError('Connection timeout', 2000);
      },
      load: async () => null,
    };
    const service = new SessionService(failingStore);
    const state = makeSessionState(5);

    const result = await service.saveSessionState(state);

    expect(result.kind).toBe('transient_error');
    if (result.kind === 'transient_error') {
      expect(result.retryAfterMs).toBe(2000);
    }
  });

  it('returns permanent_error with reason on non-transient failure', async () => {
    const failingStore: SessionStore = {
      save: async () => {
        throw new Error('Disk full');
      },
      load: async () => null,
    };
    const service = new SessionService(failingStore);
    const state = makeSessionState(5);

    const result = await service.saveSessionState(state);

    expect(result.kind).toBe('permanent_error');
    if (result.kind === 'permanent_error') {
      expect(result.reason).toBe('Disk full');
    }
  });

  it('returns permanent_error for unknown thrown values', async () => {
    const failingStore: SessionStore = {
      save: async () => {
        throw 'something weird';
      },
      load: async () => null,
    };
    const service = new SessionService(failingStore);
    const state = makeSessionState(5);

    const result = await service.saveSessionState(state);

    expect(result.kind).toBe('permanent_error');
    if (result.kind === 'permanent_error') {
      expect(result.reason).toBe('Unknown error');
    }
  });

  it('does not mutate the original state', async () => {
    const store = new InMemorySessionStore();
    const service = new SessionService(store);
    const state = makeSessionState(250);
    const originalLength = state.conversation.length;

    await service.saveSessionState(state);

    expect(state.conversation).toHaveLength(originalLength);
  });
});

// ─── SessionService.loadSession ──────────────────────────────────────────────

describe('SessionService.loadSession', () => {
  it('returns null when no session exists', async () => {
    const store = new InMemorySessionStore();
    const service = new SessionService(store);

    const result = await service.loadSession('user-1', 'campaign-1');
    expect(result).toBeNull();
  });

  it('returns the full state with last 200 messages after save', async () => {
    const store = new InMemorySessionStore();
    const service = new SessionService(store);
    const state = makeSessionState(300);

    await service.saveSessionState(state);
    const loaded = await service.loadSession('user-1', 'campaign-1');

    expect(loaded).not.toBeNull();
    expect(loaded!.conversation).toHaveLength(MAX_SESSION_MESSAGES);
    expect(loaded!.character.name).toBe('Thorin');
    expect(loaded!.campaignId).toBe('campaign-1');
    expect(loaded!.currentScene.locationName).toBe('Tavern');
  });

  it('restores character data correctly', async () => {
    const store = new InMemorySessionStore();
    const service = new SessionService(store);
    const state = makeSessionState(10);

    await service.saveSessionState(state);
    const loaded = await service.loadSession('user-1', 'campaign-1');

    expect(loaded!.character).toEqual(state.character);
  });

  it('restores scene and pending dice roll', async () => {
    const store = new InMemorySessionStore();
    const service = new SessionService(store);
    const state = makeSessionState(5, {
      pendingDiceRoll: {
        rollResult: 15,
        modifier: 3,
        difficulty: 12,
        total: 18,
        succeeded: true,
      },
    });

    await service.saveSessionState(state);
    const loaded = await service.loadSession('user-1', 'campaign-1');

    expect(loaded!.pendingDiceRoll).toEqual({
      rollResult: 15,
      modifier: 3,
      difficulty: 12,
      total: 18,
      succeeded: true,
    });
    expect(loaded!.currentScene).toEqual(state.currentScene);
  });

  it('round-trips a session with exactly 200 messages', async () => {
    const store = new InMemorySessionStore();
    const service = new SessionService(store);
    const state = makeSessionState(200);

    await service.saveSessionState(state);
    const loaded = await service.loadSession('user-1', 'campaign-1');

    expect(loaded!.conversation).toHaveLength(200);
    expect(loaded!.conversation[0].id).toBe('msg-0');
    expect(loaded!.conversation[199].id).toBe('msg-199');
  });
});
