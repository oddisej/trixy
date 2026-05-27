import { describe, it, expect } from 'vitest';
import {
  applyFact,
  addNPC,
  addLocation,
  addTimelineEvent,
} from './world-state.js';
import type { WorldState, Fact, NPCProfile, Location, TimelineEvent } from '@trixy/shared';

/** Creates an empty WorldState for testing. */
function emptyWorldState(): WorldState {
  return {
    knownNPCs: [],
    knownLocations: [],
    establishedFacts: [],
    timeline: [],
  };
}

/** Helper to create a Fact with defaults. */
function makeFact(overrides: Partial<Fact> = {}): Fact {
  return {
    id: 'fact-1',
    subject: 'dragon',
    predicate: 'color',
    value: 'red',
    createdAt: new Date(2024, 0, 1),
    ...overrides,
  };
}

/** Helper to create an NPCProfile with defaults. */
function makeNPC(overrides: Partial<NPCProfile> = {}): NPCProfile {
  return {
    id: 'npc-1',
    name: 'Gandalf',
    personalityTraits: ['wise', 'patient'],
    background: 'A wandering wizard',
    knowledgeBoundaries: ['ancient lore'],
    speechPatterns: 'formal and archaic',
    interactionHistory: [],
    ...overrides,
  };
}

/** Helper to create a Location with defaults. */
function makeLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: 'loc-1',
    name: 'Rivendell',
    description: 'An elven sanctuary',
    ...overrides,
  };
}

/** Helper to create a TimelineEvent with defaults. */
function makeTimelineEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: 'event-1',
    description: 'The dragon attacked the village',
    occurredAt: new Date(2024, 0, 1),
    ...overrides,
  };
}

