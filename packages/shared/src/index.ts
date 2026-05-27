// @trixy/shared - Common types and logic for the AI RPG game

// Sync utilities
export { OptimisticStore } from './sync/optimistic-store.js';
export type { SyncStatus } from './sync/optimistic-store.js';

export type {
  // Enums / Union types
  BlockCategory,
  Race,
  CharacterClass,
  AttributeKey,

  // Domain models
  User,
  Character,
  Ability,
  InventoryItem,
  CharacterAttributes,
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
  SessionState,
  ConversationMessage,

  // Game engine
  ActionResolution,
  ActionResolutionInput,

  // Content filter
  FilterVerdict,
  ContentFilterLogEntry,

  // Auth
  AuthResult,

  // Persistence
  SaveResult,

  // Input processing
  RawInput,
  InputError,
  TranscriptionResult,
} from './types/index.js';
