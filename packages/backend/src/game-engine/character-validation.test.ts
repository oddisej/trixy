import { describe, it, expect } from 'vitest';
import {
  validateCharacterCreation,
  AVAILABLE_RACES,
  AVAILABLE_CLASSES,
  REQUIRED_ATTRIBUTES,
  type CharacterCreationInput,
} from './character-validation.js';

function validInput(overrides?: Partial<CharacterCreationInput>): CharacterCreationInput {
  return {
    name: 'Thorin',
    race: 'dwarf',
    class: 'warrior',
    attributes: { strength: 15, dexterity: 12, intelligence: 8, charisma: 10 },
    backgroundStory: 'A brave dwarf from the mountains.',
    ...overrides,
  };
}

describe('validateCharacterCreation', () => {
  it('accepts a valid character creation input', () => {
    const result = validateCharacterCreation(validInput());
    expect(result).toEqual({ valid: true });
  });

  it('accepts empty backgroundStory', () => {
    const result = validateCharacterCreation(validInput({ backgroundStory: '' }));
    expect(result).toEqual({ valid: true });
  });

  it('accepts backgroundStory of exactly 2000 characters', () => {
    const result = validateCharacterCreation(
      validInput({ backgroundStory: 'a'.repeat(2000) }),
    );
    expect(result).toEqual({ valid: true });
  });

  it('rejects backgroundStory exceeding 2000 characters', () => {
    const result = validateCharacterCreation(
      validInput({ backgroundStory: 'a'.repeat(2001) }),
    );
    expect(result).toEqual({
      valid: false,
      errors: [{ field: 'backgroundStory', kind: 'background_story_too_long', length: 2001 }],
    });
  });

  it('rejects an invalid race', () => {
    const result = validateCharacterCreation(validInput({ race: 'goblin' }));
    expect(result).toEqual({
      valid: false,
      errors: [{ field: 'race', kind: 'invalid_race', value: 'goblin' }],
    });
  });

  it('rejects an invalid class', () => {
    const result = validateCharacterCreation(validInput({ class: 'bard' }));
    expect(result).toEqual({
      valid: false,
      errors: [{ field: 'class', kind: 'invalid_class', value: 'bard' }],
    });
  });

  it('rejects attribute values below 1', () => {
    const result = validateCharacterCreation(
      validInput({ attributes: { strength: 0, dexterity: 12, intelligence: 8, charisma: 10 } }),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContainEqual({
        field: 'attributes',
        kind: 'attribute_out_of_range',
        attribute: 'strength',
        value: 0,
      });
    }
  });

  it('rejects attribute values above 20', () => {
    const result = validateCharacterCreation(
      validInput({ attributes: { strength: 21, dexterity: 12, intelligence: 8, charisma: 10 } }),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContainEqual({
        field: 'attributes',
        kind: 'attribute_out_of_range',
        attribute: 'strength',
        value: 21,
      });
    }
  });

  it('rejects non-integer attribute values', () => {
    const result = validateCharacterCreation(
      validInput({ attributes: { strength: 5.5, dexterity: 12, intelligence: 8, charisma: 10 } }),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContainEqual({
        field: 'attributes',
        kind: 'attribute_not_integer',
        attribute: 'strength',
        value: 5.5,
      });
    }
  });

  it('rejects missing required attributes', () => {
    const result = validateCharacterCreation(
      validInput({ attributes: { strength: 10, dexterity: 12 } }),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContainEqual({
        field: 'attributes',
        kind: 'missing_required_attributes',
        missing: ['intelligence', 'charisma'],
      });
    }
  });

  it('collects multiple errors at once', () => {
    const result = validateCharacterCreation({
      name: 'Bad',
      race: 'troll',
      class: 'necromancer',
      attributes: { strength: 25 },
      backgroundStory: 'x'.repeat(2500),
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('exposes at least 3 races', () => {
    expect(AVAILABLE_RACES.length).toBeGreaterThanOrEqual(3);
  });

  it('exposes at least 3 classes', () => {
    expect(AVAILABLE_CLASSES.length).toBeGreaterThanOrEqual(3);
  });

  it('requires at least 4 attributes', () => {
    expect(REQUIRED_ATTRIBUTES.length).toBeGreaterThanOrEqual(4);
  });
});
