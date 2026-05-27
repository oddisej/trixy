# Implementation Plan: AI Mobile Game

## Overview

Inkrementelle Implementierung des KI-gestützten Rollenspiels in TypeScript: ein gemeinsames Backend (Node.js + TypeScript) mit REST/WebSocket-API, ein React-Web-Client und ein React-Native-Mobile-Client. Die Implementierung folgt der in `design.md` definierten Schichtenarchitektur (Auth, Session, Game Engine, Content Filter, LLM/STT-Adapter) und integriert die 24 Korrektheits-Properties als `fast-check`-Property-Tests nahe der jeweiligen Implementierung.

Convert the feature design into a series of prompts for a code-generation LLM that will implement each step with incremental progress. Make sure that each prompt builds on the previous prompts, and ends with wiring things together. There should be no hanging or orphaned code that isn't integrated into a previous step. Focus ONLY on tasks that involve writing, modifying, or testing code.

## Tasks

- [x] 1. Projektstruktur und gemeinsame Typen einrichten
  - [x] 1.1 Monorepo-Struktur und TypeScript-Konfiguration aufsetzen
    - Workspace-Layout anlegen: `packages/shared`, `packages/backend`, `packages/web`, `packages/mobile`
    - Root- und Package-`tsconfig.json` mit strikten Optionen, gemeinsame ESLint/Prettier-Konfiguration
    - Build- und Test-Skripte (`npm run build`, `npm run test`) je Paket
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 1.2 Geteilte TypeScript-Typen und Domain-Modelle definieren
    - In `packages/shared/src/types`: `User`, `Character`, `Campaign`, `WorldState`, `NPCProfile`, `Quest`, `SessionState`, `ConversationMessage`, `ActionResolution`, `FilterVerdict`, `ContentFilterLogEntry`, `AuthResult`, `SaveResult`, `RawInput`, `InputError`, `TranscriptionResult`
    - Enum-/Union-Typen für `BlockCategory`, `Race`, `CharacterClass`, `AttributeKey`
    - Re-Export-Barrel `index.ts`
    - _Requirements: 4.1, 5.3, 7.2, 9.3, 10.1_

  - [x]* 1.3 Test-Framework und PBT-Bibliothek einrichten
    - Vitest und `fast-check` in allen Paketen konfigurieren
    - Globale Test-Setup-Datei mit Standard-Optionen (`numRuns: 100`)
    - Beispiel-Property-Test als Smoke-Check
    - _Requirements: keine direkte Anforderung (Test-Infrastruktur)_

