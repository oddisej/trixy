/**
 * GameSessionPage — Spielbare Demo mit lokalem Mock-Game-Master.
 * Kein Backend nötig.
 */

import React, { useEffect, useRef, useState } from 'react';
import { DiceResult } from '../components/DiceResult';

interface CharacterData {
  name: string;
  className: string;
  attributes: Record<string, number>;
}

interface Message {
  id: string;
  role: 'player' | 'gm';
  text: string;
  diceResult?: { rollResult: number; modifier: number; difficulty: number; total: number; succeeded: boolean };
}

export interface GameSessionPageProps {
  character: CharacterData;
  onBack: () => void;
}

// ─── Mock Game Master ────────────────────────────────────────────────────────

const INTRO_RESPONSES: Record<string, string> = {
  zwerg: 'Du erwachst in einer dunklen Höhle. Das Klirren deiner Axt hallt von den Steinwänden wider. Vor dir führt ein schmaler Gang tiefer in den Berg. Du riechst Schwefel und hörst ein fernes Grollen.',
  ritter: 'Du stehst am Eingang einer verfallenen Burg. Dein Schwert glänzt im Mondlicht. Die Zugbrücke ist heruntergelassen, aber Spinnweben bedecken den Weg. Aus dem Inneren dringt ein unheimliches Flüstern.',
  magier: 'Du befindest dich in einer alten Bibliothek. Staubige Bücher schweben um dich herum. Dein Zauberstab pulsiert mit violettem Licht. Eine der Buchseiten leuchtet auf und zeigt dir eine Karte zu einem verborgenen Turm.',
  barde: 'Du sitzt in einer belebten Taverne. Die Gäste schauen dich erwartungsvoll an. Deine Laute liegt bereit. Der Wirt flüstert dir zu: "Ein Fremder sucht jemanden für eine gefährliche Mission. Er sitzt in der dunklen Ecke."',
};

const GM_RESPONSES = [
  'Du gehst vorsichtig weiter. Der Gang wird enger und die Luft kälter. Plötzlich hörst du Schritte hinter dir.',
  'Ein seltsames Leuchten erscheint vor dir. Es scheint dich tiefer in das Dungeon zu locken.',
  'Du findest eine alte Truhe. Sie ist mit Runen verziert und scheint magisch versiegelt zu sein.',
  'Ein Schatten huscht an der Wand entlang. Du bist nicht allein hier.',
  'Der Boden unter dir knarrt bedrohlich. Du musst vorsichtig sein — hier könnten Fallen lauern.',
  'Du erreichst eine Kreuzung. Links hörst du Wasser fließen, rechts riechst du Rauch.',
  'Eine alte Inschrift an der Wand warnt: "Nur die Mutigen überleben was hinter dieser Tür liegt."',
  'Du findest einen verwundeten Reisenden. Er bittet dich um Hilfe und bietet dir im Gegenzug Informationen an.',
  'Ein leises Knurren ertönt aus der Dunkelheit. Etwas Großes bewegt sich auf dich zu.',
  'Du entdeckst einen geheimen Durchgang hinter einem losen Stein in der Wand.',
];

const DICE_ACTIONS = ['angreifen', 'klettern', 'springen', 'schleichen', 'überzeugen', 'untersuchen', 'öffnen', 'ausweichen', 'brechen', 'werfen'];

function shouldRollDice(text: string): boolean {
  const lower = text.toLowerCase();
  return DICE_ACTIONS.some((action) => lower.includes(action));
}

function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

function getModifierForAction(text: string, attributes: Record<string, number>): { attribute: string; modifier: number } {
  const lower = text.toLowerCase();
  if (lower.includes('angreifen') || lower.includes('brechen') || lower.includes('werfen')) {
    return { attribute: 'strength', modifier: Math.floor((attributes.strength ?? 10) / 4) };
  }
  if (lower.includes('schleichen') || lower.includes('ausweichen') || lower.includes('klettern') || lower.includes('springen')) {
    return { attribute: 'dexterity', modifier: Math.floor((attributes.dexterity ?? 10) / 4) };
  }
  if (lower.includes('untersuchen') || lower.includes('öffnen')) {
    return { attribute: 'intelligence', modifier: Math.floor((attributes.intelligence ?? 10) / 4) };
  }
  if (lower.includes('überzeugen')) {
    return { attribute: 'charisma', modifier: Math.floor((attributes.charisma ?? 10) / 4) };
  }
  return { attribute: 'dexterity', modifier: Math.floor((attributes.dexterity ?? 10) / 4) };
}

