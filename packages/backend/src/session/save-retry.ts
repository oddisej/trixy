/**
 * Save-Retry Service — wraps SessionService.saveSessionState with retry logic.
 *
 * Implements Property 15: Save-Retry respektiert Limits
 * - On transient_error: retry up to 3 times with backoff (delays <= 5000ms)
 * - On permanent_error or after 3 failed retries: return permanent_error
 *   and keep the unsaved state in an in-memory cache
 * - On success: return ok and clear the cached state
 *
 * Requirements: 7.4, 7.5
 */

import type { SessionState, SaveResult } from '@trixy/shared';

/**
 * Interface for the underlying save operation (typically SessionService.saveSessionState).
 */
export interface SaveOperation {
  saveSessionState(state: SessionState): Promise<SaveResult>;
}

/**
 * Injectable delay function signature. Allows tests to avoid real waits.
 */
export type DelayFn = (ms: number) => Promise<void>;

/** Default delay using setTimeout. */
export const defaultDelay: DelayFn = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Maximum number of retry attempts after the initial save fails. */
export const MAX_RETRIES = 3;

/** Maximum backoff interval in milliseconds. */
export const MAX_BACKOFF_MS = 5000;

/**
 * Computes the backoff delay for a given retry attempt (0-indexed).
 * Uses exponential backoff capped at MAX_BACKOFF_MS.
 */
export function computeBackoff(attempt: number): number {
  // Exponential backoff: 1000, 2000, 4000 — all <= 5000
  const delay = Math.min(1000 * Math.pow(2, attempt), MAX_BACKOFF_MS);
  return delay;
}

/**
 * SaveRetryService wraps a save operation with retry logic.
 *
 * On transient errors it retries up to MAX_RETRIES times with backoff.
 * On permanent errors or exhausted retries it caches the unsaved state
 * in memory and returns permanent_error.
 */
export class SaveRetryService {
  private unsavedState: SessionState | null = null;

  constructor(
    private readonly saveOp: SaveOperation,
    private readonly delay: DelayFn = defaultDelay,
  ) {}

  /**
   * Attempts to save the session state with retry logic.
   *
   * Returns the final SaveResult after all attempts.
   */
  async save(state: SessionState): Promise<SaveResult> {
    let attempt = 0;

    while (attempt <= MAX_RETRIES) {
      const result = await this.saveOp.saveSessionState(state);

      if (result.kind === 'ok') {
        // Success — clear cached state
        this.unsavedState = null;
        return result;
      }

      if (result.kind === 'permanent_error') {
        // Permanent error — cache state and return immediately
        this.unsavedState = state;
        return result;
      }

      // transient_error — retry if we haven't exhausted attempts
      if (attempt < MAX_RETRIES) {
        const backoff = computeBackoff(attempt);
        await this.delay(backoff);
      }

      attempt++;
    }

    // All retries exhausted — treat as permanent failure
    this.unsavedState = state;
    return {
      kind: 'permanent_error',
      reason: 'Save failed after maximum retry attempts',
    };
  }

  /**
   * Returns the cached unsaved state, or null if the last save succeeded.
   */
  getUnsavedState(): SessionState | null {
    return this.unsavedState;
  }
}
