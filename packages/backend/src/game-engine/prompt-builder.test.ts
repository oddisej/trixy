import { describe, it, expect } from 'vitest';
import { buildNarrationPrompt, type NarrationPromptInput } from './prompt-builder.js';
import type {
  Character,
  SceneSnapshot,
  WorldState,
  ConversationMessage,
  ActionResolution,
} from '@trixy/shared';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeCharacter(overrides?: Partial<Character>): Character {
  return {
    id: 'char-1',
    userId: 'user-1',
    name: 'Thorin',
    race: 'dwarf',
    class: 'warrior',
    level: 5,
    experience: 1200,
    attributes: { strength: 18, dexterity: 10, intelligence: 8, charisma: 12 },
    abilities: [
      { id: 'a1', name: 'Berserker Rage', unlockedAtLevel: 3 },
      { id: 'a2', name: 'Shield Wall', unlockedAtLevel: 5 },
    ],
    inventory: [],
    backgroundStory: 'Ein ehemaliger Schmied aus den Eisenbergen, der nach Rache sucht.',
    ...overrides,
  };
}

function makeScene(overrides?: Partial<SceneSnapshot>): SceneSnapshot {
  return {
    locationName: 'Dunkler Wald',
    description: 'Ein dichter Wald voller Nebel und alter Bäume.',
    presentNPCs: ['Elara'],
    timeOfDay: 'Nacht',
    ...overrides,
  };
}

function makeWorldState(overrides?: Partial<WorldState>): WorldState {
  return {
    knownNPCs: [
      {
        id: 'npc-1',
        name: 'Elara',
        personalityTraits: ['weise', 'geheimnisvoll'],
        background: 'Eine alte Elfenmagierin, die den Wald beschützt.',
        knowledgeBoundaries: ['Kennt nur den Wald und seine Geschichte'],
        speechPatterns: 'Spricht in Rätseln',
        interactionHistory: [],
      },
    ],
    knownLocations: [
      {
        id: 'loc-1',
        name: 'Eisenberge',
        description: 'Schneebedeckte Gipfel mit tiefen Minen.',
      },
    ],
    establishedFacts: [],
    timeline: [],
    ...overrides,
  };
}

function makeHistory(count = 3): ConversationMessage[] {
  const messages: ConversationMessage[] = [];
  for (let i = 0; i < count; i++) {
    messages.push({
      id: `msg-${i}`,
      campaignId: 'camp-1',
      role: i % 2 === 0 ? 'player' : 'gm',
      text:
        i % 2 === 0
          ? `Ich untersuche den Pfad nach Norden (Aktion ${i}).`
          : `Der Pfad führt tiefer in den Wald (Antwort ${i}).`,
      origin: 'text',
      createdAt: new Date(2024, 0, 1, 10, i),
    });
  }
  return messages;
}

function makeDiceResult(overrides?: Partial<ActionResolution>): ActionResolution {
  return {
    rollResult: 14,
    modifier: 3,
    difficulty: 12,
    total: 17,
    succeeded: true,
    ...overrides,
  };
}

