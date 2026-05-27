/**
 * Session Service — save and load session state with auto-save semantics.
 *
 * Implements the SessionStore interface (injectable persistence layer) and
 * the SessionService class that wraps it with message truncation and
 * error handling.
 *
 * Design: The session persists the full SessionState but truncates the
 * conversation to the 200 most recent messages (sorted by createdAt).
 * Save must complete within 3 s, load within 5 s.
 */

import type { SessionState, SaveResult } from '@trixy/shared';

/** Maximum number of conversation messages to persist/restore. */
export const MAX_SESSION_MESSAGES = 200;

/**
 * Injectable persistence layer for session state.
 */
export interface SessionStore {
  save(state: SessionState): Promise<void>;
  load(userId: string, campaignId: string): Promise<SessionState | null>;
}

/**
 * Service that wraps a SessionStore with message truncation and error handling.
 */
export class SessionService {
  constructor(private readonly store: SessionStore) {}

  /**
   * Persists the session state, truncating conversation to the last 200 messages.
   *
   * Messages are sorted by createdAt and only the 200 most recent are kept.
   * Returns a SaveResult indicating success or failure type.
   */
  async saveSessionState(state: SessionState): Promise<SaveResult> {
    const truncatedState = this.truncateConversation(state);

    try {
      await this.store.save(truncatedState);
      return { kind: 'ok', savedAt: new Date() };
    } catch (error: unknown) {
      if (isTransientError(error)) {
        return { kind: 'transient_error', retryAfterMs: getRetryDelay(error) };
      }
      return {
        kind: 'permanent_error',
        reason: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Loads the session state for a given user and campaign.
   *
   * Returns the full state with the last 200 messages, or null if not found.
   */
  async loadSession(
    userId: string,
    campaignId: string,
  ): Promise<SessionState | null> {
    return this.store.load(userId, campaignId);
  }

  /**
   * Truncates conversation to the last MAX_SESSION_MESSAGES messages,
   * sorted by createdAt ascending (chronological order).
   */
  private truncateConversation(state: SessionState): SessionState {
    const sorted = [...state.conversation].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    const count = Math.min(sorted.length, MAX_SESSION_MESSAGES);
    const truncated = sorted.slice(sorted.length - count);

    return { ...state, conversation: truncated };
  }
}

/**
 * In-memory implementation of SessionStore for testing.
 */
export class InMemorySessionStore implements SessionStore {
  private readonly data = new Map<string, SessionState>();

  async save(state: SessionState): Promise<void> {
    const key = this.buildKey(state.character.userId, state.campaignId);
    this.data.set(key, state);
  }

  async load(
    userId: string,
    campaignId: string,
  ): Promise<SessionState | null> {
    const key = this.buildKey(userId, campaignId);
    return this.data.get(key) ?? null;
  }

  /** Clears all stored data (useful in tests). */
  clear(): void {
    this.data.clear();
  }

  private buildKey(userId: string, campaignId: string): string {
    return `${userId}::${campaignId}`;
  }
}

// ─── Error classification helpers ────────────────────────────────────────────

/** Marker interface for transient errors that can be retried. */
export class TransientStoreError extends Error {
  readonly retryAfterMs: number;

  constructor(message: string, retryAfterMs = 1000) {
    super(message);
    this.name = 'TransientStoreError';
    this.retryAfterMs = retryAfterMs;
  }
}

function isTransientError(error: unknown): error is TransientStoreError {
  return error instanceof TransientStoreError;
}

function getRetryDelay(error: TransientStoreError): number {
  return error.retryAfterMs;
}
