import { describe, it, expect, vi } from 'vitest';
import {
  SpeechToTextAdapter,
  STTProvider,
  STTProviderResult,
  NoSpeechError,
  TimeoutError,
} from './speech-to-text-adapter';
import type { TranscriptionResult } from '@trixy/shared';

/**
 * Creates a mock STT provider that resolves with the given result after a delay.
 */
function createMockProvider(
  result: STTProviderResult | Error,
  delayMs = 0,
): STTProvider {
  return {
    recognize: (_audio: ArrayBuffer, _language: 'de' | 'en') =>
      new Promise<STTProviderResult>((resolve, reject) => {
        setTimeout(() => {
          if (result instanceof Error) {
            reject(result);
          } else {
            resolve(result);
          }
        }, delayMs);
      }),
  };
}

/**
 * Creates a mock provider that never resolves (simulates infinite hang).
 */
function createHangingProvider(): STTProvider {
  return {
    recognize: () => new Promise<STTProviderResult>(() => {}),
  };
}

describe('SpeechToTextAdapter', () => {
  const sampleAudio = new ArrayBuffer(1024);

  describe('confidence mapping', () => {
    it('returns "ok" when confidence >= 0.7', async () => {
      const provider = createMockProvider({ text: 'Hallo Welt', confidence: 0.95 });
      const adapter = new SpeechToTextAdapter(provider);

      const result = await adapter.transcribe({ audio: sampleAudio, language: 'de' });

      expect(result).toEqual({ kind: 'ok', text: 'Hallo Welt', confidence: 0.95 });
    });

    it('returns "ok" when confidence is exactly 0.7', async () => {
      const provider = createMockProvider({ text: 'Hello world', confidence: 0.7 });
      const adapter = new SpeechToTextAdapter(provider);

      const result = await adapter.transcribe({ audio: sampleAudio, language: 'en' });

      expect(result).toEqual({ kind: 'ok', text: 'Hello world', confidence: 0.7 });
    });

    it('returns "low_confidence" when confidence < 0.7', async () => {
      const provider = createMockProvider({ text: 'Hllo Wlt', confidence: 0.5 });
      const adapter = new SpeechToTextAdapter(provider);

      const result = await adapter.transcribe({ audio: sampleAudio, language: 'de' });

      expect(result).toEqual({ kind: 'low_confidence', text: 'Hllo Wlt', confidence: 0.5 });
    });

    it('returns "low_confidence" when confidence is just below 0.7', async () => {
      const provider = createMockProvider({ text: 'Almost', confidence: 0.6999 });
      const adapter = new SpeechToTextAdapter(provider);

      const result = await adapter.transcribe({ audio: sampleAudio, language: 'en' });

      expect(result).toEqual({ kind: 'low_confidence', text: 'Almost', confidence: 0.6999 });
    });

    it('returns "low_confidence" when confidence is 0', async () => {
      const provider = createMockProvider({ text: 'noise', confidence: 0 });
      const adapter = new SpeechToTextAdapter(provider);

      const result = await adapter.transcribe({ audio: sampleAudio, language: 'de' });

      expect(result).toEqual({ kind: 'low_confidence', text: 'noise', confidence: 0 });
    });
  });

  describe('language support', () => {
    it('passes "de" language to the provider', async () => {
      const recognizeSpy = vi.fn().mockResolvedValue({ text: 'Hallo', confidence: 0.9 });
      const provider: STTProvider = { recognize: recognizeSpy };
      const adapter = new SpeechToTextAdapter(provider);

      await adapter.transcribe({ audio: sampleAudio, language: 'de' });

      expect(recognizeSpy).toHaveBeenCalledWith(sampleAudio, 'de');
    });

    it('passes "en" language to the provider', async () => {
      const recognizeSpy = vi.fn().mockResolvedValue({ text: 'Hello', confidence: 0.9 });
      const provider: STTProvider = { recognize: recognizeSpy };
      const adapter = new SpeechToTextAdapter(provider);

      await adapter.transcribe({ audio: sampleAudio, language: 'en' });

      expect(recognizeSpy).toHaveBeenCalledWith(sampleAudio, 'en');
    });
  });

  describe('timeout handling', () => {
    it('returns "failed" with reason "timeout" when provider exceeds timeout', async () => {
      vi.useFakeTimers();
      const provider = createHangingProvider();
      const adapter = new SpeechToTextAdapter(provider, { timeoutMs: 5000 });

      const resultPromise = adapter.transcribe({ audio: sampleAudio, language: 'de' });

      await vi.advanceTimersByTimeAsync(5000);
      const result = await resultPromise;

      expect(result).toEqual({ kind: 'failed', reason: 'timeout' });
      vi.useRealTimers();
    });

    it('uses default 5000ms timeout when not configured', async () => {
      vi.useFakeTimers();
      const provider = createHangingProvider();
      const adapter = new SpeechToTextAdapter(provider);

      const resultPromise = adapter.transcribe({ audio: sampleAudio, language: 'en' });

      // At 4999ms, should not have timed out yet
      await vi.advanceTimersByTimeAsync(4999);
      // At 5000ms, should time out
      await vi.advanceTimersByTimeAsync(1);
      const result = await resultPromise;

      expect(result).toEqual({ kind: 'failed', reason: 'timeout' });
      vi.useRealTimers();
    });

    it('succeeds when provider responds before timeout', async () => {
      vi.useFakeTimers();
      const provider = createMockProvider({ text: 'Quick response', confidence: 0.85 }, 1000);
      const adapter = new SpeechToTextAdapter(provider, { timeoutMs: 5000 });

      const resultPromise = adapter.transcribe({ audio: sampleAudio, language: 'de' });

      await vi.advanceTimersByTimeAsync(1000);
      const result = await resultPromise;

      expect(result).toEqual({ kind: 'ok', text: 'Quick response', confidence: 0.85 });
      vi.useRealTimers();
    });
  });

  describe('error handling', () => {
    it('returns "failed" with reason "no_speech" on NoSpeechError', async () => {
      const provider = createMockProvider(new NoSpeechError());
      const adapter = new SpeechToTextAdapter(provider);

      const result = await adapter.transcribe({ audio: sampleAudio, language: 'de' });

      expect(result).toEqual({ kind: 'failed', reason: 'no_speech' });
    });

    it('returns "failed" with reason "unavailable" on generic errors', async () => {
      const provider = createMockProvider(new Error('Network error'));
      const adapter = new SpeechToTextAdapter(provider);

      const result = await adapter.transcribe({ audio: sampleAudio, language: 'en' });

      expect(result).toEqual({ kind: 'failed', reason: 'unavailable' });
    });

    it('returns "failed" with reason "unavailable" on unknown error types', async () => {
      const provider: STTProvider = {
        recognize: () => Promise.reject('string error'),
      };
      const adapter = new SpeechToTextAdapter(provider);

      const result = await adapter.transcribe({ audio: sampleAudio, language: 'de' });

      expect(result).toEqual({ kind: 'failed', reason: 'unavailable' });
    });
  });

  describe('custom configuration', () => {
    it('respects custom confidence threshold', async () => {
      const provider = createMockProvider({ text: 'Test', confidence: 0.75 });
      const adapter = new SpeechToTextAdapter(provider, { confidenceThreshold: 0.8 });

      const result = await adapter.transcribe({ audio: sampleAudio, language: 'en' });

      expect(result).toEqual({ kind: 'low_confidence', text: 'Test', confidence: 0.75 });
    });

    it('respects custom timeout', async () => {
      vi.useFakeTimers();
      const provider = createHangingProvider();
      const adapter = new SpeechToTextAdapter(provider, { timeoutMs: 3000 });

      const resultPromise = adapter.transcribe({ audio: sampleAudio, language: 'de' });

      await vi.advanceTimersByTimeAsync(3000);
      const result = await resultPromise;

      expect(result).toEqual({ kind: 'failed', reason: 'timeout' });
      vi.useRealTimers();
    });
  });
});
