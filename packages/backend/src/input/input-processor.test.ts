import { describe, it, expect } from 'vitest';
import { InputProcessor, ValidatedInput } from './input-processor';
import type { RawInput, InputError } from '@trixy/shared';

describe('InputProcessor', () => {
  const processor = new InputProcessor();

  describe('text input - empty/whitespace/special chars detection', () => {
    it('rejects an empty string with kind "empty"', () => {
      const input: RawInput = { kind: 'text', value: '' };
      const result = processor.process(input);
      expect(result).toEqual({ kind: 'empty' });
    });

    it('rejects a whitespace-only string with kind "whitespace_only"', () => {
      const input: RawInput = { kind: 'text', value: '   ' };
      const result = processor.process(input);
      expect(result).toEqual({ kind: 'whitespace_only' });
    });

    it('rejects tabs and newlines as whitespace-only', () => {
      const input: RawInput = { kind: 'text', value: '\t\n\r  \t' };
      const result = processor.process(input);
      expect(result).toEqual({ kind: 'whitespace_only' });
    });

    it('rejects a string with only special characters', () => {
      const input: RawInput = { kind: 'text', value: '!@#$%^&*()' };
      const result = processor.process(input);
      expect(result).toEqual({ kind: 'special_chars_only' });
    });

    it('rejects punctuation-only strings', () => {
      const input: RawInput = { kind: 'text', value: '...---!!!' };
      const result = processor.process(input);
      expect(result).toEqual({ kind: 'special_chars_only' });
    });

    it('rejects mixed special chars and whitespace without alphanumeric', () => {
      const input: RawInput = { kind: 'text', value: '  !@# $%^  ' };
      const result = processor.process(input);
      expect(result).toEqual({ kind: 'special_chars_only' });
    });
  });

  describe('text input - length validation', () => {
    it('accepts a single character string', () => {
      const input: RawInput = { kind: 'text', value: 'a' };
      const result = processor.process(input);
      expect(result).toEqual({ kind: 'validated_text', text: 'a' });
    });

    it('accepts a string at exactly 2000 characters', () => {
      const value = 'a'.repeat(2000);
      const input: RawInput = { kind: 'text', value };
      const result = processor.process(input);
      expect(result).toEqual({ kind: 'validated_text', text: value });
    });

    it('rejects a string exceeding 2000 characters', () => {
      const value = 'a'.repeat(2001);
      const input: RawInput = { kind: 'text', value };
      const result = processor.process(input);
      expect(result).toEqual({ kind: 'too_long', maxLength: 2000 });
    });

    it('rejects a very long string (5000 chars)', () => {
      const value = 'hello '.repeat(1000);
      const input: RawInput = { kind: 'text', value };
      const result = processor.process(input);
      expect(result).toEqual({ kind: 'too_long', maxLength: 2000 });
    });
  });

  describe('text input - valid inputs', () => {
    it('accepts a normal text message', () => {
      const input: RawInput = { kind: 'text', value: 'I attack the dragon' };
      const result = processor.process(input);
      expect(result).toEqual({ kind: 'validated_text', text: 'I attack the dragon' });
    });

    it('accepts text with mixed alphanumeric and special characters', () => {
      const input: RawInput = { kind: 'text', value: 'Hello! How are you?' };
      const result = processor.process(input);
      expect(result).toEqual({ kind: 'validated_text', text: 'Hello! How are you?' });
    });

    it('accepts text with numbers', () => {
      const input: RawInput = { kind: 'text', value: '123' };
      const result = processor.process(input);
      expect(result).toEqual({ kind: 'validated_text', text: '123' });
    });

    it('accepts German text with umlauts', () => {
      const input: RawInput = { kind: 'text', value: 'Ich öffne die Tür' };
      const result = processor.process(input);
      expect(result).toEqual({ kind: 'validated_text', text: 'Ich öffne die Tür' });
    });

    it('accepts text with leading/trailing whitespace (preserves it)', () => {
      const input: RawInput = { kind: 'text', value: '  hello  ' };
      const result = processor.process(input);
      expect(result).toEqual({ kind: 'validated_text', text: '  hello  ' });
    });

    it('accepts a single alphanumeric character among special chars', () => {
      const input: RawInput = { kind: 'text', value: '!!!a!!!' };
      const result = processor.process(input);
      expect(result).toEqual({ kind: 'validated_text', text: '!!!a!!!' });
    });
  });

  describe('voice input fallback', () => {
    it('returns voice_failed for voice inputs (not yet implemented)', () => {
      const input: RawInput = { kind: 'voice', audio: new ArrayBuffer(100), language: 'de' };
      const result = processor.process(input);
      expect(result).toEqual({ kind: 'voice_failed' });
    });
  });
});
