/**
 * Experience and level progression system.
 *
 * Implements deterministic XP-to-level progression with:
 * - Defined XP thresholds per level (up to level 20)
 * - At least one new ability unlocked per level gained
 * - Level cap at 20
 * - Determinism: applying XP in any split yields the same result as applying the sum at once
 */

import type { Ability, Character } from '@trixy/shared';

/**
 * XP thresholds for each level. Index 0 is unused (level 1 starts at 0 XP).
 * LEVEL_THRESHOLDS[n] = total XP required to reach level n.
 *
 * Level 1: 0 XP (starting level)
 * Level 2: 100 XP
 * Level 3: 300 XP
 * Level 4: 600 XP
 * ...scaling quadratically up to level 20.
 */
export const LEVEL_THRESHOLDS: number[] = [
  0, // index 0: unused placeholder
  0, // level 1: 0 XP
  100, // level 2
  300, // level 3
  600, // level 4
  1000, // level 5
  1500, // level 6
  2100, // level 7
  2800, // level 8
  3600, // level 9
  4500, // level 10
  5500, // level 11
  6600, // level 12
  7800, // level 13
  9100, // level 14
  10500, // level 15
  12000, // level 16
  13600, // level 17
  15300, // level 18
  17100, // level 19
  19000, // level 20
];

/**
 * One ability unlocked per level (levels 2–20).
 * Each entry maps a level number to the ability gained at that level.
 */
export const ABILITIES_BY_LEVEL: Record<number, Ability> = {
  2: { id: 'ability-2', name: 'Power Strike', unlockedAtLevel: 2 },
  3: { id: 'ability-3', name: 'Quick Dodge', unlockedAtLevel: 3 },
  4: { id: 'ability-4', name: 'Arcane Shield', unlockedAtLevel: 4 },
  5: { id: 'ability-5', name: 'Battle Cry', unlockedAtLevel: 5 },
  6: { id: 'ability-6', name: 'Shadow Step', unlockedAtLevel: 6 },
  7: { id: 'ability-7', name: 'Healing Touch', unlockedAtLevel: 7 },
  8: { id: 'ability-8', name: 'Fire Bolt', unlockedAtLevel: 8 },
  9: { id: 'ability-9', name: 'Iron Will', unlockedAtLevel: 9 },
  10: { id: 'ability-10', name: 'Whirlwind', unlockedAtLevel: 10 },
  11: { id: 'ability-11', name: 'Invisibility', unlockedAtLevel: 11 },
  12: { id: 'ability-12', name: 'Thunder Clap', unlockedAtLevel: 12 },
  13: { id: 'ability-13', name: 'Poison Blade', unlockedAtLevel: 13 },
  14: { id: 'ability-14', name: 'Divine Smite', unlockedAtLevel: 14 },
  15: { id: 'ability-15', name: 'Time Warp', unlockedAtLevel: 15 },
  16: { id: 'ability-16', name: 'Dragon Breath', unlockedAtLevel: 16 },
  17: { id: 'ability-17', name: 'Soul Drain', unlockedAtLevel: 17 },
  18: { id: 'ability-18', name: 'Meteor Strike', unlockedAtLevel: 18 },
  19: { id: 'ability-19', name: 'Dimensional Rift', unlockedAtLevel: 19 },
  20: { id: 'ability-20', name: 'Ascendant Form', unlockedAtLevel: 20 },
};

/** Maximum character level. */
export const MAX_LEVEL = 20;

/**
 * Computes the level for a given total XP amount.
 * Returns the highest level whose threshold is <= totalXp, capped at MAX_LEVEL.
 */
export function computeLevelForXp(totalXp: number): number {
  let level = 1;
  for (let i = 2; i <= MAX_LEVEL; i++) {
    if (totalXp >= LEVEL_THRESHOLDS[i]!) {
      level = i;
    } else {
      break;
    }
  }
  return level;
}

/**
 * Applies experience points to a character and returns a new character with
 * updated XP, level, and abilities.
 *
 * Key properties:
 * - Level is capped at 20
 * - Level can only increase (never decrease)
 * - At least 1 new ability is added per level gained
 * - Deterministic: the result depends only on total XP, not on how XP was split
 *
 * @param character - The current character state
 * @param xpDelta - Non-negative XP to add
 * @returns A new Character object with updated experience, level, and abilities
 */
export function applyExperience(character: Character, xpDelta: number): Character {
  if (xpDelta < 0) {
    // Negative XP is not allowed; return character unchanged
    return character;
  }

  const newExperience = character.experience + xpDelta;
  const newLevel = computeLevelForXp(newExperience);

  // Ensure level never decreases (defensive, should not happen with non-negative xpDelta)
  const effectiveLevel = Math.max(character.level, newLevel);
  const cappedLevel = Math.min(effectiveLevel, MAX_LEVEL);

  // Collect abilities for all levels gained
  const existingAbilityIds = new Set(character.abilities.map((a) => a.id));
  const newAbilities: Ability[] = [];

  for (let lvl = character.level + 1; lvl <= cappedLevel; lvl++) {
    const ability = ABILITIES_BY_LEVEL[lvl];
    if (ability && !existingAbilityIds.has(ability.id)) {
      newAbilities.push(ability);
      existingAbilityIds.add(ability.id);
    }
  }

  return {
    ...character,
    experience: newExperience,
    level: cappedLevel,
    abilities: [...character.abilities, ...newAbilities],
  };
}
