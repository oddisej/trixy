import { describe, it, expect, vi } from 'vitest';
import {
  ContentFilterPipeline,
  SAFE_FALLBACK_RESPONSE,
  MAX_REGENERATION_ATTEMPTS,
  type ContentFilterProvider,
  type LLMRegenerator,
} from './content-filter.js';
import type { FilterVerdict } from '@trixy/shared';

/** Helper: creates a mock filter that returns verdicts in sequence. */
function createMockFilter(verdicts: FilterVerdict[]): ContentFilterProvider {
  let callIndex = 0;
  return {
    evaluate: vi.fn(async (_text: string): Promise<FilterVerdict> => {
      const verdict = verdicts[callIndex] ?? { kind: 'approved' };
      callIndex++;
      return verdict;
    }),
  };
}

/** Helper: creates a mock regenerator that returns texts in sequence. */
function createMockRegenerator(texts: string[]): LLMRegenerator {
  let callIndex = 0;
  return {
    regenerate: vi.fn(async (_prompt: string): Promise<string> => {
      const text = texts[callIndex] ?? 'regenerated-fallback';
      callIndex++;
      return text;
    }),
  };
}

describe('ContentFilterPipeline', () => {
  describe('filterResponse', () => {
    it('delivers approved text immediately without regeneration', async () => {
      const filter = createMockFilter([{ kind: 'approved' }]);
      const regenerator = createMockRegenerator([]);
      const pipeline = new ContentFilterPipeline(filter, regenerator);

      const result = await pipeline.filterResponse('Safe content', 'regen prompt');

      expect(result.text).toBe('Safe content');
      expect(result.wasFiltered).toBe(false);
      expect(result.attempts).toBe(1);
      expect(filter.evaluate).toHaveBeenCalledTimes(1);
      expect(regenerator.regenerate).not.toHaveBeenCalled();
    });

    it('regenerates once when first attempt is blocked and second is approved', async () => {
      const filter = createMockFilter([
        { kind: 'blocked', categories: ['graphic_violence'] },
        { kind: 'approved' },
      ]);
      const regenerator = createMockRegenerator(['Safe regenerated text']);
      const pipeline = new ContentFilterPipeline(filter, regenerator);

      const result = await pipeline.filterResponse('Violent content', 'regen prompt');

      expect(result.text).toBe('Safe regenerated text');
      expect(result.wasFiltered).toBe(true);
      expect(result.attempts).toBe(2);
      expect(filter.evaluate).toHaveBeenCalledTimes(2);
      expect(regenerator.regenerate).toHaveBeenCalledTimes(1);
    });

    it('regenerates twice when first two are blocked and third is approved', async () => {
      const filter = createMockFilter([
        { kind: 'blocked', categories: ['sexual_content'] },
        { kind: 'blocked', categories: ['sexual_content'] },
        { kind: 'approved' },
      ]);
      const regenerator = createMockRegenerator(['Still bad', 'Now safe']);
      const pipeline = new ContentFilterPipeline(filter, regenerator);

      const result = await pipeline.filterResponse('Bad content', 'regen prompt');

      expect(result.text).toBe('Now safe');
      expect(result.wasFiltered).toBe(true);
      expect(result.attempts).toBe(3);
      expect(filter.evaluate).toHaveBeenCalledTimes(3);
      expect(regenerator.regenerate).toHaveBeenCalledTimes(2);
    });

    it('regenerates three times when first three are blocked and fourth is approved', async () => {
      const filter = createMockFilter([
        { kind: 'blocked', categories: ['hate_speech'] },
        { kind: 'blocked', categories: ['hate_speech'] },
        { kind: 'blocked', categories: ['hate_speech'] },
        { kind: 'approved' },
      ]);
      const regenerator = createMockRegenerator(['Bad 1', 'Bad 2', 'Finally safe']);
      const pipeline = new ContentFilterPipeline(filter, regenerator);

      const result = await pipeline.filterResponse('Hateful content', 'regen prompt');

      expect(result.text).toBe('Finally safe');
      expect(result.wasFiltered).toBe(true);
      expect(result.attempts).toBe(4);
      expect(filter.evaluate).toHaveBeenCalledTimes(4);
      expect(regenerator.regenerate).toHaveBeenCalledTimes(3);
    });

    it('returns safe fallback when all 3 regeneration attempts are blocked', async () => {
      const filter = createMockFilter([
        { kind: 'blocked', categories: ['substance_abuse_glorification'] },
        { kind: 'blocked', categories: ['substance_abuse_glorification'] },
        { kind: 'blocked', categories: ['substance_abuse_glorification'] },
        { kind: 'blocked', categories: ['substance_abuse_glorification'] },
      ]);
      const regenerator = createMockRegenerator(['Bad 1', 'Bad 2', 'Bad 3']);
      const pipeline = new ContentFilterPipeline(filter, regenerator);

      const result = await pipeline.filterResponse('Terrible content', 'regen prompt');

      expect(result.text).toBe(SAFE_FALLBACK_RESPONSE);
      expect(result.wasFiltered).toBe(true);
      expect(result.attempts).toBe(1 + MAX_REGENERATION_ATTEMPTS);
      expect(filter.evaluate).toHaveBeenCalledTimes(4);
      expect(regenerator.regenerate).toHaveBeenCalledTimes(3);
    });

    it('passes the regeneration prompt to the regenerator', async () => {
      const filter = createMockFilter([
        { kind: 'blocked', categories: ['graphic_violence'] },
        { kind: 'approved' },
      ]);
      const regenerator = createMockRegenerator(['Safe text']);
      const pipeline = new ContentFilterPipeline(filter, regenerator);

      await pipeline.filterResponse('Bad text', 'Please generate age-appropriate content');

      expect(regenerator.regenerate).toHaveBeenCalledWith(
        'Please generate age-appropriate content'
      );
    });

    it('passes the original text to the filter for initial evaluation', async () => {
      const filter = createMockFilter([{ kind: 'approved' }]);
      const regenerator = createMockRegenerator([]);
      const pipeline = new ContentFilterPipeline(filter, regenerator);

      await pipeline.filterResponse('Original text to check', 'regen prompt');

      expect(filter.evaluate).toHaveBeenCalledWith('Original text to check');
    });

    it('passes regenerated text to the filter for re-evaluation', async () => {
      const filter = createMockFilter([
        { kind: 'blocked', categories: ['graphic_violence'] },
        { kind: 'approved' },
      ]);
      const regenerator = createMockRegenerator(['Regenerated safe text']);
      const pipeline = new ContentFilterPipeline(filter, regenerator);

      await pipeline.filterResponse('Original bad text', 'regen prompt');

      expect(filter.evaluate).toHaveBeenNthCalledWith(1, 'Original bad text');
      expect(filter.evaluate).toHaveBeenNthCalledWith(2, 'Regenerated safe text');
    });

    it('never delivers blocked text to the caller', async () => {
      const blockedTexts = ['Blocked 1', 'Blocked 2', 'Blocked 3'];
      const filter = createMockFilter([
        { kind: 'blocked', categories: ['graphic_violence'] },
        { kind: 'blocked', categories: ['graphic_violence'] },
        { kind: 'blocked', categories: ['graphic_violence'] },
        { kind: 'blocked', categories: ['graphic_violence'] },
      ]);
      const regenerator = createMockRegenerator(blockedTexts);
      const pipeline = new ContentFilterPipeline(filter, regenerator);

      const result = await pipeline.filterResponse('Original blocked', 'regen prompt');

      // The result must be either an approved text or the fallback
      expect(blockedTexts).not.toContain(result.text);
      expect(result.text).toBe(SAFE_FALLBACK_RESPONSE);
    });

    it('does not exceed MAX_REGENERATION_ATTEMPTS regenerations', async () => {
      // Even with many blocked verdicts, only 3 regenerations should happen
      const filter = createMockFilter(
        Array(10).fill({ kind: 'blocked', categories: ['graphic_violence'] })
      );
      const regenerator = createMockRegenerator(Array(10).fill('Still blocked'));
      const pipeline = new ContentFilterPipeline(filter, regenerator);

      const result = await pipeline.filterResponse('Bad content', 'regen prompt');

      expect(regenerator.regenerate).toHaveBeenCalledTimes(MAX_REGENERATION_ATTEMPTS);
      expect(filter.evaluate).toHaveBeenCalledTimes(1 + MAX_REGENERATION_ATTEMPTS);
      expect(result.text).toBe(SAFE_FALLBACK_RESPONSE);
    });
  });

  describe('SAFE_FALLBACK_RESPONSE', () => {
    it('has the expected German fallback text', () => {
      expect(SAFE_FALLBACK_RESPONSE).toBe('Diese Aktion lässt sich gerade nicht erzählen.');
    });
  });

  describe('MAX_REGENERATION_ATTEMPTS', () => {
    it('is set to 3', () => {
      expect(MAX_REGENERATION_ATTEMPTS).toBe(3);
    });
  });
});
