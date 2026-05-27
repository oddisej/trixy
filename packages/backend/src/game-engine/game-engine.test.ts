import { describe, it, expect, vi } from 'vitest';
import { GameEngine, type EngineResponse } from './game-engine.js';
import { InputProcessor } from '../input/input-processor.js';
import { ContentFilterPipeline } from '../content-filter/content-filter.js';
import type {
  SessionState,
  ConversationMessage,
  Character,
  SceneSnapshot,
  ActionResolution,
} from '@trixy/shared';
import type {
  SessionLoader,
  SessionPersister,
  LLMAdapter,
  ActionClassifier,
  DiceRoller,
  LLMNarrationResult,
  ActionClassification,
  PlayerMessageInput,
} from './game-engine.js';

// ─── Test helpers ────────────────────────────────────────────────────────────

function createMockCharacter(): Character {
  return {
    id: 'char-1',
    userId: 'user-1',
    name: 'Thorin',
    race: 'dwarf',
    class: 'warrior',
    level: 5,
    experience: 1200,
    attributes: { strength: 16, dexterity: 10, intelligence: 8, charisma: 12 },
    abilities: [{ id: 'a1', name: 'Shield Bash', unlockedAtLevel: 3 }],
    inventory: [],
    backgroundStory: 'A brave dwarf warrior from the mountains.',
  };
}

function createMockScene(): SceneSnapshot {
  return {
    locationName: 'Dunkler Wald',
    description: 'Ein dichter, nebelverhangener Wald.',
    presentNPCs: ['Elara'],
    timeOfDay: 'Nacht',
  };
}

function createMockSession(): SessionState {
  return {
    campaignId: 'campaign-1',
    character: createMockCharacter(),
    conversation: [
      {
        id: 'msg-1',
        campaignId: 'campaign-1',
        role: 'player',
        text: 'Ich betrete den Wald.',
        origin: 'text',
        createdAt: new Date('2024-01-01T10:00:00Z'),
      },
      {
        id: 'msg-2',
        campaignId: 'campaign-1',
        role: 'gm',
        text: 'Der Wald ist dunkel und still.',
        origin: 'text',
        createdAt: new Date('2024-01-01T10:00:05Z'),
      },
    ],
    currentScene: createMockScene(),
    lastSavedAt: new Date('2024-01-01T10:00:05Z'),
  };
}

