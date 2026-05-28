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

interface InventoryItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  actions: ItemAction[];
}

interface ItemAction {
  label: string;
  effect: string;
}

const STARTING_ITEMS: Record<string, InventoryItem[]> = {
  zwerg: [
    { id: 'axe', name: 'Kriegsaxt', icon: '🪓', description: 'Eine schwere Axt aus Zwergenstahl. +3 Angriffsschaden.', actions: [
      { label: 'Angreifen', effect: 'Du schwingst deine Kriegsaxt mit voller Wucht.' },
      { label: 'Untersuchen', effect: 'Die Axt trägt Runen der Zwerge. Sie ist alt aber scharf.' },
    ]},
    { id: 'shield', name: 'Steinschild', icon: '🛡️', description: 'Ein robuster Schild aus Granit. +2 Verteidigung.', actions: [
      { label: 'Verteidigen', effect: 'Du hebst deinen Schild und blockierst den Angriff.' },
      { label: 'Untersuchen', effect: 'Der Schild ist aus einem einzigen Felsblock gehauen.' },
    ]},
    { id: 'potion', name: 'Heiltrank', icon: '🧪', description: 'Stellt 20 HP wieder her.', actions: [
      { label: 'Trinken', effect: 'Du trinkst den Heiltrank und fühlst dich besser. +20 HP.' },
      { label: 'Untersuchen', effect: 'Eine rote Flüssigkeit die nach Kräutern riecht.' },
    ]},
  ],
  ritter: [
    { id: 'sword', name: 'Langschwert', icon: '⚔️', description: 'Ein edles Schwert mit scharfer Klinge. +3 Angriffsschaden.', actions: [
      { label: 'Angreifen', effect: 'Du führst einen präzisen Schwerthieb aus.' },
      { label: 'Untersuchen', effect: 'Das Schwert trägt das Wappen deines Hauses.' },
    ]},
    { id: 'armor', name: 'Kettenhemd', icon: '🛡️', description: 'Bietet guten Schutz. +3 Verteidigung.', actions: [
      { label: 'Anlegen', effect: 'Du trägst das Kettenhemd bereits.' },
      { label: 'Untersuchen', effect: 'Fein geschmiedete Ringe aus Stahl, eng verwoben.' },
    ]},
    { id: 'potion', name: 'Heiltrank', icon: '🧪', description: 'Stellt 20 HP wieder her.', actions: [
      { label: 'Trinken', effect: 'Du trinkst den Heiltrank und fühlst dich besser. +20 HP.' },
      { label: 'Untersuchen', effect: 'Eine rote Flüssigkeit die nach Kräutern riecht.' },
    ]},
  ],
  magier: [
    { id: 'staff', name: 'Zauberstab', icon: '🪄', description: 'Verstärkt magische Angriffe. +3 Magieschaden.', actions: [
      { label: 'Zaubern', effect: 'Du kanalisierst Energie durch den Stab.' },
      { label: 'Untersuchen', effect: 'Der Stab pulsiert mit arkaner Energie. Ein Amethyst sitzt an der Spitze.' },
    ]},
    { id: 'book', name: 'Zauberbuch', icon: '📖', description: 'Enthält deine Zaubersprüche.', actions: [
      { label: 'Zauber ansehen', effect: 'SPELLS' },
      { label: 'Untersuchen', effect: 'Ein in Leder gebundenes Buch mit leuchtenden Runen auf dem Einband.' },
    ]},
    { id: 'potion', name: 'Manatrank', icon: '🧪', description: 'Stellt magische Energie wieder her.', actions: [
      { label: 'Trinken', effect: 'Du trinkst den Manatrank. Deine Magie fühlt sich stärker an.' },
      { label: 'Untersuchen', effect: 'Eine blaue, schimmernde Flüssigkeit.' },
    ]},
  ],
  barde: [
    { id: 'lute', name: 'Laute', icon: '🎵', description: 'Ein fein gestimmtes Instrument. +2 Charisma-Bonus.', actions: [
      { label: 'Spielen', effect: 'Du spielst eine Melodie. Alle Zuhörer sind verzaubert.' },
      { label: 'Untersuchen', effect: 'Eine Laute aus Eichenholz mit Silbersaiten.' },
    ]},
    { id: 'dagger', name: 'Dolch', icon: '🗡️', description: 'Klein aber tödlich. +2 Angriffsschaden.', actions: [
      { label: 'Angreifen', effect: 'Du stichst schnell und präzise zu.' },
      { label: 'Untersuchen', effect: 'Ein vergifteter Dolch mit Elfenbeingriff.' },
    ]},
    { id: 'potion', name: 'Heiltrank', icon: '🧪', description: 'Stellt 20 HP wieder her.', actions: [
      { label: 'Trinken', effect: 'Du trinkst den Heiltrank und fühlst dich besser. +20 HP.' },
      { label: 'Untersuchen', effect: 'Eine rote Flüssigkeit die nach Kräutern riecht.' },
    ]},
  ],
};

