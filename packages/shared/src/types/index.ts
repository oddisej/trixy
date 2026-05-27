/**
 * Barrel re-export for all shared types.
 */

// Enums and union types
export type { BlockCategory, Race, CharacterClass, AttributeKey } from './enums.js';

// Domain models
export type { User } from './user.js';
export type { Character, Ability, InventoryItem, CharacterAttributes } from './character.js';
export type {
  Campaign,
  WorldState,
  NPCProfile,
  NPCInteraction,
  Quest,
  QuestObjective,
  SceneSnapshot,
  Location,
  Fact,
  TimelineEvent,
} from './campaign.js';
export type { SessionState, ConversationMessage } from './session.js';

// Game engine
export type { ActionResolution, ActionResolutionInput } from './game-engine.js';

// Content filter
export type { FilterVerdict, ContentFilterLogEntry } from './content-filter.js';

// Auth
export type { AuthResult } from './auth.js';

// Persistence
export type { SaveResult } from './persistence.js';

// Input processing
export type { RawInput, InputError, TranscriptionResult } from './input.js';
