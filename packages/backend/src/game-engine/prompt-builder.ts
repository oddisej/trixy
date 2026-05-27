/**
 * Prompt builder for LLM narration requests.
 *
 * Constructs structured prompts that include character traits, scene context,
 * conversation history references, world-state elements, and dice results.
 *
 * Design: The prompt is split into a systemPrompt (role instructions) and a
 * userPrompt (concrete context for the current turn). This separation allows
 * the LLM adapter to map them to the appropriate message roles.
 */

import type {
  Character,
  SceneSnapshot,
  WorldState,
  ConversationMessage,
  ActionResolution,
} from '@trixy/shared';

export interface NarrationPromptInput {
  character: Character;
  scene: SceneSnapshot;
  worldState: WorldState;
  history: ConversationMessage[];
  diceResult?: ActionResolution;
  language: 'de' | 'en';
}

export interface NarrationPrompt {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * Builds a structured narration prompt for the LLM.
 *
 * - References the character's race, class, name, background, and abilities.
 * - Includes the current scene description.
 * - References at least one element from conversation history (last player action).
 * - References at least one NPC or location from worldState (if available).
 * - Includes dice result fields when a diceResult is provided.
 * - Uses the language param to set the system instruction language.
 */
export function buildNarrationPrompt(input: NarrationPromptInput): NarrationPrompt {
  const { character, scene, worldState, history, diceResult, language } = input;

  const systemPrompt = buildSystemPrompt(character, language);
  const userPrompt = buildUserPrompt(character, scene, worldState, history, diceResult);

  return { systemPrompt, userPrompt };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildSystemPrompt(character: Character, language: 'de' | 'en'): string {
  const langInstruction =
    language === 'de'
      ? 'Antworte ausschließlich auf Deutsch.'
      : 'Respond exclusively in English.';

  const roleInstruction =
    language === 'de'
      ? 'Du bist ein kreativer Game Master in einem Fantasy-Rollenspiel.'
      : 'You are a creative Game Master in a fantasy role-playing game.';

  const characterInstruction =
    language === 'de'
      ? `Der Spielercharakter ist ${character.name}, ein${character.race === 'elf' ? '' : 'e'} ${character.race} der Klasse ${character.class}.`
      : `The player character is ${character.name}, a ${character.race} ${character.class}.`;

  const narrativeInstruction =
    language === 'de'
      ? 'Erzähle lebendig und beziehe dich auf vorherige Aktionen, bekannte NPCs und Orte der Spielwelt.'
      : 'Narrate vividly and reference prior actions, known NPCs, and locations of the game world.';

  return [roleInstruction, langInstruction, characterInstruction, narrativeInstruction].join('\n');
}

function buildUserPrompt(
  character: Character,
  scene: SceneSnapshot,
  worldState: WorldState,
  history: ConversationMessage[],
  diceResult?: ActionResolution,
): string {
  const sections: string[] = [];

  // --- Character section ---
  sections.push(buildCharacterSection(character));

  // --- Scene section ---
  sections.push(buildSceneSection(scene));

  // --- World-state references (NPC or Location) ---
  const worldRef = buildWorldStateReference(worldState);
  if (worldRef) {
    sections.push(worldRef);
  }

  // --- History reference (last player action) ---
  const historyRef = buildHistoryReference(history);
  if (historyRef) {
    sections.push(historyRef);
  }

  // --- Dice result section ---
  if (diceResult) {
    sections.push(buildDiceResultSection(diceResult));
  }

  return sections.join('\n\n');
}

function buildCharacterSection(character: Character): string {
  const abilities =
    character.abilities.length > 0
      ? character.abilities.map((a) => a.name).join(', ')
      : 'keine besonderen Fähigkeiten';

  return [
    `[Charakter]`,
    `Name: ${character.name}`,
    `Rasse: ${character.race}`,
    `Klasse: ${character.class}`,
    `Level: ${character.level}`,
    `Hintergrund: ${character.backgroundStory || 'Kein Hintergrund angegeben.'}`,
    `Fähigkeiten: ${abilities}`,
  ].join('\n');
}

function buildSceneSection(scene: SceneSnapshot): string {
  const parts = [`[Szene]`, `Ort: ${scene.locationName}`, `Beschreibung: ${scene.description}`];
  if (scene.presentNPCs.length > 0) {
    parts.push(`Anwesende NPCs: ${scene.presentNPCs.join(', ')}`);
  }
  if (scene.timeOfDay) {
    parts.push(`Tageszeit: ${scene.timeOfDay}`);
  }
  return parts.join('\n');
}

function buildWorldStateReference(worldState: WorldState): string | null {
  // Prefer an NPC reference if available, otherwise fall back to a location.
  if (worldState.knownNPCs.length > 0) {
    const npc = worldState.knownNPCs[0];
    return `[Weltwissen – NPC]\nName: ${npc.name}\nPersönlichkeit: ${npc.personalityTraits.join(', ')}\nHintergrund: ${npc.background}`;
  }

  if (worldState.knownLocations.length > 0) {
    const loc = worldState.knownLocations[0];
    return `[Weltwissen – Ort]\nName: ${loc.name}\nBeschreibung: ${loc.description}`;
  }

  return null;
}

function buildHistoryReference(history: ConversationMessage[]): string | null {
  // Find the most recent player message in history.
  const playerMessages = history.filter((m) => m.role === 'player');
  if (playerMessages.length === 0) {
    return null;
  }

  const lastPlayerAction = playerMessages[playerMessages.length - 1];
  return `[Letzte Spieleraktion]\n${lastPlayerAction.text}`;
}

function buildDiceResultSection(diceResult: ActionResolution): string {
  return [
    `[Würfelergebnis]`,
    `Wurf: ${diceResult.rollResult}`,
    `Modifikator: ${diceResult.modifier}`,
    `Schwierigkeit: ${diceResult.difficulty}`,
    `Gesamt: ${diceResult.total}`,
    `Erfolg: ${diceResult.succeeded ? 'ja' : 'nein'}`,
  ].join('\n');
}
