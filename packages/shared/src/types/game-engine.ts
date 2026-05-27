/**
 * Game engine types: dice rolls, action resolution.
 */

import type { AttributeKey } from './enums.js';

export interface ActionResolutionInput {
  attribute: AttributeKey;
  difficulty: number; // 1..20
  characterModifiers: number;
}

export interface ActionResolution {
  rollResult: number; // 1..20 unmodified
  modifier: number;
  difficulty: number;
  total: number; // rollResult + modifier
  succeeded: boolean; // total >= difficulty
}
