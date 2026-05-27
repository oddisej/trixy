import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword } from './validation';

describe('validateEmail', () => {
  it('accepts a standard email address', () => {
    expect(validateEmail('user@example.com')).toEqual({ valid: true });
  });

  it('accepts email with subdomain', () => {
    expect(validateEmail('user@mail.example.co.uk')).toEqual({ valid: true });
  });

  it('accepts email with plus addressing', () => {
    expect(validateEmail('user+tag@example.com')).toEqual({ valid: true });
  });

  it('accepts email with dots in local part', () => {
    expect(validateEmail('first.last@example.com')).toEqual({ valid: true });
  });

  it('accepts email with hyphens in domain', () => {
    expect(validateEmail('user@my-domain.com')).toEqual({ valid: true });
  });

  it('rejects empty string', () => {
    expect(validateEmail('')).toEqual({
      valid: false,
      kind: 'invalid_email_format',
    });
  });

  it('rejects email without @ symbol', () => {
    expect(validateEmail('userexample.com')).toEqual({
      valid: false,
      kind: 'invalid_email_format',
    });
  });

  it('rejects email without domain', () => {
    expect(validateEmail('user@')).toEqual({
      valid: false,
      kind: 'invalid_email_format',
    });
  });

  it('rejects email without local part', () => {
    expect(validateEmail('@example.com')).toEqual({
      valid: false,
      kind: 'invalid_email_format',
    });
  });

  it('rejects email with spaces', () => {
    expect(validateEmail('user @example.com')).toEqual({
      valid: false,
      kind: 'invalid_email_format',
    });
  });

  it('rejects email with domain starting with hyphen', () => {
    expect(validateEmail('user@-example.com')).toEqual({
      valid: false,
      kind: 'invalid_email_format',
    });
  });
});

describe('validatePassword', () => {
  it('accepts a valid password with mixed case and digit', () => {
    expect(validatePassword('Abcdef1x')).toEqual({ valid: true });
  });

  it('accepts a password at minimum length (8 chars)', () => {
    expect(validatePassword('Aa1xxxxx')).toEqual({ valid: true });
  });

  it('accepts a password at maximum length (128 chars)', () => {
    const pw = 'Aa1' + 'x'.repeat(125);
    expect(validatePassword(pw)).toEqual({ valid: true });
  });

  it('rejects a password shorter than 8 characters', () => {
    expect(validatePassword('Aa1xxxx')).toEqual({
      valid: false,
      kind: 'invalid_password_format',
    });
  });

  it('rejects a password longer than 128 characters', () => {
    const pw = 'Aa1' + 'x'.repeat(126);
    expect(validatePassword(pw)).toEqual({
      valid: false,
      kind: 'invalid_password_format',
    });
  });

  it('rejects a password without uppercase letter', () => {
    expect(validatePassword('abcdef1x')).toEqual({
      valid: false,
      kind: 'invalid_password_format',
    });
  });

  it('rejects a password without lowercase letter', () => {
    expect(validatePassword('ABCDEF1X')).toEqual({
      valid: false,
      kind: 'invalid_password_format',
    });
  });

  it('rejects a password without digit', () => {
    expect(validatePassword('Abcdefgh')).toEqual({
      valid: false,
      kind: 'invalid_password_format',
    });
  });

  it('rejects an empty password', () => {
    expect(validatePassword('')).toEqual({
      valid: false,
      kind: 'invalid_password_format',
    });
  });

  it('accepts a password with special characters', () => {
    expect(validatePassword('Abc1!@#$')).toEqual({ valid: true });
  });
});
