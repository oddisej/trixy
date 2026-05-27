/**
 * Session state and conversation message types.
 */

import type { ActionResolution } from './game-engine.js';
import type { Character } from './character.js';
import type { SceneSnapshot } from './campaign.js';

export interface ConversationMessage {
  id: string;
  campaignId: string;
  role: 'player' | 'gm' | 'npc';
  npcId?: string;
  text: string;
  origin: 'text' | 'voice';
  createdAt: Date;
  diceResult?: ActionResolution;
}

export interface SessionState {
  campaignId: string;
  character: Character;
  conversation: ConversationMessage[]; // last 200 for restore, last 50 for LLM context
  currentScene: SceneSnapshot;
  pendingDiceRoll?: ActionResolution;
  lastSavedAt: Date;
}
