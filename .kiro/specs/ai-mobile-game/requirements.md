# Requirements Document

## Introduction

Ein D&D-artiges Rollenspiel für mobile Geräte und Webbrowser, bei dem ein Large Language Model (LLM) als Game Master und als NPCs fungiert. Spieler kommunizieren per natürlicher Sprache (Text und optional Spracheingabe) mit der KI, die dynamisch auf Aktionen reagiert, Geschichten erzählt und die Spielwelt verwaltet. Das Spiel richtet sich an Spieler ab 12 Jahren und soll auf Web, Android und iOS verfügbar sein.

## Glossary

- **Game_Master_AI**: Die KI-Komponente, die als Spielleiter fungiert, die Geschichte vorantreibt, Regeln durchsetzt und auf Spieleraktionen reagiert
- **NPC_AI**: Die KI-Komponente, die nicht-spielbare Charaktere steuert und deren Dialoge und Verhalten generiert
- **Player**: Der menschliche Benutzer, der das Spiel spielt
- **Session**: Eine zusammenhängende Spielsitzung mit persistentem Spielstand
- **Game_World**: Die virtuelle Spielwelt mit Orten, Gegenständen und Ereignissen
- **LLM_Service**: Der externe Large-Language-Model-Dienst, der natürliche Sprache verarbeitet und generiert
- **Content_Filter**: Die Komponente, die generierte Inhalte auf Alterseignung (ab 12) prüft
- **Character**: Ein vom Spieler erstellter Spielcharakter mit Attributen, Fähigkeiten und Inventar
- **Campaign**: Eine zusammenhängende Abenteuergeschichte mit Handlungsstrang und Zielen
- **Input_Processor**: Die Komponente, die Spielereingaben (Text oder Sprache) entgegennimmt und verarbeitet

## Requirements

### Requirement 1: Sprachbasierte Interaktion mit dem Game Master

**User Story:** Als Spieler möchte ich per natürlicher Sprache (Text) mit dem KI-Game-Master kommunizieren, damit ich meine Aktionen frei beschreiben kann, ohne auf vordefinierte Optionen beschränkt zu sein.

#### Acceptance Criteria

1. WHEN the Player submits a text message of 1 to 2000 characters, THE Input_Processor SHALL deliver the message to the Game_Master_AI within 2 seconds
2. WHEN the Game_Master_AI receives a Player message, THE Game_Master_AI SHALL generate a narrative response that references the current scene, Character state, and prior conversation within 10 seconds
3. THE Game_Master_AI SHALL maintain conversation context by referencing prior Player actions, NPC interactions, and narrative events from the current Session across at least the last 50 messages
4. IF the Input_Processor receives a message that is empty, contains only whitespace, or contains only special characters, THEN THE Input_Processor SHALL prompt the Player to rephrase the input
5. IF the LLM_Service is unavailable or the Game_Master_AI fails to generate a response within 10 seconds, THEN THE System SHALL display an error message indicating temporary unavailability and allow the Player to retry the last input
6. IF the Player submits a text message exceeding 2000 characters, THEN THE Input_Processor SHALL reject the message and inform the Player of the maximum allowed length

### Requirement 2: KI-gesteuerte NPCs

**User Story:** Als Spieler möchte ich mit KI-gesteuerten NPCs sprechen können, damit sich die Spielwelt lebendig und reaktiv anfühlt.

#### Acceptance Criteria

1. WHEN the Player addresses an NPC, THE NPC_AI SHALL generate a response within 5 seconds that does not contradict the personality traits, background, or knowledge boundaries defined in the NPC's profile
2. THE NPC_AI SHALL retain and reference details from up to the last 50 Player interactions with that NPC within the same Campaign when contextually relevant to the current dialogue
3. WHEN the Player asks an NPC about events outside the NPC's defined knowledge boundaries, THE NPC_AI SHALL respond without referencing game mechanics, real-world knowledge, or information not assigned to that NPC's profile
4. THE NPC_AI SHALL generate dialogue matching the language register, vocabulary complexity, and speech patterns defined in the NPC's personality profile
5. IF the Player provides empty or unintelligible input to an NPC, THEN THE NPC_AI SHALL respond in-character with a contextual clarification request rather than producing an error or silence

### Requirement 3: Dynamische Kampagnengenerierung

**User Story:** Als Spieler möchte ich, dass der KI-Game-Master dynamisch Abenteuer und Quests generiert, damit jedes Spiel einzigartig ist.

#### Acceptance Criteria

