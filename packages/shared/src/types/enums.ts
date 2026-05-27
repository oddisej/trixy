/**
 * Shared enum and union types for the AI RPG game.
 */

/** Categories of content that the filter can block. */
export type BlockCategory =
  | 'graphic_violence'
  | 'sexual_content'
  | 'hate_speech'
  | 'substance_abuse_glorification';

/** Available character races (extensible). */
export type Race = 'human' | 'elf' | 'dwarf' | (string & {});

/** Available character classes (extensible). */
export type CharacterClass = 'warrior' | 'mage' | 'rogue' | (string & {});

/** Character attribute keys. */
export type AttributeKey = 'strength' | 'dexterity' | 'intelligence' | 'charisma';