function createMockDeps(overrides?: Partial<{
  sessionLoader: SessionLoader;
  sessionPersister: SessionPersister;
  llmAdapter: LLMAdapter;
  actionClassifier: ActionClassifier;
  diceRoller: DiceRoller;
}>) {
  const sessionLoader: SessionLoader = {
    loadSession: vi.fn().mockResolvedValue(createMockSession()),
    ...overrides?.sessionLoader,
  };

  const sessionPersister: SessionPersister = {
    appendMessage: vi.fn().mockResolvedValue(undefined),
    saveSessionState: vi.fn().mockResolvedValue(undefined),
    ...overrides?.sessionPersister,
  };

  const llmAdapter: LLMAdapter = {
    generateNarration: vi.fn().mockResolvedValue({
      kind: 'ok',
      text: 'Thorin schreitet mutig durch den dunklen Wald. Die Bäume scheinen zu flüstern.',
    } satisfies LLMNarrationResult),
    ...overrides?.llmAdapter,
  };

  const contentFilterProvider = {
    evaluate: vi.fn().mockResolvedValue({ kind: 'approved' }),
  };

  const contentFilterRegenerator = {
    regenerate: vi.fn().mockResolvedValue('regenerated text'),
  };

  const contentFilter = new ContentFilterPipeline(contentFilterProvider, contentFilterRegenerator);

  const actionClassifier: ActionClassifier = {
    classify: vi.fn().mockResolvedValue({
      needsDiceRoll: false,
    } satisfies ActionClassification),
    ...overrides?.actionClassifier,
  };

  const diceRoller: DiceRoller = {
    rollD20: vi.fn().mockReturnValue(15),
    ...overrides?.diceRoller,
  };

  const engine = new GameEngine({
    inputProcessor: new InputProcessor(),
    sessionLoader,
    sessionPersister,
    llmAdapter,
    contentFilter,
    actionClassifier,
    diceRoller,
  });

  return {
    engine,
    sessionLoader,
    sessionPersister,
    llmAdapter,
    contentFilter,
    contentFilterProvider,
    contentFilterRegenerator,
    actionClassifier,
    diceRoller,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GameEngine', () => {
  describe('handlePlayerMessage - happy path', () => {
    it('should return narration response for valid input without dice roll', async () => {
      const { engine, sessionPersister } = createMockDeps();

      const input: PlayerMessageInput = {
        sessionId: 'session-1',
        rawText: 'Ich schaue mich um.',
        origin: 'text',
        language: 'de',
      };

      const result = await engine.handlePlayerMessage(input);

      expect(result.kind).toBe('narration');
      if (result.kind === 'narration') {
        expect(result.text).toBe(
          'Thorin schreitet mutig durch den dunklen Wald. Die Bäume scheinen zu flüstern.',
        );
        expect(result.mechanics).toBeUndefined();
      }

      // Verify persistence was called for both player and GM messages
      expect(sessionPersister.appendMessage).toHaveBeenCalledTimes(2);
      const calls = (sessionPersister.appendMessage as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls[0][0]).toBe('campaign-1');
      expect(calls[0][1].role).toBe('player');
      expect(calls[0][1].text).toBe('Ich schaue mich um.');
      expect(calls[1][0]).toBe('campaign-1');
      expect(calls[1][1].role).toBe('gm');
    });

    it('should return narration with mechanics when dice roll is needed', async () => {
      const actionClassifier: ActionClassifier = {
        classify: vi.fn().mockResolvedValue({
          needsDiceRoll: true,
          resolutionInput: {
            attribute: 'strength' as const,
            difficulty: 12,
            characterModifiers: 3,
          },
        } satisfies ActionClassification),
      };

      const diceRoller: DiceRoller = {
        rollD20: vi.fn().mockReturnValue(14),
      };

      const { engine } = createMockDeps({ actionClassifier, diceRoller });

      const input: PlayerMessageInput = {
        sessionId: 'session-1',
        rawText: 'Ich versuche die Tür aufzubrechen.',
        origin: 'text',
        language: 'de',
      };

      const result = await engine.handlePlayerMessage(input);

      expect(result.kind).toBe('narration');
      if (result.kind === 'narration') {
        expect(result.mechanics).toBeDefined();
        expect(result.mechanics!.rollResult).toBe(14);
        expect(result.mechanics!.modifier).toBe(3);
        expect(result.mechanics!.difficulty).toBe(12);
        expect(result.mechanics!.total).toBe(17);
        expect(result.mechanics!.succeeded).toBe(true);
      }
    });
  });

  describe('handlePlayerMessage - input validation', () => {
    it('should return input_rejected with reason "empty" for empty input', async () => {
      const { engine } = createMockDeps();

      const result = await engine.handlePlayerMessage({
        sessionId: 'session-1',
        rawText: '',
        origin: 'text',
      });

      expect(result).toEqual({ kind: 'input_rejected', reason: 'empty' });
    });

    it('should return input_rejected with reason "too_long" for oversized input', async () => {
      const { engine } = createMockDeps();

      const result = await engine.handlePlayerMessage({
        sessionId: 'session-1',
        rawText: 'a'.repeat(2001),
        origin: 'text',
      });

      expect(result).toEqual({ kind: 'input_rejected', reason: 'too_long' });
    });

    it('should return input_rejected with reason "invalid" for whitespace-only input', async () => {
      const { engine } = createMockDeps();

      const result = await engine.handlePlayerMessage({
        sessionId: 'session-1',
        rawText: '   \t\n  ',
        origin: 'text',
      });

      expect(result).toEqual({ kind: 'input_rejected', reason: 'invalid' });
    });

    it('should return input_rejected with reason "invalid" for special-chars-only input', async () => {
      const { engine } = createMockDeps();

      const result = await engine.handlePlayerMessage({
        sessionId: 'session-1',
        rawText: '!!!???...',
        origin: 'text',
      });

      expect(result).toEqual({ kind: 'input_rejected', reason: 'invalid' });
    });
  });

  describe('handlePlayerMessage - error paths', () => {
    it('should return temporarily_unavailable when session cannot be loaded', async () => {
      const sessionLoader: SessionLoader = {
        loadSession: vi.fn().mockResolvedValue(null),
      };

      const { engine } = createMockDeps({ sessionLoader });

      const result = await engine.handlePlayerMessage({
        sessionId: 'nonexistent',
        rawText: 'Hallo',
        origin: 'text',
      });

      expect(result).toEqual({ kind: 'temporarily_unavailable', retryable: true });
    });

    it('should return temporarily_unavailable when LLM is unavailable', async () => {
      const llmAdapter: LLMAdapter = {
        generateNarration: vi.fn().mockResolvedValue({
          kind: 'error',
          reason: 'unavailable',
        } satisfies LLMNarrationResult),
      };

      const { engine } = createMockDeps({ llmAdapter });

      const result = await engine.handlePlayerMessage({
        sessionId: 'session-1',
        rawText: 'Ich gehe weiter.',
        origin: 'text',
      });

      expect(result).toEqual({ kind: 'temporarily_unavailable', retryable: true });
    });

    it('should return temporarily_unavailable when LLM times out', async () => {
      const llmAdapter: LLMAdapter = {
        generateNarration: vi.fn().mockResolvedValue({
          kind: 'error',
          reason: 'timeout',
        } satisfies LLMNarrationResult),
      };

      const { engine } = createMockDeps({ llmAdapter });

      const result = await engine.handlePlayerMessage({
        sessionId: 'session-1',
        rawText: 'Ich gehe weiter.',
        origin: 'text',
      });

      expect(result).toEqual({ kind: 'temporarily_unavailable', retryable: true });
    });

    it('should return safe_fallback when content filter blocks all attempts', async () => {
      const { engine, contentFilterProvider } = createMockDeps();

      // Make the filter always block
      contentFilterProvider.evaluate.mockResolvedValue({
        kind: 'blocked',
        categories: ['graphic_violence'],
      });

      const result = await engine.handlePlayerMessage({
        sessionId: 'session-1',
        rawText: 'Ich greife den Drachen an.',
        origin: 'text',
      });

      expect(result.kind).toBe('safe_fallback');
      if (result.kind === 'safe_fallback') {
        expect(result.text).toBe('Diese Aktion lässt sich gerade nicht erzählen.');
      }
    });
  });

  describe('handlePlayerMessage - integration details', () => {
    it('should pass the player message text to the LLM adapter', async () => {
      const { engine, llmAdapter } = createMockDeps();

      await engine.handlePlayerMessage({
        sessionId: 'session-1',
        rawText: 'Ich öffne die Truhe.',
        origin: 'text',
        language: 'de',
      });

      expect(llmAdapter.generateNarration).toHaveBeenCalledWith(
        expect.objectContaining({
          playerMessage: 'Ich öffne die Truhe.',
          language: 'de',
          timeoutMs: 10_000,
        }),
      );
    });

    it('should call actionClassifier with validated text and session', async () => {
      const { engine, actionClassifier } = createMockDeps();

      await engine.handlePlayerMessage({
        sessionId: 'session-1',
        rawText: 'Ich klettere den Baum hoch.',
        origin: 'text',
      });

      expect(actionClassifier.classify).toHaveBeenCalledWith(
        'Ich klettere den Baum hoch.',
        expect.objectContaining({ campaignId: 'campaign-1' }),
      );
    });

    it('should default language to "de" when not specified', async () => {
      const { engine, llmAdapter } = createMockDeps();

      await engine.handlePlayerMessage({
        sessionId: 'session-1',
        rawText: 'Hallo Welt',
        origin: 'text',
      });

      expect(llmAdapter.generateNarration).toHaveBeenCalledWith(
        expect.objectContaining({ language: 'de' }),
      );
    });
  });
});
