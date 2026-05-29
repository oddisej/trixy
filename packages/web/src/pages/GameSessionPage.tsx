/**
 * GameSessionPage — chat interface backed by the real backend.
 * Sends player messages via POST /sessions/:id/messages and displays
 * the GM narration response with optional dice mechanics.
 */

import React, { useEffect, useRef, useState } from 'react';
import { DiceResult } from '../components/DiceResult';
import { useApi } from '../hooks/useApi';

interface ActionResolution {
  rollResult: number;
  modifier: number;
  difficulty: number;
  total: number;
  succeeded: boolean;
}

interface Message {
  id: string;
  role: 'player' | 'gm';
  text: string;
  diceResult?: ActionResolution;
}

export interface GameSessionPageProps {
  campaignId: string;
  onBack: () => void;
}

export function GameSessionPage({ campaignId, onBack }: GameSessionPageProps): React.JSX.Element {
  const api = useApi();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load existing session messages on mount
  useEffect(() => {
    let cancelled = false;
    async function loadSession() {
      try {
        const session = await api.loadSession(campaignId);
        if (!cancelled && session?.conversation) {
          const loaded = session.conversation.map((m) => ({
            id: m.id,
            role: m.role === 'player' ? ('player' as const) : ('gm' as const),
            text: m.text,
            diceResult: m.diceResult,
          }));
          setMessages(loaded);
        }
      } catch {
        // New session — start with empty messages
        if (!cancelled) setMessages([]);
      }
    }
    void loadSession();
    return () => { cancelled = true; };
  }, [campaignId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || loading) return;

    setError(null);
    const playerMsg: Message = { id: `p-${Date.now()}`, role: 'player', text: trimmed };
    setMessages((prev) => [...prev, playerMsg]);
    setInputText('');
    setLoading(true);

    try {
      const response = await api.sendMessage(campaignId, trimmed);
      const gmText = (response as any).text ?? 'The Game Master is silent...';
      const mechanics = (response as any).mechanics as ActionResolution | undefined;
      setMessages((prev) => [
        ...prev,
        {
          id: `gm-${Date.now()}`,
          role: 'gm',
          text: gmText,
          diceResult: mechanics,
        },
      ]);
    } catch {
      setError('Verbindung zum Game Master verloren. Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button type="button" onClick={onBack} style={styles.backButton}>← Zurück</button>
        <h1 style={styles.title}>Game Session</h1>
        <span style={styles.spacer} />
      </header>

      <div style={styles.messages} role="log" aria-live="polite">
        {messages.length === 0 && !loading && (
          <div style={styles.emptyHint}>
            <p>Beschreibe deine erste Aktion, um das Abenteuer zu beginnen.</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              ...styles.message,
              ...(msg.role === 'player' ? styles.messagePlayer : styles.messageGm),
            }}
          >
            <div style={styles.messageHeader}>
              <span style={{ ...styles.messageRole, color: msg.role === 'player' ? '#a78bfa' : '#fbbf24' }}>
                {msg.role === 'player' ? '🧙 Du' : '📜 Game Master'}
              </span>
            </div>
            <div style={styles.messageText}>{msg.text}</div>
            {msg.diceResult && (
              <div style={{ marginTop: '10px' }}>
                <DiceResult result={msg.diceResult} />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ ...styles.message, ...styles.messageGm }}>
            <span style={styles.typing}>📜 Game Master denkt nach...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div style={styles.error} role="alert">
          ⚠️ {error}
        </div>
      )}

      <form style={styles.inputForm} onSubmit={handleSend}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Was möchtest du tun?"
          disabled={loading}
          maxLength={2000}
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
          ⚡
        </button>
      </form>
    </div>
  );
}

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
    padding: '16px 24px',
    background: 'rgba(20, 10, 40, 0.9)',
    borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: '#a78bfa',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '8px 12px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#e2d9f3',
    margin: 0,
  },
  spacer: { width: '60px' },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxWidth: '800px',
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  emptyHint: {
    textAlign: 'center',
    color: '#8b7faa',
    fontSize: '14px',
    fontStyle: 'italic',
    padding: '40px',
  },
  message: {
    padding: '14px 18px',
    borderRadius: '14px',
    maxWidth: '85%',
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
  messageHeader: { marginBottom: '6px' },
  messageRole: {
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  messageText: {
    color: '#e2d9f3',
    fontSize: '15px',
    lineHeight: '1.6',
  },
  typing: {
    color: '#8b7faa',
    fontSize: '14px',
    fontStyle: 'italic',
  },
  error: {
    padding: '10px 14px',
    background: 'rgba(220, 38, 38, 0.15)',
    border: '1px solid rgba(220, 38, 38, 0.4)',
    borderRadius: '8px',
    color: '#fca5a5',
    fontSize: '13px',
    maxWidth: '800px',
    width: 'calc(100% - 48px)',
    margin: '0 auto 12px',
    boxSizing: 'border-box',
  },
  inputForm: {
    display: 'flex',
    gap: '10px',
    padding: '16px 24px',
    background: 'rgba(20, 10, 40, 0.9)',
    borderTop: '1px solid rgba(139, 92, 246, 0.2)',
    maxWidth: '800px',
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
};
