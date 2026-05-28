/**
 * HTTP Server entry point.
 *
 * Starts an Express-like HTTP server that routes requests to the API handlers.
 * Uses Node.js built-in http module to avoid additional dependencies.
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createRoutes, type ApiRequest, type ApiResponse } from './api/routes.js';
import { PlaceholderJwtProvider } from './api/middleware.js';
import { AuthService, InMemoryUserStore } from './auth/auth-service.js';
import { CampaignManager, InMemoryCampaignStore } from './session/campaign-manager.js';
import { SessionService, InMemorySessionStore } from './session/session-service.js';
import {
  GameEngine,
  type SessionLoader,
  type SessionPersister,
  type LLMAdapter,
  type ActionClassifier,
  type DiceRoller,
} from './game-engine/game-engine.js';
import { ContentFilterPipeline } from './content-filter/content-filter.js';
import { InputProcessor } from './input/input-processor.js';
import { DEFAULT_GATEWAY_CONFIG } from './api/index.js';
import type { SessionState, ConversationMessage } from '@trixy/shared';

// ─── Bootstrap Services ──────────────────────────────────────────────────────

const jwtProvider = new PlaceholderJwtProvider(
  DEFAULT_GATEWAY_CONFIG.jwtSecret,
  DEFAULT_GATEWAY_CONFIG.jwtExpiresInMs,
);

const userStore = new InMemoryUserStore();
const authService = new AuthService(userStore);
const campaignManager = new CampaignManager(new InMemoryCampaignStore());
const sessionService = new SessionService(new InMemorySessionStore());

// Placeholder implementations for dev mode
const sessionLoader: SessionLoader = {
  async loadSession(_sessionId: string): Promise<SessionState | null> {
    return null;
  },
};

const sessionPersister: SessionPersister = {
  async appendMessage(_campaignId: string, _message: ConversationMessage): Promise<void> {},
  async saveSessionState(_state: SessionState): Promise<void> {},
};

const llmAdapter: LLMAdapter = {
  async generateNarration(_input) {
    return { kind: 'ok' as const, text: 'The Game Master ponders your action...' };
  },
};

const contentFilter = new ContentFilterPipeline(
  { async evaluate(_text: string) { return { kind: 'approved' as const }; } },
  { async regenerate(prompt: string) { return prompt; } },
);

const actionClassifier: ActionClassifier = {
  async classify(_playerMessage: string, _context: SessionState) {
    return { needsDiceRoll: false };
  },
};

const diceRoller: DiceRoller = {
  rollD20() {
    return Math.floor(Math.random() * 20) + 1;
  },
};

const gameEngine = new GameEngine({
  inputProcessor: new InputProcessor(),
  sessionLoader,
  sessionPersister,
  llmAdapter,
  contentFilter,
  actionClassifier,
  diceRoller,
});

const routes = createRoutes({
  authService,
  campaignManager,
  sessionService,
  gameEngine,
  jwtProvider,
});

// ─── Request Parsing ─────────────────────────────────────────────────────────

function parseBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8');
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function matchRoute(method: string, path: string) {
  for (const route of routes) {
    if (route.method !== method) continue;

    // Convert route pattern to regex: /sessions/:sessionId → /sessions/([^/]+)
    const paramNames: string[] = [];
    const pattern = route.path.replace(/:([^/]+)/g, (_match, paramName: string) => {
      paramNames.push(paramName);
      return '([^/]+)';
    });

    const regex = new RegExp(`^${pattern}$`);
    const match = path.match(regex);

    if (match) {
      const params: Record<string, string> = {};
      paramNames.forEach((name, i) => {
        params[name] = match[i + 1]!;
      });
      return { route, params };
    }
  }
  return null;
}

// ─── HTTP Server ─────────────────────────────────────────────────────────────

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const method = req.method ?? 'GET';
  const url = new URL(req.url ?? '/', `http://localhost`);
  const path = url.pathname;

  const matched = matchRoute(method, path);

  if (!matched) {
    console.log(`[${method}] ${path} → 404 Not Found`);
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not_found' }));
    return;
  }

  try {
    const body = await parseBody(req);

    const apiReq: ApiRequest = {
      method: method as ApiRequest['method'],
      path,
      headers: {
        authorization: req.headers.authorization,
        'content-type': req.headers['content-type'],
      },
      params: matched.params,
      body,
    };

    const apiRes: ApiResponse = await matched.route.handler(apiReq);

    console.log(`[${method}] ${path} → ${apiRes.status} ${JSON.stringify(apiRes.body).slice(0, 200)}`);

    res.writeHead(apiRes.status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(apiRes.body));
  } catch (err) {
    console.error(`[${method}] ${path} → 500 ERROR:`, err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'internal_server_error' }));
  }
});

const PORT = Number(process.env.PORT) || DEFAULT_GATEWAY_CONFIG.port;
const HOST = process.env.HOST || DEFAULT_GATEWAY_CONFIG.host;

server.listen(PORT, HOST, () => {
  console.log(`🎲 Trixy Backend running at http://${HOST}:${PORT}`);
  console.log(`   Routes: ${routes.length} endpoints registered`);
});
