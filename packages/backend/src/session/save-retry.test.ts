import { describe, it, expect, vi } from 'vitest';
import {
  SaveRetryService,
  computeBackoff,
  MAX_RETRIES,
  MAX_BACKOFF_MS,
  type SaveOperation,
  type DelayFn,
} from './save-retry.js';
import type { SessionState, SaveResult } from '@trixy/shared';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSessionState(overrides?: Partial<SessionState>): SessionState {
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
    conversation: [],
    currentScene: {
      locationName: 'Tavern',
      description: 'A cozy tavern.',
      presentNPCs: ['Bartender'],
    },
    lastSavedAt: new Date(2024, 0, 1),
    ...overrides,
  };
}

/** A no-op delay for testing (resolves immediately). */
const instantDelay: DelayFn = async () => {};

function makeSaveOp(results: SaveResult[]): SaveOperation {
  let callIndex = 0;
  return {
    saveSessionState: async () => {
      const result = results[callIndex] ?? results[results.length - 1];
      callIndex++;
      return result;
    },
  };
}

// ─── computeBackoff ──────────────────────────────────────────────────────────

describe('computeBackoff', () => {
  it('returns 1000ms for attempt 0', () => {
    expect(computeBackoff(0)).toBe(1000);
  });

  it('returns 2000ms for attempt 1', () => {
    expect(computeBackoff(1)).toBe(2000);
  });

  it('returns 4000ms for attempt 2', () => {
    expect(computeBackoff(2)).toBe(4000);
  });

  it('caps at MAX_BACKOFF_MS for higher attempts', () => {
    expect(computeBackoff(3)).toBe(MAX_BACKOFF_MS);
    expect(computeBackoff(10)).toBe(MAX_BACKOFF_MS);
  });

  it('never exceeds 5000ms', () => {
    for (let i = 0; i < 20; i++) {
      expect(computeBackoff(i)).toBeLessThanOrEqual(5000);
    }
  });
});

// ─── SaveRetryService.save ───────────────────────────────────────────────────

