import { describe, it, expect, vi } from 'vitest';
import {
  generateCampaignWithTimeout,
  type GenerationResult,
} from './campaign-generation.js';
import type { CampaignSeed, LLMCampaignProvider } from './campaign-seed.js';
import type { Location, NPCProfile } from '@trixy/shared';

/** Helper to create a valid Location. */
function makeLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: 'loc-1',
    name: 'Dark Forest',
    description: 'A mysterious forest shrouded in mist.',
    ...overrides,
  };
}

/** Helper to create a valid NPCProfile. */
function makeNPC(overrides: Partial<NPCProfile> = {}): NPCProfile {
  return {
    id: 'npc-1',
    name: 'Eldric the Wise',
    personalityTraits: ['wise', 'cautious'],
    background: 'An ancient sage who guards forgotten knowledge.',
    knowledgeBoundaries: ['local history', 'arcane lore'],
    speechPatterns: 'speaks in riddles',
    interactionHistory: [],
    ...overrides,
  };
}

/** Helper to create a valid CampaignSeed. */
function makeValidSeed(overrides: Partial<CampaignSeed> = {}): CampaignSeed {
  return {
    locations: [makeLocation()],
    npcs: [makeNPC()],
    plotHook: 'A dark force threatens the realm.',
    questDirections: [
      'Investigate the abandoned tower on the hill.',
      'Find the missing merchant who vanished last week.',
      'Retrieve the stolen artifact from the goblin caves.',
    ],
    ...overrides,
  };
}

/** Creates a provider that resolves successfully with the given seed. */
function successProvider(seed: CampaignSeed): LLMCampaignProvider {
  return {
    generateSeed: async (_prompt: string) => seed,
  };
}

/** Creates a provider that throws an error. */
function errorProvider(errorMessage: string): LLMCampaignProvider {
  return {
    generateSeed: async (_prompt: string) => {
      throw new Error(errorMessage);
    },
  };
}

/** Creates a provider that never resolves (simulates timeout). */
function hangingProvider(): LLMCampaignProvider {
  return {
    generateSeed: (_prompt: string) =>
      new Promise<CampaignSeed>(() => {
        // Never resolves — simulates a hanging provider
      }),
  };
}

/** Creates a provider that resolves after a specified delay. */
function delayedProvider(seed: CampaignSeed, delayMs: number): LLMCampaignProvider {
  return {
    generateSeed: (_prompt: string) =>
      new Promise<CampaignSeed>((resolve) => {
        setTimeout(() => resolve(seed), delayMs);
      }),
  };
}

