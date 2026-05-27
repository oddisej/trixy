import { describe, it, expect } from 'vitest';
import {
  applyExperience,
  computeLevelForXp,
  LEVEL_THRESHOLDS,
  ABILITIES_BY_LEVEL,
  MAX_LEVEL,
} from './experience.js';
import type { Character } from '@trixy/shared';

/** Helper to create a base character at level 1 with 0 XP. */
function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'char-1',
    userId: 'user-1',
    name: 'Test Hero',
    race: 'human',
    class: 'warrior',
    level: 1,
    experience: 0,
    attributes: { strength: 10, dexterity: 10, intelligence: 10, charisma: 10 },
    abilities: [],
    inventory: [],
    backgroundStory: 'A brave adventurer.',
    ...overrides,
  };
}

describe('computeLevelForXp', () => {
  it('returns level 1 for 0 XP', () => {
    expect(computeLevelForXp(0)).toBe(1);
  });

  it('returns level 1 for XP below level 2 threshold', () => {
    expect(computeLevelForXp(99)).toBe(1);
  });

  it('returns level 2 at exactly 100 XP', () => {
    expect(computeLevelForXp(100)).toBe(2);
  });

  it('returns level 3 at exactly 300 XP', () => {
    expect(computeLevelForXp(300)).toBe(3);
  });

  it('returns level 20 at exactly the level 20 threshold', () => {
    expect(computeLevelForXp(LEVEL_THRESHOLDS[20])).toBe(20);
  });

  it('caps at level 20 even with XP far beyond the threshold', () => {
    expect(computeLevelForXp(999999)).toBe(20);
  });
});

describe('applyExperience', () => {
  describe('basic level-up', () => {
    it('increases level when XP crosses a threshold', () => {
      const char = makeCharacter();
      const result = applyExperience(char, 100);
      expect(result.level).toBe(2);
      expect(result.experience).toBe(100);
    });

    it('can jump multiple levels at once', () => {
      const char = makeCharacter();
      const result = applyExperience(char, 600);
      expect(result.level).toBe(4);
      expect(result.experience).toBe(600);
    });

    it('does not change level when XP is below next threshold', () => {
      const char = makeCharacter();
      const result = applyExperience(char, 50);
      expect(result.level).toBe(1);
      expect(result.experience).toBe(50);
    });
  });

  describe('level cap at 20', () => {
    it('caps level at 20 regardless of XP amount', () => {
      const char = makeCharacter();
      const result = applyExperience(char, 999999);
      expect(result.level).toBe(20);
    });

    it('does not increase level beyond 20 for a character already at 20', () => {
      const char = makeCharacter({ level: 20, experience: 19000 });
      const result = applyExperience(char, 10000);
      expect(result.level).toBe(20);
      expect(result.experience).toBe(29000);
    });
  });

  describe('ability unlocking', () => {
    it('unlocks at least 1 ability per level gained', () => {
      const char = makeCharacter();
      const result = applyExperience(char, 100); // level 1 -> 2
      expect(result.abilities.length).toBeGreaterThanOrEqual(1);
      expect(result.abilities.some((a) => a.unlockedAtLevel === 2)).toBe(true);
    });

    it('unlocks abilities for each level when jumping multiple levels', () => {
      const char = makeCharacter();
      const result = applyExperience(char, 600); // level 1 -> 4
      // Should have abilities for levels 2, 3, and 4
      expect(result.abilities.length).toBe(3);
      expect(result.abilities.some((a) => a.unlockedAtLevel === 2)).toBe(true);
      expect(result.abilities.some((a) => a.unlockedAtLevel === 3)).toBe(true);
      expect(result.abilities.some((a) => a.unlockedAtLevel === 4)).toBe(true);
    });

    it('does not duplicate abilities already present', () => {
      const existingAbility = ABILITIES_BY_LEVEL[2];
      const char = makeCharacter({ abilities: [existingAbility] });
      const result = applyExperience(char, 100); // level 1 -> 2
      const countOfAbility2 = result.abilities.filter((a) => a.id === existingAbility.id).length;
      expect(countOfAbility2).toBe(1);
    });

    it('does not add abilities when no level is gained', () => {
      const char = makeCharacter();
      const result = applyExperience(char, 50); // stays at level 1
      expect(result.abilities.length).toBe(0);
    });
  });

  describe('determinism (split-independence)', () => {
    it('applying 300 XP at once equals applying 100 + 200 separately', () => {
      const char = makeCharacter();

      // Apply all at once
      const atOnce = applyExperience(char, 300);

      // Apply in two steps
      const step1 = applyExperience(char, 100);
      const step2 = applyExperience(step1, 200);

      expect(step2.level).toBe(atOnce.level);
      expect(step2.experience).toBe(atOnce.experience);
      expect(step2.abilities.length).toBe(atOnce.abilities.length);
    });

    it('applying XP in many small increments equals one large application', () => {
      const char = makeCharacter();

      // Apply 1000 XP at once (level 5)
      const atOnce = applyExperience(char, 1000);

      // Apply in 10 increments of 100
      let incremental = char;
      for (let i = 0; i < 10; i++) {
        incremental = applyExperience(incremental, 100);
      }

      expect(incremental.level).toBe(atOnce.level);
      expect(incremental.experience).toBe(atOnce.experience);
      expect(incremental.abilities.length).toBe(atOnce.abilities.length);
    });

    it('different splits of the same total yield the same level and ability count', () => {
      const char = makeCharacter();
      const totalXp = 1500; // level 6

      // Split 1: 500 + 1000
      const split1 = applyExperience(applyExperience(char, 500), 1000);

      // Split 2: 750 + 750
      const split2 = applyExperience(applyExperience(char, 750), 750);

      // Split 3: all at once
      const split3 = applyExperience(char, totalXp);

      expect(split1.level).toBe(split3.level);
      expect(split2.level).toBe(split3.level);
      expect(split1.abilities.length).toBe(split3.abilities.length);
      expect(split2.abilities.length).toBe(split3.abilities.length);
    });
  });

  describe('edge cases', () => {
    it('handles 0 XP delta without changing character', () => {
      const char = makeCharacter({ experience: 50 });
      const result = applyExperience(char, 0);
      expect(result.level).toBe(char.level);
      expect(result.experience).toBe(char.experience);
      expect(result.abilities).toEqual(char.abilities);
    });

    it('handles negative XP delta by returning character unchanged', () => {
      const char = makeCharacter({ experience: 200 });
      const result = applyExperience(char, -50);
      expect(result).toBe(char);
    });

    it('returns a new object (immutability)', () => {
      const char = makeCharacter();
      const result = applyExperience(char, 100);
      expect(result).not.toBe(char);
      expect(result.abilities).not.toBe(char.abilities);
    });
  });
});

describe('LEVEL_THRESHOLDS', () => {
  it('has entries for levels 1 through 20', () => {
    expect(LEVEL_THRESHOLDS.length).toBe(MAX_LEVEL + 1);
  });

  it('thresholds are monotonically increasing', () => {
    for (let i = 2; i <= MAX_LEVEL; i++) {
      expect(LEVEL_THRESHOLDS[i]).toBeGreaterThan(LEVEL_THRESHOLDS[i - 1]);
    }
  });
});

describe('ABILITIES_BY_LEVEL', () => {
  it('has at least one ability for each level from 2 to 20', () => {
    for (let lvl = 2; lvl <= MAX_LEVEL; lvl++) {
      expect(ABILITIES_BY_LEVEL[lvl]).toBeDefined();
      expect(ABILITIES_BY_LEVEL[lvl].unlockedAtLevel).toBe(lvl);
    }
  });
});
