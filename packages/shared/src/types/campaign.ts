/**
 * Campaign, WorldState, and related domain models.
 */

export interface Location {
  id: string;
  name: string;
  description: string;
}

export interface Fact {
  id: string;
  subject: string;
  predicate: string;
  value: string;
  immutable?: boolean;
  createdAt: Date;
}

export interface TimelineEvent {
  id: string;
  description: string;
  occurredAt: Date;
}

export interface NPCInteraction {
  id: string;
  playerMessage: string;
  npcResponse: string;
  timestamp: Date;
}

export interface NPCProfile {
  id: string;
  name: string;
  personalityTraits: string[];
  background: string;
  knowledgeBoundaries: string[];
  speechPatterns: string;
  interactionHistory: NPCInteraction[]; // last 50
}

export interface QuestObjective {
  id: string;
  description: string;
  completed: boolean;
}

export interface Quest {
  id: string;
  title: string;
  summary: string;
  status: 'open' | 'in_progress' | 'completed' | 'failed';
  objectives: QuestObjective[];
}

export interface WorldState {
  knownNPCs: NPCProfile[];
  knownLocations: Location[];
  establishedFacts: Fact[];
  timeline: TimelineEvent[];
}

export interface SceneSnapshot {
  locationName: string;
  description: string;
  presentNPCs: string[];
  timeOfDay?: string;
}

export interface Campaign {
  id: string;
  userId: string;
  characterId: string;
  title: string;
  setting: SceneSnapshot;
  worldState: WorldState;
  questLog: Quest[];
  createdAt: Date;
  lastPlayedAt: Date;
}