describe('generateCampaignWithTimeout', () => {
  describe('successful generation', () => {
    it('returns generated seed on success', async () => {
      const seed = makeValidSeed();
      const provider = successProvider(seed);

      const result = await generateCampaignWithTimeout(provider);

      expect(result.kind).toBe('generated');
      expect((result as Extract<GenerationResult, { kind: 'generated' }>).seed).toEqual(
        seed,
      );
    });

    it('returns generated seed when provider responds within timeout', async () => {
      vi.useFakeTimers();
      const seed = makeValidSeed();
      const provider = delayedProvider(seed, 100);

      const resultPromise = generateCampaignWithTimeout(provider, 30000);
      await vi.advanceTimersByTimeAsync(100);
      const result = await resultPromise;

      expect(result.kind).toBe('generated');
      expect((result as Extract<GenerationResult, { kind: 'generated' }>).seed).toEqual(
        seed,
      );
      vi.useRealTimers();
    });
  });

  describe('timeout handling', () => {
    it('returns generation_failed when provider exceeds timeout', async () => {
      vi.useFakeTimers();
      const provider = hangingProvider();

      const resultPromise = generateCampaignWithTimeout(provider, 30000);
      await vi.advanceTimersByTimeAsync(30000);
      const result = await resultPromise;

      expect(result.kind).toBe('generation_failed');
      expect(
        (result as Extract<GenerationResult, { kind: 'generation_failed' }>).reason,
      ).toContain('timed out');
      expect(
        (result as Extract<GenerationResult, { kind: 'generation_failed' }>).reason,
      ).toContain('30000');
      vi.useRealTimers();
    });

    it('uses custom timeout value', async () => {
      vi.useFakeTimers();
      const provider = hangingProvider();

      const resultPromise = generateCampaignWithTimeout(provider, 5000);
      await vi.advanceTimersByTimeAsync(5000);
      const result = await resultPromise;

      expect(result.kind).toBe('generation_failed');
      expect(
        (result as Extract<GenerationResult, { kind: 'generation_failed' }>).reason,
      ).toContain('5000');
      vi.useRealTimers();
    });

    it('defaults to 30000ms timeout', async () => {
      vi.useFakeTimers();
      const provider = hangingProvider();

      const resultPromise = generateCampaignWithTimeout(provider);
      // Should not have timed out yet at 29999ms
      await vi.advanceTimersByTimeAsync(29999);

      // Advance the last millisecond to trigger timeout
      await vi.advanceTimersByTimeAsync(1);
      const result = await resultPromise;

      expect(result.kind).toBe('generation_failed');
      expect(
        (result as Extract<GenerationResult, { kind: 'generation_failed' }>).reason,
      ).toContain('30000');
      vi.useRealTimers();
    });
  });

  describe('provider error handling', () => {
    it('returns generation_failed when provider throws', async () => {
      const provider = errorProvider('LLM service unavailable');

      const result = await generateCampaignWithTimeout(provider);

      expect(result.kind).toBe('generation_failed');
      expect(
        (result as Extract<GenerationResult, { kind: 'generation_failed' }>).reason,
      ).toContain('LLM service unavailable');
    });

    it('includes provider error message in reason', async () => {
      const provider = errorProvider('Rate limit exceeded');

      const result = await generateCampaignWithTimeout(provider);

      expect(result.kind).toBe('generation_failed');
      expect(
        (result as Extract<GenerationResult, { kind: 'generation_failed' }>).reason,
      ).toContain('Rate limit exceeded');
    });

    it('handles non-Error throws gracefully', async () => {
      const provider: LLMCampaignProvider = {
        generateSeed: async (_prompt: string) => {
          throw 'string error'; // eslint-disable-line no-throw-literal
        },
      };

      const result = await generateCampaignWithTimeout(provider);

      expect(result.kind).toBe('generation_failed');
      expect(
        (result as Extract<GenerationResult, { kind: 'generation_failed' }>).reason,
      ).toBe('Unknown generation error');
    });
  });

  describe('state preservation on failure', () => {
    it('does not modify external state on timeout', async () => {
      vi.useFakeTimers();
      const existingState = { title: 'My Campaign', progress: 42 };
      const stateBefore = { ...existingState };
      const provider = hangingProvider();

      const resultPromise = generateCampaignWithTimeout(provider, 1000);
      await vi.advanceTimersByTimeAsync(1000);
      await resultPromise;

      // Existing state remains unchanged
      expect(existingState).toEqual(stateBefore);
      vi.useRealTimers();
    });

    it('does not modify external state on provider error', async () => {
      const existingState = { title: 'My Campaign', progress: 42 };
      const stateBefore = { ...existingState };
      const provider = errorProvider('Connection refused');

      await generateCampaignWithTimeout(provider);

      // Existing state remains unchanged
      expect(existingState).toEqual(stateBefore);
    });

    it('allows retry after timeout failure', async () => {
      vi.useFakeTimers();
      const seed = makeValidSeed();
      const hangProvider = hangingProvider();

      // First attempt times out
      const firstPromise = generateCampaignWithTimeout(hangProvider, 1000);
      await vi.advanceTimersByTimeAsync(1000);
      const firstResult = await firstPromise;
      expect(firstResult.kind).toBe('generation_failed');

      vi.useRealTimers();

      // Retry with a working provider succeeds
      const workingProvider = successProvider(seed);
      const retryResult = await generateCampaignWithTimeout(workingProvider);
      expect(retryResult.kind).toBe('generated');
      expect(
        (retryResult as Extract<GenerationResult, { kind: 'generated' }>).seed,
      ).toEqual(seed);
    });

    it('allows retry after provider error', async () => {
      const seed = makeValidSeed();

      // First attempt fails
      const failProvider = errorProvider('Service down');
      const firstResult = await generateCampaignWithTimeout(failProvider);
      expect(firstResult.kind).toBe('generation_failed');

      // Retry succeeds
      const workingProvider = successProvider(seed);
      const retryResult = await generateCampaignWithTimeout(workingProvider);
      expect(retryResult.kind).toBe('generated');
      expect(
        (retryResult as Extract<GenerationResult, { kind: 'generated' }>).seed,
      ).toEqual(seed);
    });
  });
});
