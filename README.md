# Trixy — KI-gestütztes Rollenspiel

Ein D&D-artiges Rollenspiel für Web und Mobile, bei dem ein Large Language Model (LLM) als Game Master und NPCs fungiert. Spieler kommunizieren per natürlicher Sprache mit der KI, die dynamisch auf Aktionen reagiert, Geschichten erzählt und die Spielwelt verwaltet.

## Features

- Natürliche Sprachinteraktion mit dem KI-Game-Master (Text + optionale Spracheingabe)
- Dynamische Kampagnengenerierung mit einzigartigen Quests
- KI-gesteuerte NPCs mit eigener Persönlichkeit
- D20-Würfelmechanik mit fairem Regelsystem
- Charaktererstellung und -progression (Level 1–20)
- Altersgerechter Inhaltsfilter (ab 12 Jahren)
- Plattformübergreifend: Web, Android, iOS
- Spielstand-Synchronisation über alle Geräte

## Voraussetzungen

- **Node.js** 20 oder höher
- **npm** 9 oder höher

### Node.js installieren (macOS)

```bash
# Option 1: Homebrew
brew install node@20

# Option 2: nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 20
nvm use 20
```

## Installation

```bash
git clone git@github.com:DEIN-USERNAME/trixy.git
cd trixy
npm install
```

## Projekt starten

### Tests ausführen

```bash
# Alle Tests
npm test

# Einzelnes Paket testen
npm test --workspace=packages/shared
npm test --workspace=packages/backend

# Tests im Watch-Modus
npx vitest --workspace=packages/backend
```

### TypeScript Build

```bash
# Alle Pakete bauen
npm run build

# Build-Artefakte löschen
npm run clean
```

### Backend starten

```bash
npm run dev --workspace=packages/backend
```

Das Backend läuft dann auf http://localhost:3000.

> **Hinweis:** Für die KI-Narration wird ein LLM-Provider benötigt (z.B. OpenAI API Key). Ohne diesen funktioniert das Spiel nur mit Mock-Antworten.

### Web-Client starten (Entwicklung)

```bash
npm run dev --workspace=packages/web
```

Öffne dann http://localhost:5173 im Browser.

> **Hinweis:** Der Web-Client benötigt ein laufendes Backend für volle Funktionalität. Ohne Backend werden API-Aufrufe fehlschlagen.

### Mobile-Client (React Native)

```bash
# iOS
cd packages/mobile
npx react-native run-ios

# Android
cd packages/mobile
npx react-native run-android
```

## Projektstruktur

```
trixy/
├── packages/
│   ├── shared/          # Geteilte TypeScript-Typen und Logik
│   ├── backend/         # Node.js Backend (API + Game Engine)
│   │   ├── src/
│   │   │   ├── api/           # REST + WebSocket Gateway
│   │   │   ├── auth/          # Authentifizierung (Email, OAuth)
│   │   │   ├── campaign/      # Kampagnen-Generierung
│   │   │   ├── content-filter/ # Inhaltsfilter-Pipeline
│   │   │   ├── game-engine/   # Würfel, Aktionen, Prompts
│   │   │   ├── input/         # Eingabevalidierung, Speech-to-Text
│   │   │   └── session/       # Spielstand-Persistenz
│   │   └── ...
│   ├── web/             # React Web-Client
│   └── mobile/          # React Native Mobile-Client
├── .kiro/specs/         # Spec-Dokumentation (Requirements, Design, Tasks)
├── tsconfig.base.json   # Gemeinsame TypeScript-Konfiguration
└── package.json         # Monorepo-Root mit Workspaces
```

## Umgebungsvariablen

Erstelle eine `.env`-Datei im `packages/backend/`-Verzeichnis:

```env
# LLM Provider (z.B. OpenAI)
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4

# JWT
JWT_SECRET=dein-geheimer-schluessel
JWT_EXPIRES_IN_MS=3600000

# Server
PORT=3000
HOST=0.0.0.0
```

## Code-Qualität

```bash
# Linting
npm run lint

# Formatierung prüfen
npm run format:check

# Formatierung anwenden
npm run format
```

## Technologie-Stack

- **Sprache:** TypeScript (strict mode)
- **Backend:** Node.js mit Express-artiger API
- **Web:** React + Vite
- **Mobile:** React Native
- **Tests:** Vitest + fast-check (Property-Based Testing)
- **Datenbank:** PostgreSQL (geplant, aktuell In-Memory)
- **Cache:** Redis (geplant)
- **LLM:** Austauschbar (OpenAI, Anthropic, Mistral)

## Lizenz

Privates Projekt.
