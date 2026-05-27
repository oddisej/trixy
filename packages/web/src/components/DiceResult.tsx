/**
 * DiceResult component — displays roll result, modifier, difficulty, total, and success/failure.
 */

import React from 'react';
import type { ActionResolution } from '../types';

export interface DiceResultProps {
  result: ActionResolution;
}

/**
 * Renders a dice roll result with all relevant details.
 */
export function DiceResult({ result }: DiceResultProps): React.JSX.Element {
  const { rollResult, modifier, difficulty, total, succeeded } = result;

  return (
    <div
      className="dice-result"
      role="status"
      aria-label={`Dice roll: ${succeeded ? 'Success' : 'Failure'}`}
    >
      <div className="dice-result__roll">
        <span className="dice-result__label">Roll:</span>
        <span className="dice-result__value">{rollResult}</span>
      </div>
      <div className="dice-result__modifier">
        <span className="dice-result__label">Modifier:</span>
        <span className="dice-result__value">
          {modifier >= 0 ? `+${modifier}` : modifier}
        </span>
      </div>
      <div className="dice-result__difficulty">
        <span className="dice-result__label">Difficulty:</span>
        <span className="dice-result__value">{difficulty}</span>
      </div>
      <div className="dice-result__total">
        <span className="dice-result__label">Total:</span>
        <span className="dice-result__value">{total}</span>
      </div>
      <div
        className={`dice-result__outcome dice-result__outcome--${succeeded ? 'success' : 'failure'}`}
      >
        {succeeded ? '✓ Success' : '✗ Failure'}
      </div>
    </div>
  );
}
