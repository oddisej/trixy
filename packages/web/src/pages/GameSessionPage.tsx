/**
 * GameSessionPage — Dungeon-themed chat interface with text input,
 * message display, dice result, and optional voice input toggle.
 * Requirements: 1.1, 1.4, 1.6, 8.1, 8.4, 9.3
 */

import React, { useEffect, useRef, useState } from 'react';
import type { ConversationMessage } from '../types';
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
          setError('Die Spielsitzung konnte nicht geladen werden.');
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
      setError('Beschreibe deine Aktion.');
      return;
    }
    if (trimmed.length > 2000) {
      setError('Deine Eingabe ist zu lang. Maximum 2000 Zeichen.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await api.sendMessage(campaignId, trimmed);
      setMessages((prev) => [...prev, response]);
      setInputText('');
    } catch {
      setError('Der Game Master hört dich nicht. Versuche es erneut.');
    } finally {
      setLoading(false);
    }
  }

  function handleVoiceToggle() {
    setVoiceEnabled((prev) => !prev);
    if (recording) setRecording(false);
  }

  function handleVoiceRecord() {
    if (!voiceEnabled) return;
    setRecording((prev) => !prev);
  }

  function renderMessage(msg: ConversationMessage) {
    const isPlayer = msg.role === 'player';
    const roleConfig = {
      player: { label: 'Du', icon: '🧙', color: '#a78bfa' },
      gm: { label: 'Game Master', icon: '📜', color: '#fbbf24' },
      npc: { label: 'NPC', icon: '👤', color: '#34d399' },
    };
    const role = roleConfig[msg.role] ?? roleConfig.gm;

    return (
      <div
        key={msg.id}
        style={{
          ...styles.message,
          ...(isPlayer ? styles.messagePlayer : styles.messageGm),
        }}
      >
        <div style={styles.messageHeader}>
          <span style={{ ...styles.messageRole, color: role.color }}>
            {role.icon} {role.label}
          </span>
          {msg.origin === 'voice' && <span style={styles.voiceBadge}>🎤</span>}
        </div>
        <div style={styles.messageText}>{msg.text}</div>
        {msg.diceResult && (
          <div style={styles.diceWrapper}>
            <DiceResult result={msg.diceResult} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>🏰</span>
          <div>
            <h1 style={styles.title}>Dungeon-Sitzung</h1>
            <p style={styles.subtitle}>The Dungeons of Arhenzech</p>
          </div>
        </div>
        <label style={styles.voiceToggle}>
          <input
            type="checkbox"
            checked={voiceEnabled}
            onChange={handleVoiceToggle}
            style={styles.voiceCheckbox}
          />
          <span>🎤 Sprache</span>
        </label>
      </header>

      <div style={styles.messages} role="log" aria-live="polite">
        {messages.length === 0 && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📖</div>
            <p style={styles.emptyText}>
              Die Geschichte beginnt mit deiner ersten Aktion.<br />
              Beschreibe, was dein Held tut.
            </p>
          </div>
        )}
        {messages.map(renderMessage)}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div style={styles.error} role="alert">
          <span>⚠️</span> {error}
        </div>
      )}

      <form style={styles.inputForm} onSubmit={handleSendMessage}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Beschreibe deine Aktion..."
          maxLength={2000}
          disabled={loading}
          style={styles.input}
        />
        <button
          type="submit"
          disabled={loading || !inputText.trim()}
          style={{
            ...styles.sendButton,
            ...(loading || !inputText.trim() ? styles.sendButtonDisabled : {}),
          }}
        >
          {loading ? '⏳' : '⚡'}
        </button>
        {voiceEnabled && (
          <button
            type="button"
            onClick={handleVoiceRecord}
            style={{
              ...styles.voiceButton,
              ...(recording ? styles.voiceButtonRecording : {}),
            }}
          >
            {recording ? '⏹' : '🎤'}
          </button>
        )}
      </form>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'radial-gradient(ellipse at top, #1a0a2e 0%, #0d0d1a 50%, #000000 100%)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    background: 'rgba(20, 10, 40, 0.8)',
    borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
    backdropFilter: 'blur(8px)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  headerIcon: {
    fontSize: '32px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#e2d9f3',
    margin: 0,
  },
  subtitle: {
    fontSize: '12px',
    color: '#a78bfa',
    fontStyle: 'italic',
    margin: 0,
  },
  voiceToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    background: 'rgba(139, 92, 246, 0.1)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '20px',
    color: '#c4b5fd',
    fontSize: '13px',
    cursor: 'pointer',
  },
  voiceCheckbox: {
    accentColor: '#7c3aed',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxWidth: '900px',
    width: '100%',
    margin: '0 auto',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 24px',
    color: '#8b7faa',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
    filter: 'drop-shadow(0 0 20px rgba(167, 139, 250, 0.4))',
  },
  emptyText: {
    fontSize: '14px',
    lineHeight: '1.6',
    fontStyle: 'italic',
  },
  message: {
    padding: '14px 18px',
    borderRadius: '14px',
    maxWidth: '80%',
  },
  messagePlayer: {
    alignSelf: 'flex-end',
    background: 'linear-gradient(145deg, rgba(124, 58, 237, 0.25), rgba(109, 40, 217, 0.35))',
    border: '1px solid rgba(167, 139, 250, 0.4)',
  },
  messageGm: {
    alignSelf: 'flex-start',
    background: 'linear-gradient(145deg, rgba(20, 10, 40, 0.95), rgba(10, 5, 25, 0.98))',
    border: '1px solid rgba(139, 92, 246, 0.25)',
  },
  messageHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
  },
  messageRole: {
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  voiceBadge: {
    fontSize: '12px',
    opacity: 0.7,
  },
  messageText: {
    color: '#e2d9f3',
    fontSize: '15px',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
  },
  diceWrapper: {
    marginTop: '10px',
  },
  error: {
    background: 'rgba(220, 38, 38, 0.15)',
    border: '1px solid rgba(220, 38, 38, 0.4)',
    color: '#fca5a5',
    padding: '10px 16px',
    margin: '0 24px',
    borderRadius: '10px',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    maxWidth: '900px',
    width: 'calc(100% - 48px)',
    boxSizing: 'border-box',
  },
  inputForm: {
    display: 'flex',
    gap: '10px',
    padding: '16px 24px',
    background: 'rgba(20, 10, 40, 0.8)',
    borderTop: '1px solid rgba(139, 92, 246, 0.2)',
    backdropFilter: 'blur(8px)',
    maxWidth: '900px',
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  input: {
    flex: 1,
    background: 'rgba(139, 92, 246, 0.08)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '12px',
    padding: '14px 18px',
    fontSize: '15px',
    color: '#e2d9f3',
    outline: 'none',
  },
  sendButton: {
    width: '52px',
    height: '52px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    border: 'none',
    color: '#fff',
    fontSize: '20px',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(124, 58, 237, 0.4)',
  },
  sendButtonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  voiceButton: {
    width: '52px',
    height: '52px',
    borderRadius: '12px',
    background: 'rgba(139, 92, 246, 0.15)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    color: '#c4b5fd',
    fontSize: '20px',
    cursor: 'pointer',
  },
  voiceButtonRecording: {
    background: 'rgba(220, 38, 38, 0.3)',
    border: '1px solid rgba(220, 38, 38, 0.6)',
    color: '#fca5a5',
    animation: 'pulse 1.5s infinite',
  },
};