describe('applyFact', () => {
  it('adds a new fact when no existing fact has the same subject+predicate', () => {
    const ws = emptyWorldState();
    const fact = makeFact();

    const result = applyFact(ws, fact);

    expect(result.kind).toBe('applied');
    if (result.kind === 'applied') {
      expect(result.worldState.establishedFacts).toHaveLength(1);
      expect(result.worldState.establishedFacts[0]).toEqual(fact);
    }
  });

  it('treats a fact with same subject+predicate+value as a no-op', () => {
    const fact = makeFact();
    const ws: WorldState = { ...emptyWorldState(), establishedFacts: [fact] };

    const duplicateFact = makeFact({ id: 'fact-2', createdAt: new Date(2024, 5, 1) });
    const result = applyFact(ws, duplicateFact);

    expect(result.kind).toBe('applied');
    if (result.kind === 'applied') {
      // No change — still the original fact
      expect(result.worldState.establishedFacts).toHaveLength(1);
      expect(result.worldState.establishedFacts[0]).toEqual(fact);
    }
  });

  it('replaces an older mutable fact with a newer contradicting fact', () => {
    const oldFact = makeFact({ createdAt: new Date(2024, 0, 1), value: 'red' });
    const ws: WorldState = { ...emptyWorldState(), establishedFacts: [oldFact] };

    const newFact = makeFact({
      id: 'fact-2',
      createdAt: new Date(2024, 6, 1),
      value: 'blue',
    });
    const result = applyFact(ws, newFact);

    expect(result.kind).toBe('applied');
    if (result.kind === 'applied') {
      expect(result.worldState.establishedFacts).toHaveLength(1);
      expect(result.worldState.establishedFacts[0].value).toBe('blue');
      expect(result.worldState.establishedFacts[0].id).toBe('fact-2');
    }
  });

  it('rejects a newer fact that contradicts an immutable existing fact', () => {
    const immutableFact = makeFact({
      value: 'red',
      immutable: true,
      createdAt: new Date(2024, 0, 1),
    });
    const ws: WorldState = {
      ...emptyWorldState(),
      establishedFacts: [immutableFact],
    };

    const newFact = makeFact({
      id: 'fact-2',
      value: 'blue',
      createdAt: new Date(2024, 6, 1),
    });
    const result = applyFact(ws, newFact);

    expect(result.kind).toBe('rejected');
    if (result.kind === 'rejected') {
      expect(result.reason).toContain('immutable');
    }
  });

  it('rejects an older fact that contradicts a newer existing mutable fact', () => {
    const existingFact = makeFact({
      value: 'blue',
      createdAt: new Date(2024, 6, 1),
    });
    const ws: WorldState = {
      ...emptyWorldState(),
      establishedFacts: [existingFact],
    };

    const olderFact = makeFact({
      id: 'fact-2',
      value: 'red',
      createdAt: new Date(2024, 0, 1),
    });
    const result = applyFact(ws, olderFact);

    expect(result.kind).toBe('rejected');
    if (result.kind === 'rejected') {
      expect(result.reason).toContain('older');
    }
  });

  it('maintains the key invariant: no two facts with same subject+predicate but different values', () => {
    let ws = emptyWorldState();

    // Add initial fact
    const fact1 = makeFact({ id: 'f1', value: 'red', createdAt: new Date(2024, 0, 1) });
    const r1 = applyFact(ws, fact1);
    expect(r1.kind).toBe('applied');
    if (r1.kind === 'applied') ws = r1.worldState;

    // Replace with newer fact
    const fact2 = makeFact({ id: 'f2', value: 'blue', createdAt: new Date(2024, 3, 1) });
    const r2 = applyFact(ws, fact2);
    expect(r2.kind).toBe('applied');
    if (r2.kind === 'applied') ws = r2.worldState;

    // Verify invariant: only one fact with subject=dragon, predicate=color
    const matching = ws.establishedFacts.filter(
      (f) => f.subject === 'dragon' && f.predicate === 'color',
    );
    expect(matching).toHaveLength(1);
    expect(matching[0].value).toBe('blue');
  });

  it('allows facts with same subject but different predicates', () => {
    let ws = emptyWorldState();

    const fact1 = makeFact({ id: 'f1', subject: 'dragon', predicate: 'color', value: 'red' });
    const r1 = applyFact(ws, fact1);
    if (r1.kind === 'applied') ws = r1.worldState;

    const fact2 = makeFact({ id: 'f2', subject: 'dragon', predicate: 'size', value: 'large' });
    const r2 = applyFact(ws, fact2);

    expect(r2.kind).toBe('applied');
    if (r2.kind === 'applied') {
      expect(r2.worldState.establishedFacts).toHaveLength(2);
    }
  });

  it('allows facts with same predicate but different subjects', () => {
    let ws = emptyWorldState();

    const fact1 = makeFact({ id: 'f1', subject: 'dragon', predicate: 'color', value: 'red' });
    const r1 = applyFact(ws, fact1);
    if (r1.kind === 'applied') ws = r1.worldState;

    const fact2 = makeFact({ id: 'f2', subject: 'phoenix', predicate: 'color', value: 'gold' });
    const r2 = applyFact(ws, fact2);

    expect(r2.kind).toBe('applied');
    if (r2.kind === 'applied') {
      expect(r2.worldState.establishedFacts).toHaveLength(2);
    }
  });

  it('does not mutate the original world state', () => {
    const ws = emptyWorldState();
    const fact = makeFact();

    applyFact(ws, fact);

    expect(ws.establishedFacts).toHaveLength(0);
  });

  it('replaces when new fact has the same createdAt as existing (tie goes to new)', () => {
    const sameTime = new Date(2024, 3, 15);
    const existingFact = makeFact({ id: 'f1', value: 'red', createdAt: sameTime });
    const ws: WorldState = { ...emptyWorldState(), establishedFacts: [existingFact] };

    const newFact = makeFact({ id: 'f2', value: 'blue', createdAt: sameTime });
    const result = applyFact(ws, newFact);

    expect(result.kind).toBe('applied');
    if (result.kind === 'applied') {
      expect(result.worldState.establishedFacts).toHaveLength(1);
      expect(result.worldState.establishedFacts[0].value).toBe('blue');
    }
  });
});

