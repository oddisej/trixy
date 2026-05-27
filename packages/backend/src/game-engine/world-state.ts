/**
 * World-State management with fact consistency.
 *
 * Maintains the WorldState's establishedFacts, knownNPCs, knownLocations,
 * and timeline with contradiction detection and precedence rules.
 *
 * Key invariant: after applyFact, no two facts with the same subject+predicate
 * but different values exist in establishedFacts.
 *
 * Contradiction detection: two facts contradict if they share the same
 * subject and predicate but have different values.
 *
 * Precedence rule: newer facts (by createdAt) replace older ones,
 * UNLESS the existing fact is marked immutable.
 */

import type {
  WorldState,
  Fact,
  NPCProfile,
  Location,
  TimelineEvent,
} from '@trixy/shared';

/** Result of applying a fact to the world state. */
export type ApplyFactResult =
  | { kind: 'applied'; worldState: WorldState }
  | { kind: 'rejected'; reason: string };

/**
 * Applies a fact to the world state with contradiction detection.
 *
 * Rules:
 * 1. If no existing fact shares the same subject+predicate, the fact is added.
 * 2. If an existing fact has the same subject+predicate AND the same value,
 *    the fact is treated as a no-op (already established) — applied without change.
 * 3. If an existing fact has the same subject+predicate but a different value:
 *    a. If the existing fact is immutable → reject the new fact.
 *    b. Otherwise, the newer fact (by createdAt) replaces the older one.
 *       If the new fact is older than the existing one, it is rejected.
 */
export function applyFact(worldState: WorldState, fact: Fact): ApplyFactResult {
  const existingIndex = worldState.establishedFacts.findIndex(
    (f) => f.subject === fact.subject && f.predicate === fact.predicate,
  );

  // No existing fact with same subject+predicate — simply add
  if (existingIndex === -1) {
    const updatedFacts = [...worldState.establishedFacts, fact];
    return {
      kind: 'applied',
      worldState: { ...worldState, establishedFacts: updatedFacts },
    };
  }

  const existing = worldState.establishedFacts[existingIndex];

  // Same value — no contradiction, no-op (fact already established)
  if (existing.value === fact.value) {
    return { kind: 'applied', worldState };
  }

  // Different value — contradiction detected
  // If existing is immutable, reject the new fact
  if (existing.immutable) {
    return {
      kind: 'rejected',
      reason: `Cannot override immutable fact: "${existing.subject} ${existing.predicate}" is already established as "${existing.value}" and cannot be changed`,
    };
  }

  // Precedence rule: newer fact replaces older one
  if (fact.createdAt.getTime() >= existing.createdAt.getTime()) {
    // New fact is newer or same time — replace
    const updatedFacts = [...worldState.establishedFacts];
    updatedFacts[existingIndex] = fact;
    return {
      kind: 'applied',
      worldState: { ...worldState, establishedFacts: updatedFacts },
    };
  }

  // New fact is older than existing — reject
  return {
    kind: 'rejected',
    reason: `Fact "${fact.subject} ${fact.predicate} = ${fact.value}" is older than the existing fact "${existing.subject} ${existing.predicate} = ${existing.value}" and cannot replace it`,
  };
}

/**
 * Adds an NPC profile to the world state.
 * If an NPC with the same id already exists, it is replaced.
 */
export function addNPC(worldState: WorldState, npc: NPCProfile): WorldState {
  const existingIndex = worldState.knownNPCs.findIndex((n) => n.id === npc.id);
  if (existingIndex === -1) {
    return { ...worldState, knownNPCs: [...worldState.knownNPCs, npc] };
  }
  const updatedNPCs = [...worldState.knownNPCs];
  updatedNPCs[existingIndex] = npc;
  return { ...worldState, knownNPCs: updatedNPCs };
}

/**
 * Adds a location to the world state.
 * If a location with the same id already exists, it is replaced.
 */
export function addLocation(worldState: WorldState, location: Location): WorldState {
  const existingIndex = worldState.knownLocations.findIndex(
    (l) => l.id === location.id,
  );
  if (existingIndex === -1) {
    return {
      ...worldState,
      knownLocations: [...worldState.knownLocations, location],
    };
  }
  const updatedLocations = [...worldState.knownLocations];
  updatedLocations[existingIndex] = location;
  return { ...worldState, knownLocations: updatedLocations };
}

/**
 * Adds a timeline event to the world state.
 * Events are appended and sorted by occurredAt (chronological order).
 */
export function addTimelineEvent(
  worldState: WorldState,
  event: TimelineEvent,
): WorldState {
  const updatedTimeline = [...worldState.timeline, event].sort(
    (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
  );
  return { ...worldState, timeline: updatedTimeline };
}
