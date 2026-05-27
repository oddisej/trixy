import type { TranscriptionResult } from '@trixy/shared';

/**
 * Raw result from an STT provider before confidence mapping.
 */
export interface STTProviderResult {
  text: string;
  confidence: number;
}

/**
 * Injectable interface for the underlying speech-to-text provider.
 * Implementations wrap external services (e.g. Google Cloud STT, Whisper).
 */
export interface STTProvider {
  /**
   * Transcribes audio to text. Should NOT handle timeout internally —
   * the adapter manages the timeout.
   */
  recognize(audio: ArrayBuffer, language: 'de' | 'en'): Promise<STTProviderResult>;
}

/**
 * Configuration for the SpeechToTextAdapter.
 */
export interface SpeechToTextAdapterConfig {
  /** Timeout in milliseconds. Defaults to 5000. */
  timeoutMs?: number;
  /** Confidence threshold below which results are marked as low_confidence. Defaults to 0.7. */
  confidenceThreshold?: number;
}

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;

/**
 * SpeechToTextAdapter wraps an STT provider with timeout handling and
 * confidence-based result mapping.
 *
 * - confidence >= 0.7 → { kind: 'ok' }
 * - confidence < 0.7  → { kind: 'low_confidence' }
 * - timeout/error     → { kind: 'failed' }
 */
export class SpeechToTextAdapter {
  private readonly provider: STTProvider;
  private readonly timeoutMs: number;
  private readonly confidenceThreshold: number;

  constructor(provider: STTProvider, config: SpeechToTextAdapterConfig = {}) {
    this.provider = provider;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.confidenceThreshold = config.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
  }

  /**
   * Transcribes audio input to text with timeout and confidence mapping.
   *
   * @param input.audio - The audio buffer to transcribe
   * @param input.language - Target language ('de' or 'en')
   * @returns TranscriptionResult mapped by confidence threshold
   */
  async transcribe(input: {
    audio: ArrayBuffer;
    language: 'de' | 'en';
  }): Promise<TranscriptionResult> {
    try {
      const result = await this.withTimeout(
        this.provider.recognize(input.audio, input.language),
        this.timeoutMs,
      );

      if (result.confidence >= this.confidenceThreshold) {
        return { kind: 'ok', text: result.text, confidence: result.confidence };
      }

      return { kind: 'low_confidence', text: result.text, confidence: result.confidence };
    } catch (error) {
      if (error instanceof TimeoutError) {
        return { kind: 'failed', reason: 'timeout' };
      }
      if (error instanceof NoSpeechError) {
        return { kind: 'failed', reason: 'no_speech' };
      }
      return { kind: 'failed', reason: 'unavailable' };
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new TimeoutError(`STT operation timed out after ${ms}ms`));
      }, ms);

      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }
}

/**
 * Error thrown when the STT provider does not respond within the timeout.
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Error thrown when the STT provider detects no speech in the audio.
 * Providers should throw this when appropriate.
 */
export class NoSpeechError extends Error {
  constructor(message = 'No speech detected in audio') {
    super(message);
    this.name = 'NoSpeechError';
  }
}
