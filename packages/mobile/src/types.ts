/**
 * Re-exports shared types from @trixy/shared for use in the mobile client.
 */
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
} from '@trixy/shared';

export { OptimisticStore } from '@trixy/shared';
export type { SyncStatus } from '@trixy/shared';