describe('SaveRetryService.save', () => {
  it('returns ok on first successful save', async () => {
    const saveOp = makeSaveOp([{ kind: 'ok', savedAt: new Date() }]);
    const service = new SaveRetryService(saveOp, instantDelay);
    const state = makeSessionState();

    const result = await service.save(state);

    expect(result.kind).toBe('ok');
  });

  it('clears unsaved state on success', async () => {
    const saveOp = makeSaveOp([
      { kind: 'transient_error', retryAfterMs: 1000 },
      { kind: 'ok', savedAt: new Date() },
    ]);
    const service = new SaveRetryService(saveOp, instantDelay);
    const state = makeSessionState();

    await service.save(state);

    expect(service.getUnsavedState()).toBeNull();
  });

  it('retries on transient_error and succeeds on second attempt', async () => {
    const saveOp = makeSaveOp([
      { kind: 'transient_error', retryAfterMs: 1000 },
      { kind: 'ok', savedAt: new Date() },
    ]);
    const service = new SaveRetryService(saveOp, instantDelay);
    const state = makeSessionState();

    const result = await service.save(state);

    expect(result.kind).toBe('ok');
  });

  it('retries up to 3 times on transient errors then returns permanent_error', async () => {
    const callCount = vi.fn();
    const saveOp: SaveOperation = {
      saveSessionState: async () => {
        callCount();
        return { kind: 'transient_error', retryAfterMs: 1000 };
      },
    };
    const service = new SaveRetryService(saveOp, instantDelay);
    const state = makeSessionState();

    const result = await service.save(state);

    expect(result.kind).toBe('permanent_error');
    // Initial attempt + 3 retries = 4 total calls
    expect(callCount).toHaveBeenCalledTimes(MAX_RETRIES + 1);
  });

  it('caches unsaved state after exhausted retries', async () => {
    const saveOp = makeSaveOp([
      { kind: 'transient_error', retryAfterMs: 1000 },
      { kind: 'transient_error', retryAfterMs: 2000 },
      { kind: 'transient_error', retryAfterMs: 3000 },
      { kind: 'transient_error', retryAfterMs: 4000 },
    ]);
    const service = new SaveRetryService(saveOp, instantDelay);
    const state = makeSessionState();

    await service.save(state);

    expect(service.getUnsavedState()).toEqual(state);
  });

  it('returns permanent_error immediately without retrying', async () => {
    const callCount = vi.fn();
    const saveOp: SaveOperation = {
      saveSessionState: async () => {
        callCount();
        return { kind: 'permanent_error', reason: 'Disk full' };
      },
    };
    const service = new SaveRetryService(saveOp, instantDelay);
    const state = makeSessionState();

    const result = await service.save(state);

    expect(result.kind).toBe('permanent_error');
    if (result.kind === 'permanent_error') {
      expect(result.reason).toBe('Disk full');
    }
    // Only 1 call — no retries for permanent errors
    expect(callCount).toHaveBeenCalledTimes(1);
  });

  it('caches unsaved state on permanent_error', async () => {
    const saveOp = makeSaveOp([
      { kind: 'permanent_error', reason: 'Disk full' },
    ]);
    const service = new SaveRetryService(saveOp, instantDelay);
    const state = makeSessionState();

    await service.save(state);

    expect(service.getUnsavedState()).toEqual(state);
  });

  it('calls delay with correct backoff values between retries', async () => {
    const delays: number[] = [];
    const trackingDelay: DelayFn = async (ms) => {
      delays.push(ms);
    };
    const saveOp = makeSaveOp([
      { kind: 'transient_error', retryAfterMs: 1000 },
      { kind: 'transient_error', retryAfterMs: 1000 },
      { kind: 'transient_error', retryAfterMs: 1000 },
      { kind: 'transient_error', retryAfterMs: 1000 },
    ]);
    const service = new SaveRetryService(saveOp, trackingDelay);
    const state = makeSessionState();

    await service.save(state);

    // 3 delays (between attempts 0→1, 1→2, 2→3)
    expect(delays).toHaveLength(3);
    expect(delays[0]).toBe(1000);
    expect(delays[1]).toBe(2000);
    expect(delays[2]).toBe(4000);
  });

  it('all backoff delays are <= 5000ms', async () => {
    const delays: number[] = [];
    const trackingDelay: DelayFn = async (ms) => {
      delays.push(ms);
    };
    const saveOp = makeSaveOp([
      { kind: 'transient_error', retryAfterMs: 1000 },
      { kind: 'transient_error', retryAfterMs: 1000 },
      { kind: 'transient_error', retryAfterMs: 1000 },
      { kind: 'transient_error', retryAfterMs: 1000 },
    ]);
    const service = new SaveRetryService(saveOp, trackingDelay);
    const state = makeSessionState();

    await service.save(state);

    for (const d of delays) {
      expect(d).toBeLessThanOrEqual(5000);
    }
  });

  it('succeeds on third retry attempt', async () => {
    const saveOp = makeSaveOp([
      { kind: 'transient_error', retryAfterMs: 1000 },
      { kind: 'transient_error', retryAfterMs: 2000 },
      { kind: 'transient_error', retryAfterMs: 3000 },
      { kind: 'ok', savedAt: new Date() },
    ]);
    const service = new SaveRetryService(saveOp, instantDelay);
    const state = makeSessionState();

    const result = await service.save(state);

    expect(result.kind).toBe('ok');
    expect(service.getUnsavedState()).toBeNull();
  });

  it('replaces cached state on subsequent failed save', async () => {
    const saveOp = makeSaveOp([
      { kind: 'permanent_error', reason: 'fail' },
    ]);
    const service = new SaveRetryService(saveOp, instantDelay);

    const state1 = makeSessionState({ campaignId: 'c1' });
    const state2 = makeSessionState({ campaignId: 'c2' });

    await service.save(state1);
    expect(service.getUnsavedState()?.campaignId).toBe('c1');

    await service.save(state2);
    expect(service.getUnsavedState()?.campaignId).toBe('c2');
  });
});

// ─── SaveRetryService.getUnsavedState ────────────────────────────────────────

describe('SaveRetryService.getUnsavedState', () => {
  it('returns null initially', () => {
    const saveOp = makeSaveOp([]);
    const service = new SaveRetryService(saveOp, instantDelay);

    expect(service.getUnsavedState()).toBeNull();
  });

  it('returns null after a successful save', async () => {
    const saveOp = makeSaveOp([{ kind: 'ok', savedAt: new Date() }]);
    const service = new SaveRetryService(saveOp, instantDelay);
    const state = makeSessionState();

    await service.save(state);

    expect(service.getUnsavedState()).toBeNull();
  });

  it('returns the state after a failed save', async () => {
    const saveOp = makeSaveOp([
      { kind: 'permanent_error', reason: 'fail' },
    ]);
    const service = new SaveRetryService(saveOp, instantDelay);
    const state = makeSessionState();

    await service.save(state);

    expect(service.getUnsavedState()).toEqual(state);
  });

  it('preserves the full state in cache including conversation', async () => {
    const saveOp = makeSaveOp([
      { kind: 'permanent_error', reason: 'fail' },
    ]);
    const service = new SaveRetryService(saveOp, instantDelay);
    const state = makeSessionState({
      conversation: [
        {
          id: 'msg-1',
          campaignId: 'campaign-1',
          role: 'player',
          text: 'Hello world',
          origin: 'text',
          createdAt: new Date(2024, 0, 1),
        },
      ],
    });

    await service.save(state);

    const cached = service.getUnsavedState();
    expect(cached?.conversation).toHaveLength(1);
    expect(cached?.conversation[0].text).toBe('Hello world');
  });
});
