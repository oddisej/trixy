/**
 * Character creation validation.
 *
 * Pure function that validates character creation input against game rules:
 * - Attribute values must be integers in [1, 20]
 * - At least 4 attributes required (strength, dexterity, intelligence, charisma)
 * - Race must be from AVAILABLE_RACES
 * - Class must be from AVAILABLE_CLASSES
 * - backgroundStory must be 0–2000 characters
 */

import type { AttributeKey } from '@trixy/shared';

// --- Available options ---

export const AVAILABLE_RACES = ['human', 'elf', 'dwarf', 'orc'] as const;
export type AvailableRace = (typeof AVAILABLE_RACES)[number];

export const AVAILABLE_CLASSES = ['warrior', 'mage', 'rogue', 'healer'] as const;
export type AvailableClass = (typeof AVAILABLE_CLASSES)[number];

export const REQUIRED_ATTRIBUTES: AttributeKey[] = [
  'strength',
  'dexterity',
  'intelligence',
  'charisma',
];

// --- Input type ---

export interface CharacterCreationInput {
  name: string;
  race: string;
  class: string;
  attributes: Partial<Record<string, number>>;
  backgroundStory: string;
}

// --- Validation error types ---

export type CharacterValidationError =
  | { field: 'attributes'; kind: 'missing_required_attributes'; missing: string[] }
  | { field: 'attributes'; kind: 'attribute_out_of_range'; attribute: string; value: number }
  | { field: 'attributes'; kind: 'attribute_not_integer'; attribute: string; value: number }
  | { field: 'race'; kind: 'invalid_race'; value: string }
  | { field: 'class'; kind: 'invalid_class'; value: string }
  | { field: 'backgroundStory'; kind: 'background_story_too_long'; length: number };

// --- Validation result ---

export type CharacterValidationResult =
  | { valid: true }
  | { valid: false; errors: CharacterValidationError[] };

// --- Validation function ---

/**
 * Validates a character creation input against game rules.
 *
 * Checks:
 * 1. All attribute values are integers in [1, 20]
 * 2. At least 4 required attributes are provided (strength, dexterity, intelligence, charisma)
 * 3. Race is from AVAILABLE_RACES
 * 4. Class is from AVAILABLE_CLASSES
 * 5. backgroundStory length is 0–2000 characters
 *
 * @returns `{ valid: true }` or `{ valid: false; errors: CharacterValidationError[] }`
 */
export function validateCharacterCreation(
  input: CharacterCreationInput,
): CharacterValidationResult {
  const errors: CharacterValidationError[] = [];

  // Check required attributes are present
  const missingAttributes = REQUIRED_ATTRIBUTES.filter(
    (attr) => !(attr in input.attributes),
  );
  if (missingAttributes.length > 0) {
    errors.push({
      field: 'attributes',
      kind: 'missing_required_attributes',
      missing: missingAttributes,
    });
  }

  // Check each provided attribute value
  for (const [key, value] of Object.entries(input.attributes)) {
    if (value === undefined) continue;

    if (!Number.isInteger(value)) {
      errors.push({
        field: 'attributes',
        kind: 'attribute_not_integer',
        attribute: key,
        value,
      });
    } else if (value < 1 || value > 20) {
      errors.push({
        field: 'attributes',
        kind: 'attribute_out_of_range',
        attribute: key,
        value,
      });
    }
  }

  // Check race
  if (!AVAILABLE_RACES.includes(input.race as AvailableRace)) {
    errors.push({ field: 'race', kind: 'invalid_race', value: input.race });
  }

  // Check class
  if (!AVAILABLE_CLASSES.includes(input.class as AvailableClass)) {
    errors.push({ field: 'class', kind: 'invalid_class', value: input.class });
  }

  // Check backgroundStory length
  if (input.backgroundStory.length > 2000) {
    errors.push({
      field: 'backgroundStory',
      kind: 'background_story_too_long',
      length: input.backgroundStory.length,
    });
  }

  if (errors.length === 0) {
    return { valid: true };
  }

  return { valid: false, errors };
}
