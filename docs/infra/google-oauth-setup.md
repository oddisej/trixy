# Google OAuth Konfiguration

Anleitung zur Einrichtung von Google OAuth 2.0 für Trixy.

## 1. Google Cloud Projekt erstellen

1. Öffne die [Google Cloud Console](https://console.cloud.google.com/)
2. Erstelle ein neues Projekt oder wähle ein bestehendes
3. Aktiviere die **Google Identity API** unter APIs & Services → Library

## 2. OAuth Consent Screen konfigurieren

1. Gehe zu APIs & Services → OAuth consent screen
2. Wähle **External** (für alle Google-Accounts) oder **Internal** (nur Organisation)
3. Fülle aus:
   - App-Name: `Trixy`
   - Support-Email: deine E-Mail
   - Authorized domains: deine Domain (z.B. `trixy.example.com`)
4. Scopes hinzufügen:
   - `openid`
   - `email`
   - `profile`
5. Speichern

## 3. OAuth Client-ID erstellen

1. Gehe zu APIs & Services → Credentials
2. Klicke **Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. Name: `Trixy Web Client`
5. Authorized JavaScript origins:
   - `http://localhost:5173` (Entwicklung)
   - `https://trixy.example.com` (Produktion)
6. Authorized redirect URIs:
   - `http://localhost:3000/auth/oauth/google/callback` (Entwicklung)
   - `https://api.trixy.example.com/auth/oauth/google/callback` (Produktion)
7. Speichern → Client-ID und Client-Secret notieren

## 4. Umgebungsvariablen setzen

In `packages/backend/.env`:

```env
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/oauth/google/callback
```

## 5. Flow-Übersicht

```
┌─────────┐     ┌──────────┐     ┌────────────┐     ┌──────────────┐
│  Client  │────▶│  Backend  │────▶│   Google    │────▶│  Consent     │
│  (Web)   │◀────│  /auth/   │◀────│   OAuth     │◀────│  Screen      │
└─────────┘     └──────────┘     └────────────┘     └──────────────┘
     │                │
     │                ▼
     │          JWT Token erstellen
     │          (userId, accessToken)
     │                │
     ◀────────────────┘
```

1. Client klickt "Sign in with Google"
2. Client erhält ein `id_token` von Google (via Google Sign-In SDK)
3. Client sendet `POST /auth/oauth/google` mit `{ idToken: "..." }`
4. Backend verifiziert das `id_token` gegen Google's Public Keys
5. Backend erstellt/findet den User und gibt JWT zurück

## 6. Backend-Implementierung (TODO)

Der Auth-Service unter `packages/backend/src/auth/auth-service.ts` hat bereits die Methode `loginWithProvider()`. Für die vollständige Implementierung muss:

1. Das `id_token` mit der Google Auth Library verifiziert werden:
   ```typescript
   import { OAuth2Client } from 'google-auth-library';
   
   const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
   const ticket = await client.verifyIdToken({
     idToken,
     audience: process.env.GOOGLE_CLIENT_ID,
   });
   const payload = ticket.getPayload();
   // payload.email, payload.sub (Google User ID)
   ```

2. Dependency installieren:
   ```bash
   npm install google-auth-library --workspace=packages/backend
   ```

3. User in der Datenbank anlegen/finden basierend auf `payload.email`
4. JWT-Token generieren und zurückgeben

## 7. Mobile-Client (React Native)

Für iOS/Android wird zusätzlich benötigt:

- **iOS:** Google Sign-In SDK + `REVERSED_CLIENT_ID` in Info.plist
- **Android:** SHA-1 Fingerprint in der Google Cloud Console registrieren

Package: `@react-native-google-signin/google-signin`

```bash
npm install @react-native-google-signin/google-signin --workspace=packages/mobile
```

## 8. Sicherheitshinweise

- Client-Secret **nie** im Frontend-Code oder in Git speichern
- `id_token` immer serverseitig verifizieren (nie nur clientseitig vertrauen)
- Redirect-URIs so restriktiv wie möglich konfigurieren
- In Produktion: HTTPS erzwingen für alle OAuth-Endpunkte
