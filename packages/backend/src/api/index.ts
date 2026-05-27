/**
 * API Gateway — Entry point for the backend API layer.
 *
 * Assembles routes, middleware, and WebSocket handler into a unified gateway.
 * This module wires together all API components and provides the public
 * interface for starting the server.
 *
 * Architecture layer: API-Schicht (REST + WebSocket)
 * Requirements: 1.1, 6.1, 6.2, 6.3, 7.1, 10.3
 */

export { createRoutes } from './routes.js';
export type { ApiRequest, ApiResponse, RouteDefinition, RouteHandler, ApiDependencies } from './routes.js';

export {
  authenticateRequest,
  extractBearerToken,
  PlaceholderJwtProvider,
} from './middleware.js';
export type { AuthenticatedContext, JwtVerifyResult, JwtProvider } from './middleware.js';

export { WebSocketHandler } from './websocket.js';
export type {
  ClientMessage,
  ServerMessage,
  WebSocketConnection,
  WebSocketSender,
} from './websocket.js';

// ─── Gateway Configuration ───────────────────────────────────────────────────

/** Configuration for the API gateway server. */
export interface GatewayConfig {
  /** Port to listen on (default: 3000) */
  port: number;
  /** Host to bind to (default: '0.0.0.0') */
  host: string;
  /** JWT secret for token signing/verification */
  jwtSecret: string;
  /** JWT token expiry in milliseconds (default: 1 hour) */
  jwtExpiresInMs: number;
  /** Enable WebSocket support (default: true) */
  enableWebSocket: boolean;
  /** CORS allowed origins */
  corsOrigins: string[];
}

/** Default gateway configuration for development. */
export const DEFAULT_GATEWAY_CONFIG: GatewayConfig = {
  port: 3000,
  host: '0.0.0.0',
  jwtSecret: 'dev-secret-change-in-production',
  jwtExpiresInMs: 3600_000,
  enableWebSocket: true,
  corsOrigins: ['http://localhost:5173', 'http://localhost:8081'],
};