- [x] 2. Auth Service implementieren
  - [x] 2.1 Email- und Passwort-Validierung implementieren
    - Reine Validierungsfunktionen `validateEmail(s)` (RFC-5322) und `validatePassword(s)` (8–128 Zeichen, ≥1 Groß-, ≥1 Kleinbuchstabe, ≥1 Ziffer)
    - Spezifische Validierungs-Fehlertypen `invalid_email_format`, `invalid_password_format`
    - _Requirements: 10.1_

  - [x]* 2.2 Property-Test für Anmeldedaten-Validierung
    - **Property 22: Anmeldedaten-Validierung**
    - **Validates: Requirements 10.1**
    - Mit `fast-check` über generierten Email- und Passwort-Strings prüfen, dass die Akzeptanz exakt der Spezifikation entspricht
    - _Requirements: 10.1_

  - [x] 2.3 Registrierung mit Email-Eindeutigkeit implementieren
    - `AuthService.register` mit Persistenz-Stub und case-insensitivem Eindeutigkeitscheck
    - Rückgabe `email_in_use` bei vorhandener Adresse, ohne den existierenden Account zu verändern
    - _Requirements: 10.5_

  - [x]* 2.4 Property-Test für Email-Eindeutigkeit
    - **Property 24: E-Mail-Eindeutigkeit**
    - **Validates: Requirements 10.5**
    - Folgen von Registrierungsversuchen mit zufälliger Groß-/Kleinschreibung; nach erstem Erfolg liefern weitere Versuche mit derselben Adresse `email_in_use`
    - _Requirements: 10.5_

  - [x] 2.5 Login mit Account-Lock implementieren
    - Zähler `failedLoginCount`, Sperre für 15 Minuten nach 3 aufeinanderfolgenden Fehlversuchen, Rückgabe `account_locked` mit `remainingSeconds`
    - Reset des Zählers bei erfolgreichem Login
    - _Requirements: 10.3, 10.4_

  - [x]* 2.6 Property-Test für Account-Lock
    - **Property 23: Account-Lock nach 3 Fehlversuchen**
    - **Validates: Requirements 10.4**
    - Generierte Folge von Fehl- und Erfolgsversuchen; Sperre exakt nach 3 Fehlversuchen, korrekte `remainingSeconds`-Angabe
    - _Requirements: 10.4_

  - [x] 2.7 OAuth-Integration (Google, Apple) und Provider-Fehlerbehandlung
    - `loginWithProvider` mit ID-Token-Verifikation, Mapping auf bestehenden oder neuen `User`
    - Rückgabe `provider_unavailable` bei Timeout (5 s)
    - _Requirements: 10.2, 10.6_

  - [x]* 2.8 Unit-Tests für OAuth-Flows
    - Erfolgreicher Login, neuer Account, ungültiges Token, Provider-Timeout
    - _Requirements: 10.2, 10.6_

- [x] 3. Input Processor und Speech-to-Text implementieren
  - [x] 3.1 Text-Eingabevalidierung implementieren
    - `InputProcessor.process` für Text-Eingaben: Leer/Whitespace/Sonderzeichen-Erkennung, Längencheck 1–2000 Zeichen, Rückgabe spezifischer `InputError`
    - _Requirements: 1.4, 1.6_

  - [x]* 3.2 Property-Test für Eingabevalidierung
    - **Property 2: Eingabevalidierung erkennt unbrauchbare Eingaben**
    - **Validates: Requirements 1.4**
    - Generierte Strings aus Whitespace-, Sonderzeichen- und alphanumerischen Zeichen mischen; Akzeptanz genau dann, wenn ≥1 alphanumerisches Zeichen vorhanden
    - _Requirements: 1.4_

  - [x]* 3.3 Property-Test für Längenvalidierung
    - **Property 3: Längenvalidierung von Texteingaben**
    - **Validates: Requirements 1.6**
    - Generierte Strings unterschiedlicher Längen prüfen die Schwelle bei 2000 Zeichen
    - _Requirements: 1.6_

  - [x] 3.4 Speech-to-Text-Adapter mit Konfidenz-Handling implementieren
    - `SpeechToTextAdapter.transcribe` mit 5-s-Timeout, Sprachwahl `de`/`en`, Mapping auf `ok` / `low_confidence` / `failed`
    - Schwelle `confidence < 0.7` löst `low_confidence`-Pfad aus
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

  - [x]* 3.5 Property-Test für Konfidenz-Schwelle
    - **Property 16: Spracheingabe-Confidence-Schwelle**
    - **Validates: Requirements 8.3**
    - Generierte Konfidenzwerte; Bestätigungspflicht genau dann, wenn `conf < 0.7`
    - _Requirements: 8.3_

  - [x]* 3.6 Property-Test für Feature-Parität von Text- und Spracheingabe
    - **Property 17: Feature-Parität von Text- und Spracheingabe**
    - **Validates: Requirements 8.4**
    - Über die Menge der `PlayerAction`-Typen prüfen, dass jede Aktion einen Text-Pfad besitzt; bei deaktiviertem Voice-Input liefert die Routing-Logik denselben Aktionsraum
    - _Requirements: 8.4_

