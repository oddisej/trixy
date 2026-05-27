/**
 * Content Filter Pipeline.
 *
 * Evaluates all LLM output before delivery to the player.
 * If content is blocked, regenerates up to 3 times via the LLM adapter.
 * If all regenerations are blocked, delivers a predefined safe fallback response.
 *
 * Only delivers text that was approved or the fallback.
 */

import type { FilterVerdict } from '@trixy/shared';

/**
 * Safe fallback response delivered when all regeneration attempts are blocked.
 */
export const SAFE_FALLBACK_RESPONSE = 'Diese Aktion lässt sich gerade nicht erzählen.';

/**
 * Maximum number of regeneration attempts before falling back.
 */
export const MAX_REGENERATION_ATTEMPTS = 3;

/**
 * Interface for content filter evaluation.
 * Implementations check text for age-inappropriate content (12+).
 */
export interface ContentFilterProvider {
  evaluate(text: string): Promise<FilterVerdict>;
}

/**
 * Interface for LLM-based text regeneration.
 * Used when the content filter blocks a response.
 */
export interface LLMRegenerator {
  regenerate(prompt: string): Promise<string>;
}

/**
 * Result of the content filter pipeline.
 */
export interface FilterPipelineResult {
  /** The final text delivered to the player (approved or fallback). */
  text: string;
  /** Whether the original text was filtered (regenerated or replaced with fallback). */
  wasFiltered: boolean;
  /** Total number of evaluation attempts (1 = original passed, 2-4 = regenerations needed). */
  attempts: number;
}

/**
 * Content Filter Pipeline that evaluates LLM output and regenerates if blocked.
 *
 * Flow:
 * 1. Evaluate the original text through the ContentFilterProvider
 * 2. If approved → deliver immediately
 * 3. If blocked → regenerate via LLMRegenerator and re-evaluate (up to 3 times)
 * 4. If all 3 regenerations are also blocked → deliver SAFE_FALLBACK_RESPONSE
 */
export class ContentFilterPipeline {
  private readonly filter: ContentFilterProvider;
  private readonly regenerator: LLMRegenerator;

  constructor(filter: ContentFilterProvider, regenerator: LLMRegenerator) {
    this.filter = filter;
    this.regenerator = regenerator;
  }

  /**
   * Filters a response text through the content filter pipeline.
   *
   * @param text - The original LLM-generated text to evaluate
   * @param regenerationPrompt - The prompt to use for regeneration attempts
   * @returns The pipeline result with the final text, filter status, and attempt count
   */
  async filterResponse(text: string, regenerationPrompt: string): Promise<FilterPipelineResult> {
    // Evaluate the original text
    const initialVerdict = await this.filter.evaluate(text);

    if (initialVerdict.kind === 'approved') {
      return { text, wasFiltered: false, attempts: 1 };
    }

    // Original was blocked — attempt up to MAX_REGENERATION_ATTEMPTS regenerations
    for (let attempt = 1; attempt <= MAX_REGENERATION_ATTEMPTS; attempt++) {
      const regeneratedText = await this.regenerator.regenerate(regenerationPrompt);
      const verdict = await this.filter.evaluate(regeneratedText);

      if (verdict.kind === 'approved') {
        return { text: regeneratedText, wasFiltered: true, attempts: 1 + attempt };
      }
    }

    // All regeneration attempts were blocked — deliver safe fallback
    return {
      text: SAFE_FALLBACK_RESPONSE,
      wasFiltered: true,
      attempts: 1 + MAX_REGENERATION_ATTEMPTS,
    };
  }
}
