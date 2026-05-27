import { describe, it, expect } from 'vitest';
import {
  validateCampaignSeed,
  generateCampaignSeed,
  type CampaignSeed,
  type LLMCampaignProvider,
} from './campaign-seed.js';
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

/** Creates a mock provider that returns the given seeds in sequence. */
function mockProvider(seeds: CampaignSeed[]): LLMCampaignProvider {
  let callIndex = 0;
  return {
    generateSeed: async (_prompt: string): Promise<CampaignSeed> => {
      const seed = seeds[callIndex];
      callIndex++;
      return seed;
    },
  };
}

describe('validateCampaignSeed', () => {
  it('returns valid for a correct seed', () => {
    const seed = makeValidSeed();
    const result = validateCampaignSeed(seed);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects seed with no locations', () => {
    const seed = makeValidSeed({ locations: [] });
    const result = validateCampaignSeed(seed);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Must contain at least 1 location');
  });

  it('rejects seed with no NPCs', () => {
    const seed = makeValidSeed({ npcs: [] });
    const result = validateCampaignSeed(seed);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Must contain at least 1 named NPC');
  });

  it('rejects seed where all NPCs have empty names', () => {
    const seed = makeValidSeed({ npcs: [makeNPC({ name: '   ' })] });
    const result = validateCampaignSeed(seed);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('At least 1 NPC must have a non-empty name');
  });

  it('rejects seed with empty plotHook', () => {
    const seed = makeValidSeed({ plotHook: '' });
    const result = validateCampaignSeed(seed);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('plotHook must not be empty');
  });

  it('rejects seed with whitespace-only plotHook', () => {
    const seed = makeValidSeed({ plotHook: '   \t\n  ' });
    const result = validateCampaignSeed(seed);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('plotHook must not be empty');
  });

  it('rejects seed with fewer than 3 quest directions', () => {
    const seed = makeValidSeed({
      questDirections: ['One quest.', 'Two quests.'],
    });
    const result = validateCampaignSeed(seed);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Must contain at least 3 quest directions');
  });

  it('rejects quest direction with 0 sentences', () => {
    const seed = makeValidSeed({
      questDirections: [
        'Valid quest direction.',
        'Another valid one.',
        'no sentence ending here',
      ],
    });
    const result = validateCampaignSeed(seed);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Quest direction 3');
    expect(result.errors[0]).toContain('0');
  });

  it('rejects quest direction with more than 2 sentences', () => {
    const seed = makeValidSeed({
      questDirections: [
        'Valid quest direction.',
        'Another valid one.',
        'First sentence. Second sentence. Third sentence.',
      ],
    });
    const result = validateCampaignSeed(seed);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Quest direction 3');
    expect(result.errors[0]).toContain('3');
  });

  it('accepts quest directions with exactly 1 sentence', () => {
    const seed = makeValidSeed({
      questDirections: [
        'One sentence quest.',
        'Another single sentence!',
        'A third quest direction?',
      ],
    });
    const result = validateCampaignSeed(seed);
    expect(result.valid).toBe(true);
  });

  it('accepts quest directions with exactly 2 sentences', () => {
    const seed = makeValidSeed({
      questDirections: [
        'First sentence. Second sentence.',
        'Go north! Find the treasure.',
        'Who stole the crown? Investigate the castle.',
      ],
    });
    const result = validateCampaignSeed(seed);
    expect(result.valid).toBe(true);
  });

  it('collects multiple errors at once', () => {
    const seed: CampaignSeed = {
      locations: [],
      npcs: [],
      plotHook: '',
      questDirections: [],
    };
    const result = validateCampaignSeed(seed);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
  });
});

describe('generateCampaignSeed', () => {
  it('returns the seed on first attempt if valid', async () => {
    const validSeed = makeValidSeed();
    const provider = mockProvider([validSeed]);

    const result = await generateCampaignSeed(provider);

    expect(result).toEqual(validSeed);
  });

  it('retries once with correction prompt if first attempt is invalid', async () => {
    const invalidSeed = makeValidSeed({ locations: [] });
    const validSeed = makeValidSeed();
    const prompts: string[] = [];

    const provider: LLMCampaignProvider = {
      generateSeed: async (prompt: string): Promise<CampaignSeed> => {
        prompts.push(prompt);
        if (prompts.length === 1) return invalidSeed;
        return validSeed;
      },
    };

    const result = await generateCampaignSeed(provider);

    expect(result).toEqual(validSeed);
    expect(prompts).toHaveLength(2);
    expect(prompts[1]).toContain('invalid');
    expect(prompts[1]).toContain('at least 1 location');
  });

  it('throws an error if both attempts produce invalid seeds', async () => {
    const invalidSeed1 = makeValidSeed({ locations: [] });
    const invalidSeed2 = makeValidSeed({ npcs: [] });
    const provider = mockProvider([invalidSeed1, invalidSeed2]);

    await expect(generateCampaignSeed(provider)).rejects.toThrow(
      'Campaign seed generation failed after retry',
    );
  });

  it('does not retry if first attempt is valid', async () => {
    let callCount = 0;
    const validSeed = makeValidSeed();

    const provider: LLMCampaignProvider = {
      generateSeed: async (_prompt: string): Promise<CampaignSeed> => {
        callCount++;
        return validSeed;
      },
    };

    await generateCampaignSeed(provider);

    expect(callCount).toBe(1);
  });

  it('passes the correction prompt with specific errors on retry', async () => {
    const seedMissingPlotHook = makeValidSeed({ plotHook: '' });
    const validSeed = makeValidSeed();
    const prompts: string[] = [];

    const provider: LLMCampaignProvider = {
      generateSeed: async (prompt: string): Promise<CampaignSeed> => {
        prompts.push(prompt);
        if (prompts.length === 1) return seedMissingPlotHook;
        return validSeed;
      },
    };

    await generateCampaignSeed(provider);

    expect(prompts[1]).toContain('plotHook must not be empty');
  });

  it('includes all validation errors in the thrown error message', async () => {
    const badSeed: CampaignSeed = {
      locations: [],
      npcs: [],
      plotHook: '',
      questDirections: [],
    };
    const provider = mockProvider([badSeed, badSeed]);

    try {
      await generateCampaignSeed(provider);
      expect.fail('Should have thrown');
    } catch (err) {
      const message = (err as Error).message;
      expect(message).toContain('at least 1 location');
      expect(message).toContain('at least 1 named NPC');
      expect(message).toContain('plotHook must not be empty');
      expect(message).toContain('at least 3 quest directions');
    }
  });
});