- [x] 4. Checkpoint - Sicherstellen, dass Tests laufen
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Game Engine: Würfel und Aktionsauflösung
  - [x] 5.1 Uniformen d20-Wurf implementieren
    - `rollD20()` mit kryptographisch oder pseudozufällig gleichverteilter Ganzzahl in `[1, 20]`; injizierbarer RNG für Tests
    - _Requirements: 9.2_

  - [x]* 5.2 Property-Test für Würfel-Gleichverteilung
    - **Property 18: Würfel ist gleichverteilt im Bereich 1–20**
    - **Validates: Requirements 9.2**
    - Statistischer Property-Test mit n ≥ 1000 Würfen, Range-Check und Chi-Quadrat-Test (p > 0.01)
    - _Requirements: 9.2_

  - [x] 5.3 Aktionsauflösung implementieren
    - `resolveAction` baut `ActionResolution` aus `rollResult`, `modifier`, `difficulty`, `total = rollResult + modifier`, `succeeded = total >= difficulty`
    - Trennung `uncertain_outcome` vs `guaranteed_outcome` (kein Wurf)
    - _Requirements: 9.1, 9.3, 9.5, 9.6_

  - [x]* 5.4 Property-Test für Würfel-Erfolgsregel
    - **Property 19: Würfel-Erfolgsregel**
    - **Validates: Requirements 9.3, 9.5**
    - Generierte `(rollResult, modifier, difficulty)`-Tupel; Pflichtfelder vorhanden, `succeeded` und `total` korrekt
    - _Requirements: 9.3, 9.5_

  - [x]* 5.5 Property-Test für Wurf nur bei unsicherem Ausgang
    - **Property 20: Wurf nur bei unsicherem Ausgang**
    - **Validates: Requirements 9.1, 9.6**
    - Generierte Aktionsspezifikationen mit `uncertain_outcome`/`guaranteed_outcome`; `ActionResolution` exakt dann erzeugt, wenn unsicher
    - _Requirements: 9.1, 9.6_

- [x] 6. Game Engine: Charakterverwaltung
  - [x] 6.1 Charaktererstellungs-Validierung implementieren
    - Reine Funktion `validateCharacter(input)`: Attributwerte in `[1, 20]`, mind. 4 Attribute, Rasse aus angebotenem Set (≥3), Klasse aus angebotenem Set (≥3), `backgroundStory` 0–2000 Zeichen
    - Spezifische Validierungs-Fehlertypen je verletztem Feld
    - _Requirements: 4.1_

  - [x]* 6.2 Property-Test für Charaktererstellungs-Validierung
    - **Property 8: Charakter-Erstellung validiert Eingabegrenzen**
    - **Validates: Requirements 4.1**
    - Generierte Charaktereingaben; Akzeptanz genau dann, wenn alle Bedingungen erfüllt sind
    - _Requirements: 4.1_

  - [x] 6.3 Erfahrungs- und Level-Progression implementieren
    - `applyExperience(character, xpDelta)` mit Levelschwellen, Cap auf Level 20, mind. 1 neue Ability pro gewonnenem Level
    - Determinismus unabhängig von der Aufteilung der XP-Summe
    - _Requirements: 4.4_

  - [x]* 6.4 Property-Test für Level-Cap und Ability-Vergabe
    - **Property 10: Levelaufstieg respektiert Cap und Ability-Vergabe**
    - **Validates: Requirements 4.4**
    - Generierte XP-Sequenzen; `level' <= 20`, `level' >= level`, ≥k neue Abilities bei k Level-Ups, gleicher Endzustand bei Permutationen mit gleicher Summe
    - _Requirements: 4.4_