function generateGMResponse(text: string, character: CharacterData): Message {
  const needsDice = shouldRollDice(text);

  if (needsDice) {
    const roll = rollD20();
    const { modifier } = getModifierForAction(text, character.attributes);
    const difficulty = Math.floor(Math.random() * 8) + 8; // 8-15
    const total = roll + modifier;
    const succeeded = total >= difficulty;

    const outcomeText = succeeded
      ? 'Es gelingt dir! ' + GM_RESPONSES[Math.floor(Math.random() * GM_RESPONSES.length)]
      : 'Das hat leider nicht geklappt. ' + GM_RESPONSES[Math.floor(Math.random() * GM_RESPONSES.length)];

    return {
      id: `gm-${Date.now()}`,
      role: 'gm',
      text: outcomeText,
      diceResult: { rollResult: roll, modifier, difficulty, total, succeeded },
    };
  }

  const response = GM_RESPONSES[Math.floor(Math.random() * GM_RESPONSES.length)];
  return { id: `gm-${Date.now()}`, role: 'gm', text: response };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GameSessionPage({ character, onBack }: GameSessionPageProps): React.JSX.Element {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Show intro message on mount
  useEffect(() => {
    const intro = INTRO_RESPONSES[character.className] ?? INTRO_RESPONSES.ritter;
    setMessages([{ id: 'intro', role: 'gm', text: intro }]);
  }, [character.className]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || loading) return;

    const playerMsg: Message = { id: `p-${Date.now()}`, role: 'player', text: trimmed };
    setMessages((prev) => [...prev, playerMsg]);
    setInputText('');
    setLoading(true);

    // Simulate GM "thinking"
    setTimeout(() => {
      const gmMsg = generateGMResponse(trimmed, character);
      setMessages((prev) => [...prev, gmMsg]);
      setLoading(false);
    }, 800 + Math.random() * 1200);
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button type="button" onClick={onBack} style={styles.backButton}>← Zurück</button>
        <div style={styles.headerCenter}>
          <h1 style={styles.title}>The Dungeons of Arhenzech</h1>
          <p style={styles.charInfo}>
            {character.name} • {CLASSES.find(c => c.value === character.className)?.name ?? character.className}
          </p>
        </div>
        <div style={styles.headerRight} />
      </header>

      <div style={styles.messages}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              ...styles.message,
              ...(msg.role === 'player' ? styles.messagePlayer : styles.messageGm),
            }}
          >
            <div style={styles.messageHeader}>
              <span style={{ color: msg.role === 'player' ? '#a78bfa' : '#fbbf24', ...styles.messageRole }}>
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

      <form style={styles.inputForm} onSubmit={handleSend}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Was möchtest du tun?"
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
          ⚡
        </button>
      </form>

      <div style={styles.hint}>
        💡 Tipp: Benutze Wörter wie "angreifen", "schleichen", "untersuchen" oder "überzeugen" um einen Würfelwurf auszulösen.
      </div>
    </div>
  );
}

const CLASSES = [
  { value: 'zwerg', name: 'Zwerg' },
  { value: 'ritter', name: 'Ritter' },
  { value: 'magier', name: 'Magier' },
  { value: 'barde', name: 'Barde' },
];

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
  headerCenter: {
    textAlign: 'center',
  },
  headerRight: {
    width: '80px',
  },
  title: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#e2d9f3',
    margin: 0,
  },
  charInfo: {
    fontSize: '12px',
    color: '#a78bfa',
    margin: '2px 0 0 0',
  },
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
  },
  message: {
    padding: '14px 18px',
    borderRadius: '14px',
    maxWidth: '85%',
    animation: 'fadeIn 0.3s ease',
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
    marginBottom: '6px',
  },
  messageRole: {
    fontSize: '11px',
    fontWeight: '700',
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
  hint: {
    textAlign: 'center',
    padding: '8px 24px 16px',
    fontSize: '12px',
    color: '#6b5b8a',
    background: 'rgba(20, 10, 40, 0.9)',
  },
};
