/**
 * Character domain model and related types.
 */

import type { AttributeKey, CharacterClass, Race } from './enums.js';

export interface Ability {
  id: string;
  name: string;
  unlockedAtLevel: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
}

export type CharacterAttributes = Record<AttributeKey, number>;

export interface Character {
  id: string;
  userId: string;
  name: string;
  race: Race;
  class: CharacterClass;
  level: number; // 1..20
  experience: number;
  attributes: CharacterAttributes;
  abilities: Ability[];
  inventory: InventoryItem[];
  backgroundStory: string; // up to 2000 characters
}