- [x] 7. Game Engine: Konversations-Kontext und Prompt-Builder
  - [x] 7.1 Konversations-Kontext-Builder implementieren
    - `buildConversationContext(messages)` liefert `min(N, 50)` jüngste Nachrichten in chronologischer Reihenfolge
    - Wiederverwendbar für GM- und NPC-Kontexte
    - _Requirements: 1.3, 2.2_

  - [x]* 7.2 Property-Test für Kontextfenster
    - **Property 1: Kontextfenster enthält die jüngsten N Nachrichten**
    - **Validates: Requirements 1.3, 2.2**
    - Generierte Nachrichtenlisten; Länge `min(N, 50)`, korrekte Auswahl der jüngsten, chronologisch
    - _Requirements: 1.3, 2.2_

  - [x] 7.3 Prompt-Builder mit Welt- und Charakterbezug implementieren
    - `buildNarrationPrompt({character, scene, worldState, history, diceResult, language})` referenziert mind. ein Element aus Aktionshistorie und ggf. eines aus `worldState.knownNPCs`/`knownLocations`
    - Bindet Charaktermerkmale (Rasse, Klasse, Background, Abilities) namentlich/beschreibend ein
    - _Requirements: 3.2, 3.3, 4.5_

  - [x]* 7.4 Property-Test für Kampagnen-Historie im Prompt
    - **Property 5: Prompt-Builder bindet Kampagnen-Historie ein**
    - **Validates: Requirements 3.2, 3.3, 4.5**
    - Generierte Kampagnen-Zustände; Prompt enthält erkennbare Referenzen
    - _Requirements: 3.2, 3.3, 4.5_

  - [x]* 7.5 Property-Test für Würfel-Ergebnis im Narrations-Prompt
    - **Property 21: Würfel-Ergebnis ist im Narrations-Prompt enthalten**
    - **Validates: Requirements 9.4**
    - Generierte `ActionResolution`-Werte; Prompt enthält strukturierte Felder `rollResult`, `modifier`, `difficulty`, `succeeded`
    - _Requirements: 9.4_

- [x] 8. Kampagnen-Generierung und World-State
  - [x] 8.1 Campaign-Seed-Generierung implementieren
    - `generateCampaignSeed` ruft LLM-Adapter, validiert/normalisiert Ergebnis: ≥1 Location, ≥1 benannter NPC, nicht-leerer Plot-Hook, ≥3 Quest-Beschreibungen mit 1–2 Sätzen
    - Bei Verstoß einmalige Re-Anforderung beim LLM mit Korrektur-Prompt
    - _Requirements: 3.1_

  - [x]* 8.2 Property-Test für Campaign-Seed-Struktur
    - **Property 4: Campaign-Seed enthält erforderliche Strukturelemente**
    - **Validates: Requirements 3.1**
    - Mit gestubbtem LLM-Adapter generierte Seeds; Strukturanforderungen erfüllt
    - _Requirements: 3.1_

  - [x] 8.3 World-State mit Faktenkonsistenz implementieren
    - `applyFact(worldState, fact)`: erkennt Widersprüche zu existierenden `establishedFacts`, lehnt ab oder ersetzt gemäß Vorrangregel ohne Inkonsistenz
    - Aktualisiert `knownNPCs`, `knownLocations`, `timeline`
    - _Requirements: 3.4_

  - [x]* 8.4 Property-Test für World-State-Konsistenz
    - **Property 6: World-State-Konsistenz beim Faktenupdate**
    - **Validates: Requirements 3.4**
    - Generierte Folgen von Fakten; nach jedem `applyFact` keine zueinander widersprüchlichen Fakten gleichzeitig vorhanden
    - _Requirements: 3.4_

  - [x] 8.5 Fehlerbehandlung der Campaign-Generierung implementieren
    - 30-s-Timeout, Provider-Fehler; bei Fehler bleibt der gespeicherte `Campaign`-State unverändert, Retry möglich
    - _Requirements: 3.5_

  - [x]* 8.6 Property-Test für State-Erhalt bei Generierungsfehler
    - **Property 7: Generierungs-Fehler erhalten Campaign-State**
    - **Validates: Requirements 3.5**
    - Generierte Campaign-States und Fehlerarten; Snapshot vor und nach fehlgeschlagenem Versuch identisch
    - _Requirements: 3.5_

