import { randomInt } from 'node:crypto';

/**
 * Type for an injectable RNG function that returns a float in [0, 1).
 * Used for deterministic testing.
 */
export type RngFn = () => number;

/**
 * Creates a dice roller with an injectable RNG for testability.
 *
 * @param rng - Optional function returning a float in [0, 1) which gets mapped to [1, 20].
 *              Defaults to crypto.randomInt(1, 21) for cryptographically secure uniform distribution.
 * @returns An object with a rollD20 function that returns an integer in [1, 20].
 */
export function createDiceRoller(rng?: RngFn) {
  return {
    rollD20(): number {
      if (rng) {
        // Map [0, 1) to [1, 20]
        return Math.floor(rng() * 20) + 1;
      }
      // crypto.randomInt(min, max) returns [min, max) so we use (1, 21) for [1, 20]
      return randomInt(1, 21);
    },
  };
}

/**
 * Default d20 roller using cryptographically secure randomness.
 * Returns a uniformly distributed integer in [1, 20].
 */
export const { rollD20 } = createDiceRoller();