1. WHEN a Player starts a new Campaign, THE Game_Master_AI SHALL generate an initial setting containing at least one location description, one time period reference, and one named NPC, a plot hook describing a central conflict, and at least three possible quest directions each summarized in one to two sentences
2. WHEN the Player performs a decision or action during a Campaign, THE Game_Master_AI SHALL generate subsequent narrative content that explicitly references at least one prior Player decision or action within the current session
3. WHEN the Player completes a quest objective, THE Game_Master_AI SHALL generate follow-up content that references at least one character, location, or event established in a previous quest within the same Campaign
4. THE Game_Master_AI SHALL maintain internal consistency of the Game_World across the entire Campaign such that no generated content contradicts previously established facts about named characters, locations, timelines, or quest outcomes
5. IF the Game_Master_AI fails to generate Campaign content within 30 seconds, THEN THE Game_Master_AI SHALL display an error message indicating the generation failure and allow the Player to retry the generation request without loss of existing Campaign state

### Requirement 4: Charaktererstellung und -verwaltung

**User Story:** Als Spieler möchte ich einen eigenen Charakter erstellen und weiterentwickeln können, damit ich eine persönliche Verbindung zum Spiel aufbaue.

#### Acceptance Criteria

1. WHEN the Player creates a new Character, THE System SHALL provide a selection of at least 3 races, at least 3 classes, at least 4 numeric attributes with values assignable within the range of 1 to 20, and a free-text background story field accepting up to 2000 characters
2. THE System SHALL persist Character data including attributes, inventory, and experience automatically after each state-changing action, so that all progress is retained when the Player returns in a subsequent Session
3. IF Character data persistence fails, THEN THE System SHALL display an error message indicating the save failure and retain the unsaved state in memory until persistence succeeds or the Player explicitly discards changes
4. WHEN the Player gains experience through completing quests, resolving encounters, or achieving objectives, THE System SHALL update the Character's level according to defined experience thresholds, up to a maximum of level 20, and unlock at least 1 new ability per level gained
5. THE Game_Master_AI SHALL reference the Character's race, class, background story, or abilities by name or description in narrative responses at least once per encounter

### Requirement 5: Altersgerechter Inhaltsfilter

**User Story:** Als Elternteil möchte ich sicherstellen, dass alle generierten Inhalte für Spieler ab 12 Jahren geeignet sind, damit mein Kind das Spiel sicher nutzen kann.

#### Acceptance Criteria

1. THE Content_Filter SHALL evaluate all Game_Master_AI and NPC_AI responses before delivery to the Player
2. IF the Content_Filter detects content unsuitable for players aged 12 and above, THEN THE Content_Filter SHALL block the response and request a regeneration from the LLM_Service, up to a maximum of 3 regeneration attempts
3. THE Content_Filter SHALL block content containing graphic depictions of injury or death, sexual content, hate speech, and substance abuse glorification, while permitting non-graphic combat descriptions and age-appropriate conflict relevant to gameplay
4. WHEN the Content_Filter blocks a response, THE System SHALL log the incident category, the originating service identifier, and a timestamp for quality monitoring without storing the blocked content
5. IF the Content_Filter fails to obtain a suitable response after 3 regeneration attempts, THEN THE System SHALL deliver a predefined safe fallback response to the Player indicating that the action cannot be narrated
6. WHEN the Content_Filter triggers a regeneration, THE System SHALL deliver the final approved response to the Player within 5 seconds of the original request

### Requirement 6: Plattformübergreifende Verfügbarkeit

**User Story:** Als Spieler möchte ich das Spiel auf meinem Handy (Android/iOS) und im Webbrowser spielen können, damit ich flexibel bin, wo ich spiele.

#### Acceptance Criteria

1. THE System SHALL provide a game client for Android devices running version 10 or higher that allows the Player to complete all core gameplay actions (starting a game, making moves, viewing results) without platform-specific limitations
2. THE System SHALL provide a game client for iOS devices running version 15 or higher that allows the Player to complete all core gameplay actions (starting a game, making moves, viewing results) without platform-specific limitations
3. THE System SHALL provide a game client accessible via web browsers Chrome (version 110+), Firefox (version 110+), Safari (version 16+), and Edge (version 110+) that allows the Player to complete all core gameplay actions (starting a game, making moves, viewing results) without platform-specific limitations
4. WHEN the Player switches between platforms, THE System SHALL synchronize the Session state within 5 seconds so that the Player's game progress, scores, and current game position are restored on the target platform
5. IF synchronization of Session state fails due to network unavailability, THEN THE System SHALL display an error message indicating the sync failure and retain the last known local Session state until connectivity is restored

