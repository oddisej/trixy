/**
 * Game Engine — orchestrates the full player message flow.
 *
 * Flow:
 * 1. Validate input via InputProcessor → return `input_rejected` on failure
 * 2. Load session context (conversation history, character, scene, world state)
 * 3. Determine if dice roll is needed (based on action type from LLM decision)
 * 4. If dice needed: resolve action via resolveAction
 * 5. Build narration prompt via buildNarrationPrompt
 * 6. Call LLM adapter to generate narration
 * 7. Filter response via ContentFilterPipeline → may return safe_fallback
 * 8. Persist new state (message + any state changes)
 * 9. Return EngineResponse with narration text and optional dice result
 *
 * Uses dependency injection for all adapters.
 */

import type {
  ActionResolution,
  ActionResolutionInput,
  ConversationMessage,
  SessionState,
  WorldState,
  SceneSnapshot,
  Character,
} from '@trixy/shared';

import { InputProcessor, type ValidatedInput } from '../input/input-processor.js';
import { buildConversationContext } from './context-builder.js';
import { buildNarrationPrompt, type NarrationPrompt } from './prompt-builder.js';
import { resolveAction } from './action-resolution.js';
import {
  ContentFilterPipeline,
  SAFE_FALLBACK_RESPONSE,
  type FilterPipelineResult,
} from '../content-filter/content-filter.js';

// ─── EngineResponse type ─────────────────────────────────────────────────────

export type EngineResponse =
  | { kind: 'narration'; text: string; mechanics?: ActionResolution }
  | { kind: 'input_rejected'; reason: 'empty' | 'too_long' | 'invalid' }
  | { kind: 'temporarily_unavailable'; retryable: true }
  | { kind: 'safe_fallback'; text: string };

// ─── Adapter interfaces (dependency injection) ───────────────────────────────

/**
 * Interface for loading session context from persistence.
 */
export interface SessionLoader {
  loadSession(sessionId: string): Promise<SessionState | null>;
}

/**
 * Interface for persisting session state changes.
 */
export interface SessionPersister {
  appendMessage(campaignId: string, message: ConversationMessage): Promise<void>;
  saveSessionState(state: SessionState): Promise<void>;
}

/**
 * Interface for the LLM adapter that generates narration.
 */
export interface LLMAdapter {
  generateNarration(input: {
    systemPrompt: string;
    userPrompt: string;
    playerMessage: string;
    language: 'de' | 'en';
    timeoutMs: number;
  }): Promise<LLMNarrationResult>;
}

export type LLMNarrationResult =
  | { kind: 'ok'; text: string }
  | { kind: 'error'; reason: 'timeout' | 'unavailable' };

/**
 * Interface for determining whether a dice roll is needed.
 * This could be driven by the LLM (GM decision) or by action type heuristics.
 */
export interface ActionClassifier {
  classify(playerMessage: string, context: SessionState): Promise<ActionClassification>;
}

export interface ActionClassification {
  needsDiceRoll: boolean;
  /** Only present when needsDiceRoll is true */
  resolutionInput?: ActionResolutionInput;
}

/**
 * Injectable dice roller interface.
 */
export interface DiceRoller {
  rollD20(): number;
}

// ─── PlayerMessageInput ──────────────────────────────────────────────────────

export interface PlayerMessageInput {
  sessionId: string;
  rawText: string;
  origin: 'text' | 'voice';
  language?: 'de' | 'en';
}

// ─── GameEngine class ────────────────────────────────────────────────────────

export class GameEngine {
  private readonly inputProcessor: InputProcessor;
  private readonly sessionLoader: SessionLoader;
  private readonly sessionPersister: SessionPersister;
  private readonly llmAdapter: LLMAdapter;
  private readonly contentFilter: ContentFilterPipeline;
  private readonly actionClassifier: ActionClassifier;
  private readonly diceRoller: DiceRoller;

  constructor(deps: {
    inputProcessor: InputProcessor;
    sessionLoader: SessionLoader;
    sessionPersister: SessionPersister;
    llmAdapter: LLMAdapter;
    contentFilter: ContentFilterPipeline;
    actionClassifier: ActionClassifier;
    diceRoller: DiceRoller;
  }) {
    this.inputProcessor = deps.inputProcessor;
    this.sessionLoader = deps.sessionLoader;
    this.sessionPersister = deps.sessionPersister;
    this.llmAdapter = deps.llmAdapter;
    this.contentFilter = deps.contentFilter;
    this.actionClassifier = deps.actionClassifier;
    this.diceRoller = deps.diceRoller;
  }