- [x] 9. Checkpoint - Sicherstellen, dass Tests laufen
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Content Filter Pipeline
  - [x] 10.1 Content Filter mit Regenerationspipeline implementieren
    - `ContentFilter.evaluate(text)` und Pipeline-Wrapper, der bei `blocked` bis zu 3 Regenerationen über den LLM-Adapter anstößt; danach vordefinierte Safe-Fallback-Antwort
    - Ausgabe wird nur ausgeliefert, wenn entweder `approved` oder Fallback
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6_

  - [x]* 10.2 Property-Test für Filter-Pipeline-Korrektheit
    - **Property 11: Filter-Pipeline-Korrektheit**
    - **Validates: Requirements 5.1, 5.2, 5.5**
    - Generierte LLM-Antwort- und Verdict-Sequenzen; Auslieferung nur nach `approved` oder Fallback, max. 3 Regenerationsversuche
    - _Requirements: 5.1, 5.2, 5.5_

  - [x] 10.3 Filter-Logging implementieren
    - `ContentFilterLogEntry` mit `category`, `serviceId`, `timestamp`; geblockter Inhalt wird nicht persistiert
    - _Requirements: 5.4_

  - [x]* 10.4 Property-Test für Filter-Log-Metadaten
    - **Property 12: Filter-Logging enthält Metadaten ohne Inhalt**
    - **Validates: Requirements 5.4**
    - Generierte Texte und Kategorien; Log-Einträge enthalten Pflichtfelder, kein Substring der Länge ≥8 aus dem Originaltext
    - _Requirements: 5.4_

- [x] 11. Session Service und Persistenz
  - [x] 11.1 Session-Save/Load mit Auto-Save implementieren
    - `saveSessionState` persistiert Character, Campaign-Progress, jüngste 200 Nachrichten innerhalb 3 s
    - `loadSession` stellt jüngste 200 Nachrichten und gesamten State innerhalb 5 s wieder her
    - _Requirements: 4.2, 4.3, 7.1, 7.2_

  - [x]* 11.2 Property-Test für Save/Load-Roundtrip
    - **Property 9: Persistenz ist ein Roundtrip**
    - **Validates: Requirements 4.2, 7.2**
    - Generierte `SessionState`s mit beliebigen Nachrichtenlängen; geladener State ≡ gespeicherter, bei >200 exakt die 200 jüngsten
    - _Requirements: 4.2, 7.2_

  - [x] 11.3 Campaign-Liste mit Kapazität ≥5 implementieren
    - `listCampaigns` und `createCampaign` lassen mind. 5 aktive Campaigns je Account zu, Erstellung scheitert nicht innerhalb dieser Grenze
    - _Requirements: 7.3_

  - [x]* 11.4 Property-Test für Campaign-Kapazität
    - **Property 14: Account erlaubt mindestens 5 Campaigns**
    - **Validates: Requirements 7.3**
    - Generierte Folgen von Erstellungen mit `n <= 5`; alle erfolgreich, finale Liste enthält genau `n` Campaigns
    - _Requirements: 7.3_

  - [x] 11.5 Save-Retry-Logik implementieren
    - Bis zu 3 Retries mit Backoff `<= 5000 ms`; bei dauerhaftem Fehler `permanent_error` und Beibehaltung im In-Memory-Cache
    - _Requirements: 7.4, 7.5_

  - [x]* 11.6 Property-Test für Save-Retry-Limits
    - **Property 15: Save-Retry respektiert Limits**
    - **Validates: Requirements 7.4, 7.5**
    - Generierte Verdict-Sequenzen; max. 3 Retries, Intervalle ≤5 s, In-Memory-State erhalten bei Misserfolg
    - _Requirements: 7.4, 7.5_

