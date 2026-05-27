import type { ActionResolution, ActionResolutionInput } from '@trixy/shared';

/**
 * Determines whether a dice roll is needed based on the action type.
 * Uncertain outcomes require a roll; guaranteed outcomes are resolved narratively.
 *
 * @param actionType - 'uncertain_outcome' requires a roll, 'guaranteed_outcome' does not
 * @returns true if a dice roll should be performed
 */
export function shouldRollDice(
  actionType: 'uncertain_outcome' | 'guaranteed_outcome',
): boolean {
  return actionType === 'uncertain_outcome';
}

/**
 * Resolves an action by rolling dice and computing success/failure.
 *
 * - rollResult comes from the injected diceRoller
 * - modifier comes from characterModifiers in the input
 * - total = rollResult + modifier
 * - succeeded = total >= difficulty
 *
 * @param input - The action resolution input with attribute, difficulty, and characterModifiers
 * @param diceRoller - Injectable dice roller for deterministic testing
 * @returns The full ActionResolution with all computed fields
 */
export function resolveAction(
  input: ActionResolutionInput,
  diceRoller: { rollD20: () => number },
): ActionResolution {
  const rollResult = diceRoller.rollD20();
  const modifier = input.characterModifiers;
  const difficulty = input.difficulty;
  const total = rollResult + modifier;
  const succeeded = total >= difficulty;

  return {
    rollResult,
    modifier,
    difficulty,
    total,
    succeeded,
  };
}
