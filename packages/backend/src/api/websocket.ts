/**
 * WebSocket Handler for Streaming Narration
 *
 * Provides real-time streaming of Game Master narration to connected clients.
 * Uses a message-based protocol over WebSocket for:
 * - Streaming narration text chunks as they are generated
 * - Dice roll results and mechanics updates
 * - Session state change notifications
 *
 * Requirements: 1.1, 6.1, 6.2, 6.3 (real-time delivery across platforms)
 */

import type { AuthenticatedContext, JwtProvider } from './middleware.js';
import type { EngineResponse } from '../game-engine/game-engine.js';
import type { ActionResolution } from '@trixy/shared';

// ─── WebSocket Message Protocol ──────────────────────────────────────────────

/** Messages sent from client to server. */
export type ClientMessage =
  | { type: 'authenticate'; token: string }
  | { type: 'subscribe_session'; sessionId: string }
  | { type: 'unsubscribe_session'; sessionId: string }
  | { type: 'ping' };

/** Messages sent from server to client. */
export type ServerMessage =
  | { type: 'authenticated'; userId: string }
  | { type: 'auth_error'; reason: 'invalid' | 'expired' | 'missing' }
  | { type: 'subscribed'; sessionId: string }
  | { type: 'narration_start'; sessionId: string }
  | { type: 'narration_chunk'; sessionId: string; text: string; index: number }
  | { type: 'narration_end'; sessionId: string; fullText: string; mechanics?: ActionResolution }
  | { type: 'narration_error'; sessionId: string; reason: string; retryable: boolean }
  | { type: 'pong' };

// ─── Connection State ────────────────────────────────────────────────────────

/** Represents the state of a single WebSocket connection. */
export interface WebSocketConnection {
  id: string;
  auth: AuthenticatedContext | null;
  subscribedSessions: Set<string>;
  connectedAt: Date;
}

// ─── WebSocket Send Interface ────────────────────────────────────────────────

/** Abstract interface for sending messages over a WebSocket connection. */
export interface WebSocketSender {
  send(connectionId: string, message: ServerMessage): void;
  close(connectionId: string, code?: number, reason?: string): void;
}

// ─── WebSocket Handler ───────────────────────────────────────────────────────

/**
 * Manages WebSocket connections and message routing for streaming narration.
 *
 * Lifecycle:
 * 1. Client connects and sends `authenticate` message with JWT
 * 2. Server verifies token and responds with `authenticated` or `auth_error`
 * 3. Client subscribes to session(s) via `subscribe_session`
 * 4. Server streams narration events to subscribed clients
 */
export class WebSocketHandler {
  private readonly connections = new Map<string, WebSocketConnection>();
  private readonly jwtProvider: JwtProvider;
  private readonly sender: WebSocketSender;

  constructor(deps: { jwtProvider: JwtProvider; sender: WebSocketSender }) {
    this.jwtProvider = deps.jwtProvider;
    this.sender = deps.sender;
  }

  /**
   * Handles a new WebSocket connection.
   */
  onConnect(connectionId: string): void {
    this.connections.set(connectionId, {
      id: connectionId,
      auth: null,
      subscribedSessions: new Set(),
      connectedAt: new Date(),
    });
  }

  /**
   * Handles a WebSocket disconnection. Cleans up connection state.
   */
  onDisconnect(connectionId: string): void {
    this.connections.delete(connectionId);
  }

  /**
   * Handles an incoming client message on a given connection.
   */
  onMessage(connectionId: string, message: ClientMessage): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    switch (message.type) {
      case 'authenticate':
        this.handleAuthenticate(connection, message.token);
        break;
      case 'subscribe_session':
        this.handleSubscribe(connection, message.sessionId);
        break;
      case 'unsubscribe_session':
        this.handleUnsubscribe(connection, message.sessionId);
        break;
      case 'ping':
        this.sender.send(connectionId, { type: 'pong' });
        break;
    }
  }

  /**
   * Broadcasts a narration event to all connections subscribed to the given session.
   * Called by the game engine when narration is generated.
   */
  broadcastNarration(sessionId: string, response: EngineResponse): void {
    const subscribers = this.getSessionSubscribers(sessionId);

    for (const connection of subscribers) {
      switch (response.kind) {
        case 'narration':
          this.sender.send(connection.id, {
            type: 'narration_end',
            sessionId,
            fullText: response.text,
            mechanics: response.mechanics,
          });
          break;
        case 'safe_fallback':
          this.sender.send(connection.id, {
            type: 'narration_end',
            sessionId,
            fullText: response.text,
          });
          break;
        case 'temporarily_unavailable':
          this.sender.send(connection.id, {
            type: 'narration_error',
            sessionId,
            reason: 'temporarily_unavailable',
            retryable: true,
          });
          break;
        case 'input_rejected':
          this.sender.send(connection.id, {
            type: 'narration_error',
            sessionId,
            reason: `input_rejected: ${response.reason}`,
            retryable: false,
          });
          break;
      }
    }
  }

  /**
   * Streams narration text in chunks to all subscribers of a session.
   * Used for progressive rendering of long narration responses.
   */
  streamNarrationChunks(sessionId: string, chunks: string[]): void {
    const subscribers = this.getSessionSubscribers(sessionId);

    for (const connection of subscribers) {
      this.sender.send(connection.id, { type: 'narration_start', sessionId });

      for (let i = 0; i < chunks.length; i++) {
        this.sender.send(connection.id, {
          type: 'narration_chunk',
          sessionId,
          text: chunks[i]!,
          index: i,
        });
      }
    }
  }

  /**
   * Returns the number of active connections.
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Returns the number of authenticated connections.
   */
  getAuthenticatedCount(): number {
    let count = 0;
    for (const conn of this.connections.values()) {
      if (conn.auth) count++;
    }
    return count;
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private handleAuthenticate(connection: WebSocketConnection, token: string): void {
    const result = this.jwtProvider.verify(token);

    if (result.kind === 'valid') {
      connection.auth = result.context;
      this.sender.send(connection.id, {
        type: 'authenticated',
        userId: result.context.userId,
      });
    } else {
      this.sender.send(connection.id, {
        type: 'auth_error',
        reason: result.kind,
      });
      // Close connection after auth failure
      this.sender.close(connection.id, 4001, 'Authentication failed');
      this.connections.delete(connection.id);
    }
  }

  private handleSubscribe(connection: WebSocketConnection, sessionId: string): void {
    if (!connection.auth) {
      this.sender.send(connection.id, {
        type: 'auth_error',
        reason: 'missing',
      });
      return;
    }

    connection.subscribedSessions.add(sessionId);
    this.sender.send(connection.id, { type: 'subscribed', sessionId });
  }

  private handleUnsubscribe(connection: WebSocketConnection, sessionId: string): void {
    connection.subscribedSessions.delete(sessionId);
  }

  private getSessionSubscribers(sessionId: string): WebSocketConnection[] {
    const subscribers: WebSocketConnection[] = [];
    for (const connection of this.connections.values()) {
      if (connection.auth && connection.subscribedSessions.has(sessionId)) {
        subscribers.push(connection);
      }
    }
    return subscribers;
  }
}
