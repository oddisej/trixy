import { describe, it, expect } from 'vitest';
import { createDiceRoller, rollD20 } from './dice.js';

describe('dice', () => {
  describe('rollD20 (default crypto RNG)', () => {
    it('returns an integer in [1, 20]', () => {
      for (let i = 0; i < 100; i++) {
        const result = rollD20();
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(20);
        expect(Number.isInteger(result)).toBe(true);
      }
    });
  });

  describe('createDiceRoller', () => {
    it('uses injected RNG for deterministic results', () => {
      // RNG always returns 0 → maps to 1
      const roller = createDiceRoller(() => 0);
      expect(roller.rollD20()).toBe(1);
    });

    it('maps rng returning 0.95 to 20', () => {
      // Math.floor(0.95 * 20) + 1 = Math.floor(19) + 1 = 20
      const roller = createDiceRoller(() => 0.95);
      expect(roller.rollD20()).toBe(20);
    });

    it('maps rng returning just below 1.0 to 20', () => {
      // Math.floor(0.999... * 20) + 1 = Math.floor(19.99...) + 1 = 20
      const roller = createDiceRoller(() => 0.9999999);
      expect(roller.rollD20()).toBe(20);
    });

    it('maps rng returning 0.5 to 11', () => {
      // Math.floor(0.5 * 20) + 1 = Math.floor(10) + 1 = 11
      const roller = createDiceRoller(() => 0.5);
      expect(roller.rollD20()).toBe(11);
    });

    it('maps sequential values correctly', () => {
      let callCount = 0;
      const values = [0, 0.05, 0.1, 0.5, 0.95];
      const roller = createDiceRoller(() => values[callCount++]);

      expect(roller.rollD20()).toBe(1);  // floor(0 * 20) + 1 = 1
      expect(roller.rollD20()).toBe(2);  // floor(0.05 * 20) + 1 = floor(1) + 1 = 2
      expect(roller.rollD20()).toBe(3);  // floor(0.1 * 20) + 1 = floor(2) + 1 = 3
      expect(roller.rollD20()).toBe(11); // floor(0.5 * 20) + 1 = floor(10) + 1 = 11
      expect(roller.rollD20()).toBe(20); // floor(0.95 * 20) + 1 = floor(19) + 1 = 20
    });

    it('without rng uses crypto and stays in [1, 20]', () => {
      const roller = createDiceRoller();
      for (let i = 0; i < 50; i++) {
        const result = roller.rollD20();
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(20);
        expect(Number.isInteger(result)).toBe(true);
      }
    });
  });
});
