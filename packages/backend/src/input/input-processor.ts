import type { RawInput, InputError } from '@trixy/shared';

/**
 * Validated text input ready for processing by the Game Engine.
 */
export interface ValidatedInput {
  kind: 'validated_text';
  text: string;
}

const MAX_LENGTH = 2000;

/**
 * Checks whether a string contains at least one alphanumeric character (any script).
 * Uses Unicode property escapes to support international alphabets.
 */
function hasAlphanumeric(s: string): boolean {
  return /[\p{L}\p{N}]/u.test(s);
}

/**
 * InputProcessor validates raw player inputs before they reach the Game Engine.
 *
 * For text inputs it checks:
 * - Not empty (length 0)
 * - Not whitespace-only
 * - Not special-characters-only (must contain at least one alphanumeric character)
 * - Length within 1–2000 characters
 */
export class InputProcessor {
  process(raw: RawInput): ValidatedInput | InputError {
    if (raw.kind === 'text') {
      return this.processText(raw.value);
    }

    // Voice inputs are handled by a separate path (Task 3.4)
    return { kind: 'voice_failed' };
  }

  private processText(value: string): ValidatedInput | InputError {
    // Check empty string
    if (value.length === 0) {
      return { kind: 'empty' };
    }

    // Check too long before other checks
    if (value.length > MAX_LENGTH) {
      return { kind: 'too_long', maxLength: 2000 };
    }

    // Check whitespace-only
    if (value.trim().length === 0) {
      return { kind: 'whitespace_only' };
    }

    // Check special characters only (no alphanumeric content)
    if (!hasAlphanumeric(value)) {
      return { kind: 'special_chars_only' };
    }

    return { kind: 'validated_text', text: value };
  }
}