const SPELLS: Record<string, { name: string; icon: string; description: string }[]> = {
  magier: [
    { name: 'Feuerball', icon: '🔥', description: 'Schleudert einen Feuerball auf den Gegner. Hoher Schaden.' },
    { name: 'Eisschild', icon: '🧊', description: 'Erschafft einen Schild aus Eis. Blockiert einen Angriff.' },
    { name: 'Blitz', icon: '⚡', description: 'Ein Blitz trifft den Gegner. Mittlerer Schaden, schnell.' },
    { name: 'Telekinese', icon: '🌀', description: 'Bewegt Objekte mit Gedankenkraft.' },
  ],
  barde: [
    { name: 'Schlummerlied', icon: '💤', description: 'Versetzt Gegner in Schlaf.' },
    { name: 'Spottlied', icon: '😤', description: 'Provoziert den Gegner und senkt seine Verteidigung.' },
    { name: 'Heilmelodie', icon: '💚', description: 'Heilt dich oder einen Verbündeten um 10 HP.' },
  ],
};

function calculateMaxHP(attributes: Record<string, number>): number {
  const constitution = attributes.constitution ?? 10;
  return 20 + constitution; // Base 20 + CON
}

export function GameSessionPage({ character, onBack }: GameSessionPageProps): React.JSX.Element {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showSpells, setShowSpells] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [inventory] = useState<InventoryItem[]>(STARTING_ITEMS[character.className] ?? STARTING_ITEMS.ritter);
  const maxHP = calculateMaxHP(character.attributes);
  const [currentHP, setCurrentHP] = useState(maxHP);
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
      // Failed dice rolls cost HP
      if (gmMsg.diceResult && !gmMsg.diceResult.succeeded) {
        const damage = Math.floor(Math.random() * 5) + 1;
        setCurrentHP((prev) => Math.max(0, prev - damage));
        gmMsg.text += ` Du erleidest ${damage} Schaden.`;
      }
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
        <button type="button" onClick={() => setShowInventory(!showInventory)} style={styles.inventoryButton}>
          🎒
        </button>
      </header>

      {/* HP Bar */}
      <div style={styles.hpBar}>
        <div style={styles.hpLabel}>
          <span>❤️ {currentHP}/{maxHP} HP</span>
        </div>
        <div style={styles.hpTrack}>
          <div
            style={{
              ...styles.hpFill,
              width: `${(currentHP / maxHP) * 100}%`,
              background: currentHP > maxHP * 0.5 ? '#34d399' : currentHP > maxHP * 0.25 ? '#fbbf24' : '#ef4444',
            }}
          />
        </div>
      </div>

      {/* Inventory Panel */}
      {showInventory && (
        <div style={styles.inventoryPanel}>
          <div style={styles.inventoryHeader}>
            <h2 style={styles.inventoryTitle}>🎒 Inventar</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={() => { setShowStats(!showStats); setSelectedItem(null); setShowSpells(false); }} style={styles.statsToggle}>
                📊
              </button>
              <button type="button" onClick={() => setShowInventory(false)} style={styles.closeButton}>✕</button>
            </div>
          </div>

          {/* Stats View */}
          {showStats && (
            <div style={styles.statsPanel}>
              <h3 style={styles.statsTitle}>Attribute</h3>
              {Object.entries(character.attributes).map(([key, value]) => {
                const modifier = Math.floor((value - 10) / 2);
                const labels: Record<string, string> = { strength: '💪 Stärke', dexterity: '🤸 Geschick', constitution: '❤️ Konstitution', intelligence: '🧠 Intelligenz', wisdom: '👁️ Weisheit', charisma: '✨ Charisma' };
                return (
                  <div key={key} style={styles.statRow}>
                    <span style={styles.statLabel}>{labels[key] ?? key}</span>
                    <span style={styles.statValue}>{value}</span>
                    <span style={{ ...styles.statMod, color: modifier >= 0 ? '#34d399' : '#f87171' }}>
                      ({modifier >= 0 ? '+' : ''}{modifier})
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Spells View */}
          {showSpells && (
            <div style={styles.spellsPanel}>
              <button type="button" onClick={() => setShowSpells(false)} style={styles.spellBack}>← Zurück</button>
              <h3 style={styles.spellsTitle}>📖 Zaubersprüche</h3>
              {(SPELLS[character.className] ?? []).map((spell) => (
                <div key={spell.name} style={styles.spellItem}>
                  <span style={styles.spellIcon}>{spell.icon}</span>
                  <div>
                    <span style={styles.spellName}>{spell.name}</span>
                    <span style={styles.spellDesc}>{spell.description}</span>
                  </div>
                </div>
              ))}
              {!(SPELLS[character.className]) && (
                <p style={styles.emptyInventory}>Deine Klasse hat keine Zauber.</p>
              )}
            </div>
          )}

          {/* Item Detail View */}
          {selectedItem && !showSpells && !showStats && (
            <div style={styles.itemDetail}>
              <button type="button" onClick={() => setSelectedItem(null)} style={styles.spellBack}>← Zurück</button>
              <div style={styles.itemDetailHeader}>
                <span style={{ fontSize: '40px' }}>{selectedItem.icon}</span>
                <div>
                  <h3 style={styles.itemDetailName}>{selectedItem.name}</h3>
                  <p style={styles.itemDetailDesc}>{selectedItem.description}</p>
                </div>
              </div>
              <div style={styles.itemActions}>
                {selectedItem.actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => {
                      if (action.effect === 'SPELLS') {
                        setShowSpells(true);
                        setSelectedItem(null);
                      } else {
                        // Use item: add effect as GM message
                        const msg: Message = { id: `gm-item-${Date.now()}`, role: 'gm', text: action.effect };
                        setMessages((prev) => [...prev, msg]);
                        if (action.label === 'Trinken' && selectedItem.name.includes('Heiltrank')) {
                          setCurrentHP((prev) => Math.min(maxHP, prev + 20));
                        }
                        setSelectedItem(null);
                        setShowInventory(false);
                      }
                    }}
                    style={styles.actionButton}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Item List */}
          {!selectedItem && !showSpells && !showStats && (
            <div style={styles.inventoryGrid}>
              {inventory.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedItem(item)}
                  style={styles.inventoryItem}
                >
                  <span style={styles.itemIcon}>{item.icon}</span>
                  <div style={styles.itemInfo}>
                    <span style={styles.itemName}>{item.name}</span>
                    <span style={styles.itemDesc}>{item.description}</span>
                  </div>
                  <span style={styles.itemArrow}>→</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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
  inventoryButton: {
    background: 'rgba(139, 92, 246, 0.15)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '10px',
    padding: '8px 14px',
    fontSize: '22px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  hpBar: {
    padding: '8px 24px',
    background: 'rgba(20, 10, 40, 0.8)',
    borderBottom: '1px solid rgba(139, 92, 246, 0.1)',
    maxWidth: '800px',
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box' as const,
  },
  hpLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#e2d9f3',
    marginBottom: '4px',
    fontWeight: '600',
  },
  hpTrack: {
    height: '8px',
    background: 'rgba(139, 92, 246, 0.1)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  hpFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.5s ease, background 0.3s ease',
  },
  inventoryPanel: {
    position: 'absolute' as const,
    top: '80px',
    right: '16px',
    width: '320px',
    background: 'linear-gradient(145deg, rgba(20, 10, 40, 0.98), rgba(10, 5, 25, 0.99))',
    border: '1px solid rgba(139, 92, 246, 0.4)',
    borderRadius: '16px',
    padding: '20px',
    zIndex: 100,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
  },
  inventoryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
  },
  inventoryTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#e2d9f3',
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#8b7faa',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  inventoryGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  inventoryItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    background: 'rgba(139, 92, 246, 0.08)',
    border: '1px solid rgba(139, 92, 246, 0.15)',
    borderRadius: '10px',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left' as const,
    transition: 'border-color 0.2s',
  },
  itemIcon: {
    fontSize: '28px',
    width: '40px',
    textAlign: 'center' as const,
  },
  itemInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
    flex: 1,
  },
  itemName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#e2d9f3',
  },
  itemDesc: {
    fontSize: '11px',
    color: '#8b7faa',
  },
  itemArrow: {
    color: '#a78bfa',
    fontSize: '16px',
  },
  emptyInventory: {
    textAlign: 'center' as const,
    color: '#6b5b8a',
    fontSize: '14px',
    padding: '20px',
  },
  statsToggle: {
    background: 'rgba(139, 92, 246, 0.15)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '16px',
    cursor: 'pointer',
  },
  statsPanel: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  statsTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#a78bfa',
    margin: '0 0 8px 0',
  },
  statRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 0',
    borderBottom: '1px solid rgba(139, 92, 246, 0.1)',
  },
  statLabel: {
    flex: 1,
    fontSize: '13px',
    color: '#e2d9f3',
  },
  statValue: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#e2d9f3',
    minWidth: '30px',
    textAlign: 'center' as const,
  },
  statMod: {
    fontSize: '12px',
    fontWeight: '600',
    minWidth: '36px',
    textAlign: 'right' as const,
  },
  spellsPanel: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  spellBack: {
    background: 'none',
    border: 'none',
    color: '#a78bfa',
    fontSize: '13px',
    cursor: 'pointer',
    padding: '0 0 8px 0',
    textAlign: 'left' as const,
  },
  spellsTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#a78bfa',
    margin: 0,
  },
  spellItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '8px 10px',
    background: 'rgba(139, 92, 246, 0.08)',
    borderRadius: '8px',
  },
  spellIcon: {
    fontSize: '22px',
    marginTop: '2px',
  },
  spellName: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#e2d9f3',
  },
  spellDesc: {
    display: 'block',
    fontSize: '11px',
    color: '#8b7faa',
    marginTop: '2px',
  },
  itemDetail: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  itemDetailHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  itemDetailName: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#e2d9f3',
    margin: 0,
  },
  itemDetailDesc: {
    fontSize: '12px',
    color: '#8b7faa',
    margin: '4px 0 0 0',
  },
  itemActions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    marginTop: '8px',
  },
  actionButton: {
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#e2d9f3',
    background: 'rgba(139, 92, 246, 0.15)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '10px',
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'all 0.2s',
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
