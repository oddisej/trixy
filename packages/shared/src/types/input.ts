/**
 * Input processing types: raw input, validation errors, transcription.
 */

export type RawInput =
  | { kind: 'text'; value: string }
  | { kind: 'voice'; audio: ArrayBuffer; language: 'de' | 'en' };

export type InputError =
  | { kind: 'empty' }
  | { kind: 'whitespace_only' }
  | { kind: 'special_chars_only' }
  | { kind: 'too_long'; maxLength: 2000 }
  | { kind: 'voice_failed' };

export type TranscriptionResult =
  | { kind: 'ok'; text: string; confidence: number }
  | { kind: 'low_confidence'; text: string; confidence: number } // < 0.7
  | { kind: 'failed'; reason: 'timeout' | 'unavailable' | 'no_speech' };