function makeInput(overrides?: Partial<NarrationPromptInput>): NarrationPromptInput {
  return {
    character: makeCharacter(),
    scene: makeScene(),
    worldState: makeWorldState(),
    history: makeHistory(),
    language: 'de',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildNarrationPrompt', () => {
  describe('character references', () => {
    it('includes the character name, race, class, and background in the prompt', () => {
      const result = buildNarrationPrompt(makeInput());

      expect(result.userPrompt).toContain('Thorin');
      expect(result.userPrompt).toContain('dwarf');
      expect(result.userPrompt).toContain('warrior');
      expect(result.userPrompt).toContain('Eisenbergen');
    });

    it('includes character abilities by name', () => {
      const result = buildNarrationPrompt(makeInput());

      expect(result.userPrompt).toContain('Berserker Rage');
      expect(result.userPrompt).toContain('Shield Wall');
    });

    it('handles characters with no abilities', () => {
      const input = makeInput({ character: makeCharacter({ abilities: [] }) });
      const result = buildNarrationPrompt(input);

      expect(result.userPrompt).toContain('keine besonderen Fähigkeiten');
    });

    it('handles characters with empty background story', () => {
      const input = makeInput({ character: makeCharacter({ backgroundStory: '' }) });
      const result = buildNarrationPrompt(input);

      expect(result.userPrompt).toContain('Kein Hintergrund angegeben.');
    });
  });

  describe('scene inclusion', () => {
    it('includes the scene location and description', () => {
      const result = buildNarrationPrompt(makeInput());

      expect(result.userPrompt).toContain('Dunkler Wald');
      expect(result.userPrompt).toContain('dichter Wald voller Nebel');
    });

    it('includes present NPCs in the scene section', () => {
      const result = buildNarrationPrompt(makeInput());

      expect(result.userPrompt).toContain('Anwesende NPCs: Elara');
    });

    it('includes time of day when provided', () => {
      const result = buildNarrationPrompt(makeInput());

      expect(result.userPrompt).toContain('Tageszeit: Nacht');
    });

    it('omits time of day when not provided', () => {
      const input = makeInput({ scene: makeScene({ timeOfDay: undefined }) });
      const result = buildNarrationPrompt(input);

      expect(result.userPrompt).not.toContain('Tageszeit');
    });
  });

  describe('history reference', () => {
    it('references the last player action from history', () => {
      const result = buildNarrationPrompt(makeInput());

      // The last player message in our fixture is at index 2 (0-based)
      expect(result.userPrompt).toContain('Ich untersuche den Pfad nach Norden (Aktion 2)');
    });

    it('omits history section when history is empty', () => {
      const input = makeInput({ history: [] });
      const result = buildNarrationPrompt(input);

      expect(result.userPrompt).not.toContain('[Letzte Spieleraktion]');
    });

    it('omits history section when no player messages exist', () => {
      const gmOnly: ConversationMessage[] = [
        {
          id: 'msg-gm',
          campaignId: 'camp-1',
          role: 'gm',
          text: 'Willkommen, Abenteurer!',
          origin: 'text',
          createdAt: new Date(),
        },
      ];
      const input = makeInput({ history: gmOnly });
      const result = buildNarrationPrompt(input);

      expect(result.userPrompt).not.toContain('[Letzte Spieleraktion]');
    });
  });

  describe('world-state reference', () => {
    it('references an NPC from worldState when available', () => {
      const result = buildNarrationPrompt(makeInput());

      expect(result.userPrompt).toContain('[Weltwissen – NPC]');
      expect(result.userPrompt).toContain('Elara');
      expect(result.userPrompt).toContain('alte Elfenmagierin');
    });

    it('falls back to a location reference when no NPCs are known', () => {
      const input = makeInput({
        worldState: makeWorldState({ knownNPCs: [] }),
      });
      const result = buildNarrationPrompt(input);

      expect(result.userPrompt).toContain('[Weltwissen – Ort]');
      expect(result.userPrompt).toContain('Eisenberge');
      expect(result.userPrompt).toContain('Schneebedeckte Gipfel');
    });

    it('omits world-state section when neither NPCs nor locations are known', () => {
      const input = makeInput({
        worldState: makeWorldState({ knownNPCs: [], knownLocations: [] }),
      });
      const result = buildNarrationPrompt(input);

      expect(result.userPrompt).not.toContain('[Weltwissen');
    });
  });

  describe('dice result', () => {
    it('includes dice result fields when diceResult is provided', () => {
      const input = makeInput({ diceResult: makeDiceResult() });
      const result = buildNarrationPrompt(input);

      expect(result.userPrompt).toContain('[Würfelergebnis]');
      expect(result.userPrompt).toContain('Wurf: 14');
      expect(result.userPrompt).toContain('Modifikator: 3');
      expect(result.userPrompt).toContain('Schwierigkeit: 12');
      expect(result.userPrompt).toContain('Gesamt: 17');
      expect(result.userPrompt).toContain('Erfolg: ja');
    });

    it('shows failure when dice roll did not succeed', () => {
      const input = makeInput({
        diceResult: makeDiceResult({ rollResult: 3, total: 6, succeeded: false }),
      });
      const result = buildNarrationPrompt(input);

      expect(result.userPrompt).toContain('Erfolg: nein');
    });

    it('omits dice result section when no diceResult is provided', () => {
      const input = makeInput({ diceResult: undefined });
      const result = buildNarrationPrompt(input);

      expect(result.userPrompt).not.toContain('[Würfelergebnis]');
    });
  });

  describe('language support', () => {
    it('produces a German system prompt when language is "de"', () => {
      const input = makeInput({ language: 'de' });
      const result = buildNarrationPrompt(input);

      expect(result.systemPrompt).toContain('Antworte ausschließlich auf Deutsch');
      expect(result.systemPrompt).toContain('kreativer Game Master');
    });

    it('produces an English system prompt when language is "en"', () => {
      const input = makeInput({ language: 'en' });
      const result = buildNarrationPrompt(input);

      expect(result.systemPrompt).toContain('Respond exclusively in English');
      expect(result.systemPrompt).toContain('creative Game Master');
    });

    it('references the character in the system prompt', () => {
      const input = makeInput({ language: 'en' });
      const result = buildNarrationPrompt(input);

      expect(result.systemPrompt).toContain('Thorin');
      expect(result.systemPrompt).toContain('dwarf');
      expect(result.systemPrompt).toContain('warrior');
    });
  });

  describe('return structure', () => {
    it('returns an object with systemPrompt and userPrompt strings', () => {
      const result = buildNarrationPrompt(makeInput());

      expect(result).toHaveProperty('systemPrompt');
      expect(result).toHaveProperty('userPrompt');
      expect(typeof result.systemPrompt).toBe('string');
      expect(typeof result.userPrompt).toBe('string');
      expect(result.systemPrompt.length).toBeGreaterThan(0);
      expect(result.userPrompt.length).toBeGreaterThan(0);
    });
  });
});
