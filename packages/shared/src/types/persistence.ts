/**
 * Persistence/save result types.
 */

export type SaveResult =
  | { kind: 'ok'; savedAt: Date }
  | { kind: 'transient_error'; retryAfterMs: number }
  | { kind: 'permanent_error'; reason: string };