  /**
   * Orchestrates the full player message flow.
   */
  async handlePlayerMessage(input: PlayerMessageInput): Promise<EngineResponse> {
    // 1. Validate input
    const validationResult = this.inputProcessor.process({ kind: 'text', value: input.rawText });

    if (validationResult.kind !== 'validated_text') {
      return this.mapInputErrorToResponse(validationResult.kind);
    }

    const validatedText = (validationResult as ValidatedInput).text;

    // 2. Load session context
    const session = await this.sessionLoader.loadSession(input.sessionId);
    if (!session) {
      return { kind: 'temporarily_unavailable', retryable: true };
    }

    // 3. Determine if dice roll is needed
    const classification = await this.actionClassifier.classify(validatedText, session);

    // 4. If dice needed: resolve action
    let diceResult: ActionResolution | undefined;
    if (classification.needsDiceRoll && classification.resolutionInput) {
      diceResult = resolveAction(classification.resolutionInput, this.diceRoller);
    }

    // 5. Build narration prompt
    const contextMessages = buildConversationContext(session.conversation);
    const language = input.language ?? 'de';

    const narrationPrompt: NarrationPrompt = buildNarrationPrompt({
      character: session.character,
      scene: session.currentScene,
      worldState: this.extractWorldState(session),
      history: contextMessages,
      diceResult,
      language,
    });

    // 6. Call LLM adapter to generate narration
    const llmResult = await this.llmAdapter.generateNarration({
      systemPrompt: narrationPrompt.systemPrompt,
      userPrompt: narrationPrompt.userPrompt,
      playerMessage: validatedText,
      language,
      timeoutMs: 10_000,
    });

    if (llmResult.kind === 'error') {
      return { kind: 'temporarily_unavailable', retryable: true };
    }

    // 7. Filter response via ContentFilterPipeline
    const filterResult: FilterPipelineResult = await this.contentFilter.filterResponse(
      llmResult.text,
      narrationPrompt.userPrompt,
    );

    // If the filter returned the safe fallback, return safe_fallback response
    if (filterResult.text === SAFE_FALLBACK_RESPONSE) {
      return { kind: 'safe_fallback', text: SAFE_FALLBACK_RESPONSE };
    }

    // 8. Persist new state (player message + GM response)
    const playerMessage: ConversationMessage = {
      id: generateId(),
      campaignId: session.campaignId,
      role: 'player',
      text: validatedText,
      origin: input.origin,
      createdAt: new Date(),
    };

    const gmMessage: ConversationMessage = {
      id: generateId(),
      campaignId: session.campaignId,
      role: 'gm',
      text: filterResult.text,
      origin: 'text',
      createdAt: new Date(),
      diceResult,
    };

    await this.sessionPersister.appendMessage(session.campaignId, playerMessage);
    await this.sessionPersister.appendMessage(session.campaignId, gmMessage);

    // 9. Return EngineResponse
    return {
      kind: 'narration',
      text: filterResult.text,
      mechanics: diceResult,
    };
  }

  /**
   * Maps InputError kinds to EngineResponse input_rejected reasons.
   */
  private mapInputErrorToResponse(
    errorKind: 'empty' | 'whitespace_only' | 'special_chars_only' | 'too_long' | 'voice_failed',
  ): EngineResponse {
    switch (errorKind) {
      case 'empty':
        return { kind: 'input_rejected', reason: 'empty' };
      case 'too_long':
        return { kind: 'input_rejected', reason: 'too_long' };
      case 'whitespace_only':
      case 'special_chars_only':
      case 'voice_failed':
        return { kind: 'input_rejected', reason: 'invalid' };
    }
  }

  /**
   * Extracts WorldState from session. In a full implementation this would
   * come from the campaign's world state. For now we construct a minimal one
   * from the session's scene information.
   */
  private extractWorldState(session: SessionState): WorldState {
    // The session doesn't directly carry WorldState, but in a real implementation
    // the SessionLoader would provide it. We construct a minimal one here.
    return {
      knownNPCs: [],
      knownLocations: [],
      establishedFacts: [],
      timeline: [],
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

let idCounter = 0;

/**
 * Simple ID generator. In production this would use UUID.
 */
function generateId(): string {
  return `msg-${Date.now()}-${++idCounter}`;
}
