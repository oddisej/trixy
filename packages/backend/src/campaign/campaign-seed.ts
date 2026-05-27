/**
 * Campaign-Seed-Generierung.
 *
 * Generates the initial seed for a new campaign by calling an LLM provider,
 * validating the result, and retrying once with a correction prompt if invalid.
 *
 * Validation rules:
 * - At least 1 location
 * - At least 1 named NPC
 * - Non-empty plotHook
 * - At least 3 quest directions, each 1–2 sentences
 */

import type { Location, NPCProfile } from '@trixy/shared';

/** The seed data for a new campaign. */
export interface CampaignSeed {
  locations: Location[];
  npcs: NPCProfile[];
  plotHook: string;
  questDirections: string[];
}

/** Interface for the LLM provider that generates campaign seeds. */
export interface LLMCampaignProvider {
  generateSeed(prompt: string): Promise<CampaignSeed>;
}

/** Validation result for a campaign seed. */
export interface CampaignSeedValidation {
  valid: boolean;
  errors: string[];
}

/**
 * Counts the number of sentences in a string.
 * A sentence ends with '.', '!', or '?'.
 */
function countSentences(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  const matches = trimmed.match(/[.!?]+/g);
  return matches ? matches.length : 0;
}

/**
 * Validates a campaign seed against the structural requirements.
 *
 * Rules:
 * - locations: at least 1
 * - npcs: at least 1 with a non-empty name
 * - plotHook: non-empty (after trimming)
 * - questDirections: at least 3 entries, each 1–2 sentences
 */
export function validateCampaignSeed(seed: CampaignSeed): CampaignSeedValidation {
  const errors: string[] = [];

  if (!seed.locations || seed.locations.length < 1) {
    errors.push('Must contain at least 1 location');
  }

  if (!seed.npcs || seed.npcs.length < 1) {
    errors.push('Must contain at least 1 named NPC');
  } else {
    const hasNamedNPC = seed.npcs.some((npc) => npc.name.trim().length > 0);
    if (!hasNamedNPC) {
      errors.push('At least 1 NPC must have a non-empty name');
    }
  }

  if (!seed.plotHook || seed.plotHook.trim().length === 0) {
    errors.push('plotHook must not be empty');
  }

  if (!seed.questDirections || seed.questDirections.length < 3) {
    errors.push('Must contain at least 3 quest directions');
  } else {
    for (let i = 0; i < seed.questDirections.length; i++) {
      const direction = seed.questDirections[i];
      const sentences = countSentences(direction);
      if (sentences < 1 || sentences > 2) {
        errors.push(
          `Quest direction ${i + 1} must contain 1–2 sentences, but has ${sentences}`,
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/** The initial prompt sent to the LLM to generate a campaign seed. */
const INITIAL_PROMPT = `Generate a campaign seed for a D&D-style role-playing game. Return a structured result with:
- locations: at least 1 location with id, name, and description
- npcs: at least 1 named NPC with id, name, personalityTraits, background, knowledgeBoundaries, speechPatterns, and empty interactionHistory
- plotHook: a non-empty string describing the central conflict
- questDirections: at least 3 quest descriptions, each exactly 1–2 sentences long`;

/**
 * Builds a correction prompt from validation errors.
 */
function buildCorrectionPrompt(errors: string[]): string {
  return `The previous campaign seed was invalid. Please fix the following issues and regenerate:
${errors.map((e) => `- ${e}`).join('\n')}

Remember:
- At least 1 location with id, name, and description
- At least 1 named NPC with id, name, personalityTraits, background, knowledgeBoundaries, speechPatterns, and empty interactionHistory
- A non-empty plotHook describing the central conflict
- At least 3 quest directions, each exactly 1–2 sentences long`;
}

/**
 * Generates a campaign seed by calling the LLM provider.
 *
 * 1. Calls the provider with the initial prompt
 * 2. Validates the result
 * 3. If invalid, retries once with a correction prompt
 * 4. If still invalid after retry, throws an error
 */
export async function generateCampaignSeed(
  provider: LLMCampaignProvider,
): Promise<CampaignSeed> {
  // First attempt
  const firstResult = await provider.generateSeed(INITIAL_PROMPT);
  const firstValidation = validateCampaignSeed(firstResult);

  if (firstValidation.valid) {
    return firstResult;
  }

  // Retry once with correction prompt
  const correctionPrompt = buildCorrectionPrompt(firstValidation.errors);
  const secondResult = await provider.generateSeed(correctionPrompt);
  const secondValidation = validateCampaignSeed(secondResult);

  if (secondValidation.valid) {
    return secondResult;
  }

  throw new Error(
    `Campaign seed generation failed after retry. Errors: ${secondValidation.errors.join('; ')}`,
  );
}