describe('addNPC', () => {
  it('adds a new NPC to an empty world state', () => {
    const ws = emptyWorldState();
    const npc = makeNPC();

    const result = addNPC(ws, npc);

    expect(result.knownNPCs).toHaveLength(1);
    expect(result.knownNPCs[0]).toEqual(npc);
  });

  it('replaces an existing NPC with the same id', () => {
    const npc = makeNPC({ name: 'Gandalf' });
    const ws: WorldState = { ...emptyWorldState(), knownNPCs: [npc] };

    const updatedNPC = makeNPC({ name: 'Gandalf the White' });
    const result = addNPC(ws, updatedNPC);

    expect(result.knownNPCs).toHaveLength(1);
    expect(result.knownNPCs[0].name).toBe('Gandalf the White');
  });

  it('adds a second NPC with a different id', () => {
    const npc1 = makeNPC({ id: 'npc-1', name: 'Gandalf' });
    const ws: WorldState = { ...emptyWorldState(), knownNPCs: [npc1] };

    const npc2 = makeNPC({ id: 'npc-2', name: 'Aragorn' });
    const result = addNPC(ws, npc2);

    expect(result.knownNPCs).toHaveLength(2);
  });

  it('does not mutate the original world state', () => {
    const ws = emptyWorldState();
    addNPC(ws, makeNPC());
    expect(ws.knownNPCs).toHaveLength(0);
  });
});

describe('addLocation', () => {
  it('adds a new location to an empty world state', () => {
    const ws = emptyWorldState();
    const location = makeLocation();

    const result = addLocation(ws, location);

    expect(result.knownLocations).toHaveLength(1);
    expect(result.knownLocations[0]).toEqual(location);
  });

  it('replaces an existing location with the same id', () => {
    const location = makeLocation({ name: 'Rivendell' });
    const ws: WorldState = { ...emptyWorldState(), knownLocations: [location] };

    const updatedLocation = makeLocation({ name: 'Rivendell (Destroyed)' });
    const result = addLocation(ws, updatedLocation);

    expect(result.knownLocations).toHaveLength(1);
    expect(result.knownLocations[0].name).toBe('Rivendell (Destroyed)');
  });

  it('adds a second location with a different id', () => {
    const loc1 = makeLocation({ id: 'loc-1', name: 'Rivendell' });
    const ws: WorldState = { ...emptyWorldState(), knownLocations: [loc1] };

    const loc2 = makeLocation({ id: 'loc-2', name: 'Mordor' });
    const result = addLocation(ws, loc2);

    expect(result.knownLocations).toHaveLength(2);
  });

  it('does not mutate the original world state', () => {
    const ws = emptyWorldState();
    addLocation(ws, makeLocation());
    expect(ws.knownLocations).toHaveLength(0);
  });
});

describe('addTimelineEvent', () => {
  it('adds a timeline event to an empty world state', () => {
    const ws = emptyWorldState();
    const event = makeTimelineEvent();

    const result = addTimelineEvent(ws, event);

    expect(result.timeline).toHaveLength(1);
    expect(result.timeline[0]).toEqual(event);
  });

  it('maintains chronological order when adding events', () => {
    const event1 = makeTimelineEvent({
      id: 'e1',
      occurredAt: new Date(2024, 5, 1),
      description: 'Later event',
    });
    const ws: WorldState = { ...emptyWorldState(), timeline: [event1] };

    const event2 = makeTimelineEvent({
      id: 'e2',
      occurredAt: new Date(2024, 0, 1),
      description: 'Earlier event',
    });
    const result = addTimelineEvent(ws, event2);

    expect(result.timeline).toHaveLength(2);
    expect(result.timeline[0].id).toBe('e2'); // earlier first
    expect(result.timeline[1].id).toBe('e1'); // later second
  });

  it('appends events with the same timestamp', () => {
    const sameTime = new Date(2024, 3, 15);
    const event1 = makeTimelineEvent({ id: 'e1', occurredAt: sameTime });
    const ws: WorldState = { ...emptyWorldState(), timeline: [event1] };

    const event2 = makeTimelineEvent({ id: 'e2', occurredAt: sameTime });
    const result = addTimelineEvent(ws, event2);

    expect(result.timeline).toHaveLength(2);
  });

  it('does not mutate the original world state', () => {
    const ws = emptyWorldState();
    addTimelineEvent(ws, makeTimelineEvent());
    expect(ws.timeline).toHaveLength(0);
  });
});
