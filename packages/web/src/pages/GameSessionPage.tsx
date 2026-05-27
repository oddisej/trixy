/**
 * GameSessionPage — chat interface with text input, message display,
 * dice result display, and optional voice input toggle.
 * Requirements: 1.1, 1.4, 1.6, 8.1, 8.4, 9.3
 */

import React, { useEffect, useRef, useState } from 'react';
import type { ConversationMessage, ActionResolution } from '../types';
import { DiceResult } from '../components/DiceResult';
import { useApi } from '../hooks/useApi';

export interface GameSessionPageProps {
  campaignId: string;
}

export function GameSessionPage({ campaignId }: GameSessionPageProps): React.JSX.Element {
  const api = useApi();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [recording, setRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const session = await api.loadSession(campaignId);
        if (!cancelled) {
          setMessages(session.conversation);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load session.');
        }
      }
    }

    void loadSession();
    return () => { cancelled = true; };
  }, [campaignId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputText.trim();

    if (!trimmed) {
      setError('Please enter a message.');
      return;
    }
    if (trimmed.length > 2000) {
      setError('Message must be 2000 characters or fewer.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await api.sendMessage(campaignId, trimmed);
      setMessages((prev) => [...prev, response]);
      setInputText('');
    } catch {
      setError('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleVoiceToggle() {
    setVoiceEnabled((prev) => !prev);
    if (recording) {
      setRecording(false);
    }
  }

  function handleVoiceRecord() {
    if (!voiceEnabled) return;
    // Placeholder: In a real implementation, this would use the Web Speech API
    // or MediaRecorder to capture audio and send to the STT adapter.
    setRecording((prev) => !prev);
  }

  function renderMessage(msg: ConversationMessage) {
    const roleLabel = msg.role === 'player' ? 'You' : msg.role === 'gm' ? 'Game Master' : `NPC`;

    return (
      <div key={msg.id} className={`message message--${msg.role}`}>
        <div className="message__header">
          <span className="message__role">{roleLabel}</span>
          {msg.origin === 'voice' && <span className="message__voice-badge">🎤</span>}
        </div>
        <div className="message__text">{msg.text}</div>
        {msg.diceResult && <DiceResult result={msg.diceResult} />}
      </div>
    );
  }

  return (
    <div className="game-session-page">
      <header className="game-session-page__header">
        <h1>Game Session</h1>
        <div className="voice-toggle">
          <label htmlFor="voice-toggle">
            <input
              id="voice-toggle"
              type="checkbox"
              checked={voiceEnabled}
              onChange={handleVoiceToggle}
              aria-label="Enable voice input"
            />
            Voice Input
          </label>
        </div>
      </header>

      <div className="game-session-page__messages" role="log" aria-live="polite">
        {messages.map(renderMessage)}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      <form
        className="game-session-page__input"
        onSubmit={handleSendMessage}
        aria-label="Send message"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Describe your action..."
          maxLength={2000}
          disabled={loading}
          aria-label="Message input"
        />
        <button type="submit" disabled={loading || !inputText.trim()}>
          {loading ? 'Sending...' : 'Send'}
        </button>
        {voiceEnabled && (
          <button
            type="button"
            onClick={handleVoiceRecord}
            className={`voice-button ${recording ? 'voice-button--recording' : ''}`}
            aria-label={recording ? 'Stop recording' : 'Start recording'}
          >
            {recording ? '⏹ Stop' : '🎤 Record'}
          </button>
        )}
      </form>
    </div>
  );
}