- [x] 12. Cross-Platform-Clients und lokaler Sync
  - [x] 12.1 Lokaler optimistischer State-Manager implementieren
    - Im `packages/shared` ein Store, der Aktionen seit letztem Server-Sync queueing-fähig hält und bei Wiederverbindung in Reihenfolge synchronisiert
    - _Requirements: 6.4, 6.5, 7.5_

  - [x]* 12.2 Property-Test für Offline-State-Erhalt
    - **Property 13: Lokaler State überlebt Netzwerkausfall**
    - **Validates: Requirements 6.5**
    - Generierte Aktionssequenzen mit eingestreutem Netzwerkverlust; finaler lokaler State = letzter synchronisierter Server-State + Aktionen in ursprünglicher Reihenfolge
    - _Requirements: 6.5_

  - [x] 12.3 Web-Client (React) mit Core-Flow implementieren
    - Login, Charaktererstellung, Campaign-Liste/Start, Chat-Eingabe (Text), Würfel-Anzeige; konsumiert REST/WebSocket-API
    - Voice-Input optional über Browser-Mikrofon, hinter Toggle
    - _Requirements: 6.3, 8.1, 9.3_

  - [x] 12.4 Mobile-Client (React Native) mit Core-Flow implementieren
    - Gleicher Funktionsumfang wie Web-Client für Android 10+ und iOS 15+
    - Wiederverwendung der `packages/shared`-Logik
    - _Requirements: 6.1, 6.2, 8.1, 9.3_

- [x] 13. Integration und Verdrahtung
  - [x] 13.1 Game Engine mit allen Adaptern verdrahten
    - `handlePlayerMessage` orchestriert: Eingabevalidierung → Würfellogik (falls nötig) → Prompt-Builder → LLM-Adapter → Content-Filter → Persistenz
    - Fehlerpfade auf `EngineResponse`-Varianten abbilden (`temporarily_unavailable`, `safe_fallback`, `input_rejected`)
    - _Requirements: 1.1, 1.2, 1.5, 2.1, 2.5, 5.6, 9.4_

  - [x] 13.2 API Gateway mit REST/WebSocket-Endpoints implementieren
    - Routen für Auth, Sessions, Messages; WebSocket für Streaming-Narration; JWT-Middleware
    - _Requirements: 1.1, 6.1, 6.2, 6.3, 7.1, 10.3_

  - [x]* 13.3 Integrationstests für End-to-End-Flow
    - Mit Mock-LLM und Mock-STT: Login → Charakter → Campaign → Aktion → Save → Reload
    - Latenzbudgets als Soft-Assertions
    - _Requirements: 1.2, 1.5, 6.4, 7.1, 7.2_

- [x] 14. Final-Checkpoint - Sicherstellen, dass alle Tests laufen
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks markiert mit `*` sind optional und können für einen schnelleren MVP übersprungen werden.
- Jeder Task referenziert spezifische Anforderungen für Nachvollziehbarkeit.
- Property-Tests werden mit `fast-check` geschrieben und liegen nahe der jeweiligen Implementierung, damit Fehler früh sichtbar werden.
- Property-Test-Tags folgen dem Format `// Feature: ai-mobile-game, Property {N}: {property_text}`.
- Checkpoints sichern inkrementelle Validierung.
- LLM- und STT-Antworten werden in Property-Tests nicht generiert; stattdessen werden die deterministischen Pipeline-Komponenten geprüft, die auf gestubbten Adapter-Antworten arbeiten.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "3.1", "3.4", "5.1", "6.1", "7.1", "8.3", "10.3", "11.1", "12.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "3.2", "3.3", "3.5", "3.6", "5.2", "5.3", "6.2", "6.3", "7.2", "7.3", "8.1", "8.4", "10.1", "10.4", "11.2", "11.3", "12.2", "12.3", "12.4"] },
    { "id": 4, "tasks": ["2.4", "2.5", "5.4", "5.5", "6.4", "7.4", "7.5", "8.2", "8.5", "10.2", "11.4", "11.5"] },
    { "id": 5, "tasks": ["2.6", "2.7", "8.6", "11.6", "13.1"] },
    { "id": 6, "tasks": ["2.8", "13.2"] },
    { "id": 7, "tasks": ["13.3"] }
  ]
}
```
