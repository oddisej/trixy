/**
 * Campaign generation with timeout and error handling.
 *
 * Wraps the campaign seed generation with a configurable timeout (default 30s).
 * On failure (timeout or provider error), the existing campaign state remains unchanged.
 * The caller can retry without loss of existing campaign state.
 *
 * Requirement 3.5: If generation fails, display error and allow retry without loss of state.
 */

import type { CampaignSeed, LLMCampaignProvider } from './campaign-seed.js';
import { generateCampaignSeed } from './campaign-seed.js';

/** Result when campaign generation succeeds. */
export interface GenerationSuccess {
  kind: 'generated';
  seed: CampaignSeed;
}

/** Result when campaign generation fails (timeout or provider error). */
export interface GenerationFailure {
  kind: 'generation_failed';
  reason: string;
}

/** Discriminated union for campaign generation results. */
export type GenerationResult = GenerationSuccess | GenerationFailure;

/**
 * Wraps the generateCampaignSeed call with a timeout.
 *
 * Key properties:
 * - On success: returns { kind: 'generated', seed }
 * - On timeout (default 30s): returns { kind: 'generation_failed', reason }
 * - On provider error: returns { kind: 'generation_failed', reason }
 * - On failure, no external state is modified — the function is side-effect-free on error
 * - The caller can safely retry without loss of existing campaign state
 *
 * @param provider - The LLM provider to use for seed generation
 * @param timeoutMs - Timeout in milliseconds (default: 30000)
 */
export async function generateCampaignWithTimeout(
  provider: LLMCampaignProvider,
  timeoutMs: number = 30000,
): Promise<GenerationResult> {
  try {
    const seed = await Promise.race([
      generateCampaignSeed(provider),
      rejectAfterTimeout(timeoutMs),
    ]);

    return { kind: 'generated', seed };
  } catch (error: unknown) {
    const reason = extractErrorReason(error);
    return { kind: 'generation_failed', reason };
  }
}

/**
 * Returns a promise that rejects after the specified timeout.
 * Used internally for the Promise.race pattern.
 */
function rejectAfterTimeout(timeoutMs: number): Promise<never> {
  return new Promise<never>((_resolve, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(`Campaign generation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
}

/** Custom error class to distinguish timeouts from provider errors. */
class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Extracts a human-readable reason from an unknown error.
 */
function extractErrorReason(error: unknown): string {
  if (error instanceof TimeoutError) {
    return error.message;
  }
  if (error instanceof Error) {
    return `Provider error: ${error.message}`;
  }
  return 'Unknown generation error';
}