### Requirement 7: Spielstand-Persistenz

**User Story:** Als Spieler möchte ich meinen Spielstand speichern und laden können, damit ich jederzeit weiterspielen kann.

#### Acceptance Criteria

1. WHEN the Player performs an action that changes the Session state, THE System SHALL automatically save the Session state including Character data, Campaign progress, and conversation history within 3 seconds
2. WHEN the Player returns to the game, THE System SHALL restore the most recent Session state including Character data, Campaign progress, and the last 200 conversation messages within 5 seconds
3. THE System SHALL support at least 5 saved Campaigns per Player account
4. IF a save operation fails, THEN THE System SHALL notify the Player with an error indication and retry the save operation up to 3 times with a maximum interval of 5 seconds between retries
5. IF all save retry attempts are exhausted without success, THEN THE System SHALL display a persistent warning to the Player indicating that the current progress has not been saved and SHALL preserve the unsaved state in local memory until the next successful save

### Requirement 8: Optionale Spracheingabe

**User Story:** Als Spieler möchte ich optional per Spracheingabe mit dem Spiel interagieren können, damit die Kommunikation natürlicher wirkt.

#### Acceptance Criteria

1. WHERE voice input is enabled, WHEN the Player provides spoken input, THE Input_Processor SHALL convert the spoken input to text within 5 seconds using speech-to-text processing
2. WHERE voice input is enabled, THE Input_Processor SHALL support German and English language recognition, with the active recognition language selected by the Player in settings
3. WHEN speech-to-text conversion produces a confidence score below 70%, THE Input_Processor SHALL display the transcribed text and ask the Player for confirmation before processing the input
4. IF voice input is not available or not enabled, THEN THE System SHALL provide all game features accessible via text input without loss of functionality
5. IF speech-to-text conversion fails or does not return a result within 5 seconds, THEN THE Input_Processor SHALL display an error message indicating the voice input could not be processed and prompt the Player to enter text input instead

### Requirement 9: Würfelmechanik und Regelsystem

**User Story:** Als Spieler möchte ich ein faires Regelsystem mit Würfelmechanik haben, damit Aktionen nachvollziehbare Erfolgs- und Misserfolgschancen haben.

#### Acceptance Criteria

1. WHEN the Player attempts an action with uncertain outcome, THE Game_Master_AI SHALL select the relevant Character skill, assign a difficulty value between 1 and 20, and initiate a dice roll
2. THE System SHALL simulate dice rolls by generating a uniformly distributed pseudorandom integer between 1 and 20 (inclusive)
3. WHEN a dice roll is performed, THE System SHALL display the unmodified roll result (1-20), applicable Character attribute modifiers, the difficulty value, and whether the action succeeded or failed
4. THE Game_Master_AI SHALL incorporate dice roll results into the narrative response by describing the action's outcome consistent with the success or failure determination
5. WHEN the sum of the dice roll result and applicable Character attribute modifiers equals or exceeds the difficulty value, THE System SHALL determine the action as successful; otherwise THE System SHALL determine the action as failed
6. IF the Game_Master_AI determines that a Player action has a guaranteed outcome (no meaningful chance of failure or success), THEN THE Game_Master_AI SHALL resolve the action narratively without initiating a dice roll

### Requirement 10: Benutzerregistrierung und Authentifizierung

**User Story:** Als Spieler möchte ich ein Benutzerkonto erstellen, damit meine Spielstände sicher gespeichert und plattformübergreifend verfügbar sind.

#### Acceptance Criteria

1. THE System SHALL allow Player registration with email and password, where the email must be a valid email format, and the password must be between 8 and 128 characters containing at least one uppercase letter, one lowercase letter, and one digit
2. THE System SHALL support authentication via third-party providers (Google, Apple)
3. WHEN the Player provides valid credentials, THE System SHALL grant access to the Player's saved data within 3 seconds
4. IF authentication fails three consecutive times, THEN THE System SHALL temporarily lock the account for 15 minutes and display a message indicating the lock reason and remaining duration
5. IF the Player attempts to register with an email address already associated with an existing account, THEN THE System SHALL reject the registration and display a message indicating that the email is already in use
6. IF a third-party authentication provider is unavailable, THEN THE System SHALL display a message indicating the provider is temporarily unavailable within 5 seconds of the connection attempt
