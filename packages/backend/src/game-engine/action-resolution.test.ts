import { describe, it, expect } from 'vitest';
import { resolveAction, shouldRollDice } from './action-resolution.js';

describe('action-resolution', () => {
  describe('shouldRollDice', () => {
    it('returns true for uncertain_outcome', () => {
      expect(shouldRollDice('uncertain_outcome')).toBe(true);
    });

    it('returns false for guaranteed_outcome', () => {
      expect(shouldRollDice('guaranteed_outcome')).toBe(false);
    });
  });

  describe('resolveAction', () => {
    it('computes total as rollResult + modifier', () => {
      const diceRoller = { rollD20: () => 14 };
      const result = resolveAction(
        { attribute: 'strength', difficulty: 10, characterModifiers: 3 },
        diceRoller,
      );

      expect(result.rollResult).toBe(14);
      expect(result.modifier).toBe(3);
      expect(result.total).toBe(17);
    });

    it('succeeds when total equals difficulty', () => {
      const diceRoller = { rollD20: () => 10 };
      const result = resolveAction(
        { attribute: 'dexterity', difficulty: 12, characterModifiers: 2 },
        diceRoller,
      );

      expect(result.total).toBe(12);
      expect(result.succeeded).toBe(true);
    });

    it('succeeds when total exceeds difficulty', () => {
      const diceRoller = { rollD20: () => 18 };
      const result = resolveAction(
        { attribute: 'intelligence', difficulty: 15, characterModifiers: 1 },
        diceRoller,
      );

      expect(result.total).toBe(19);
      expect(result.succeeded).toBe(true);
    });

    it('fails when total is below difficulty', () => {
      const diceRoller = { rollD20: () => 3 };
      const result = resolveAction(
        { attribute: 'charisma', difficulty: 15, characterModifiers: 2 },
        diceRoller,
      );

      expect(result.total).toBe(5);
      expect(result.succeeded).toBe(false);
    });

    it('handles negative modifiers', () => {
      const diceRoller = { rollD20: () => 10 };
      const result = resolveAction(
        { attribute: 'strength', difficulty: 8, characterModifiers: -3 },
        diceRoller,
      );

      expect(result.rollResult).toBe(10);
      expect(result.modifier).toBe(-3);
      expect(result.total).toBe(7);
      expect(result.succeeded).toBe(false);
    });

    it('handles zero modifier', () => {
      const diceRoller = { rollD20: () => 15 };
      const result = resolveAction(
        { attribute: 'dexterity', difficulty: 15, characterModifiers: 0 },
        diceRoller,
      );

      expect(result.total).toBe(15);
      expect(result.succeeded).toBe(true);
    });

    it('includes difficulty from input', () => {
      const diceRoller = { rollD20: () => 1 };
      const result = resolveAction(
        { attribute: 'intelligence', difficulty: 20, characterModifiers: 5 },
        diceRoller,
      );

      expect(result.difficulty).toBe(20);
    });

    it('returns all required fields', () => {
      const diceRoller = { rollD20: () => 12 };
      const result = resolveAction(
        { attribute: 'charisma', difficulty: 10, characterModifiers: 2 },
        diceRoller,
      );

      expect(result).toHaveProperty('rollResult');
      expect(result).toHaveProperty('modifier');
      expect(result).toHaveProperty('difficulty');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('succeeded');
    });

    it('uses the dice roller result as rollResult', () => {
      let callCount = 0;
      const values = [1, 20, 10];
      const diceRoller = { rollD20: () => values[callCount++] };

      const r1 = resolveAction(
        { attribute: 'strength', difficulty: 10, characterModifiers: 0 },
        diceRoller,
      );
      expect(r1.rollResult).toBe(1);

      const r2 = resolveAction(
        { attribute: 'strength', difficulty: 10, characterModifiers: 0 },
        diceRoller,
      );
      expect(r2.rollResult).toBe(20);

      const r3 = resolveAction(
        { attribute: 'strength', difficulty: 10, characterModifiers: 0 },
        diceRoller,
      );
      expect(r3.rollResult).toBe(10);
    });

    it('edge case: minimum roll with max difficulty', () => {
      const diceRoller = { rollD20: () => 1 };
      const result = resolveAction(
        { attribute: 'strength', difficulty: 20, characterModifiers: 0 },
        diceRoller,
      );

      expect(result.rollResult).toBe(1);
      expect(result.total).toBe(1);
      expect(result.succeeded).toBe(false);
    });

    it('edge case: maximum roll with minimum difficulty', () => {
      const diceRoller = { rollD20: () => 20 };
      const result = resolveAction(
        { attribute: 'strength', difficulty: 1, characterModifiers: 0 },
        diceRoller,
      );

      expect(result.rollResult).toBe(20);
      expect(result.total).toBe(20);
      expect(result.succeeded).toBe(true);
    });
  });
});
