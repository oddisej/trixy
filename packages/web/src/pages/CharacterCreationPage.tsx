/**
 * CharacterCreationPage — Simplified character creation.
 * Choose from: Zwerg, Ritter, Magier, Barde.
 * Attributes are rolled using D&D rules (4d6 drop lowest).
 * Requirements: 4.1
 */

import React, { useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';

export interface CharacterCreationPageProps {
  onCharacterCreated: (characterId: string) => void;
}

const CLASSES = [
  { value: 'zwerg', icon: '⚒️', name: 'Zwerg', bonus: 'strength', malus: 'intelligence' },
  { value: 'ritter', icon: '🛡️', name: 'Ritter', bonus: 'dexterity', malus: 'charisma' },
  { value: 'magier', icon: '🔮', name: 'Magier', bonus: 'intelligence', malus: 'strength' },
  { value: 'barde', icon: '🎵', name: 'Barde', bonus: 'charisma', malus: 'dexterity' },
];

/** Class bonuses: +2 to bonus attribute, -2 to malus attribute */
const CLASS_MODIFIER = 2;

const ATTRIBUTE_NAMES = [
  { key: 'strength', de: 'Stärke', icon: '💪' },
  { key: 'dexterity', de: 'Geschick', icon: '🤸' },
  { key: 'constitution', de: 'Konstitution', icon: '❤️' },
  { key: 'intelligence', de: 'Intelligenz', icon: '🧠' },
  { key: 'wisdom', de: 'Weisheit', icon: '👁️' },
  { key: 'charisma', de: 'Charisma', icon: '✨' },
];

/**
 * Rolls 4d6 and drops the lowest die — standard D&D attribute generation.
 */
function roll4d6DropLowest(): { total: number; dice: number[] } {
  const dice = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
  const sorted = [...dice].sort((a, b) => a - b);
  const total = sorted[1] + sorted[2] + sorted[3]; // drop lowest
  return { total, dice };
}

function rollAllAttributes(): Record<string, { total: number; dice: number[] }> {
  const result: Record<string, { total: number; dice: number[] }> = {};
  for (const attr of ATTRIBUTE_NAMES) {
    result[attr.key] = roll4d6DropLowest();
  }
  return result;
}

/**
 * Applies class modifiers to rolled attributes.
 * Returns the final values with bonus/malus applied.
 */
function applyClassModifiers(
  rolled: Record<string, { total: number; dice: number[] }>,
  classValue: string | null,
): Record<string, { total: number; dice: number[]; modifier: number; final: number }> {
  const classInfo = CLASSES.find((c) => c.value === classValue);
  const result: Record<string, { total: number; dice: number[]; modifier: number; final: number }> = {};

  for (const [key, val] of Object.entries(rolled)) {
    let modifier = 0;
    if (classInfo) {
      if (key === classInfo.bonus) modifier = CLASS_MODIFIER;
      if (key === classInfo.malus) modifier = -CLASS_MODIFIER;
    }
    result[key] = { ...val, modifier, final: Math.max(1, Math.min(20, val.total + modifier)) };
  }
  return result;
}

export function CharacterCreationPage({
  onCharacterCreated,
}: CharacterCreationPageProps): React.JSX.Element {
  const api = useApi();
  const [name, setName] = useState('');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [attributes, setAttributes] = useState<Record<string, { total: number; dice: number[] }> | null>(null);
  const [rolling, setRolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRoll = useCallback(() => {
    setRolling(true);
    // Short animation delay for feel
    setTimeout(() => {
      setAttributes(rollAllAttributes());
      setRolling(false);
    }, 600);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Bitte gib einen Namen ein.');
      return;
    }
    if (!selectedClass) {
      setError('Bitte wähle eine Klasse.');
      return;
    }
    if (!attributes) {
      setError('Bitte würfle deine Attribute.');
      return;
    }

    setLoading(true);
    try {
      const modified = applyClassModifiers(attributes, selectedClass);
      const attrValues: Record<string, number> = {};
      for (const [key, val] of Object.entries(modified)) {
        attrValues[key] = val.final;
      }

      const character = await api.createCharacter({
        name: name.trim(),
        race: selectedClass, // using class as the main choice
        class: selectedClass,
        attributes: attrValues,
        backgroundStory: '',
      });
      onCharacterCreated(character.id);
    } catch {
      setError('Charakter konnte nicht erstellt werden.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <header style={styles.header}>
          <span style={styles.headerIcon}>⚔️</span>
          <h1 style={styles.title}>Charakter erstellen</h1>
          <p style={styles.subtitle}>The Dungeons of Arhenzech</p>
        </header>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Name */}
          <div style={styles.field}>
            <label htmlFor="char-name" style={styles.label}>Name</label>
            <input
              id="char-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Wie heißt dein Charakter?"
              style={styles.input}
            />
          </div>

          {/* Class Selection */}
          <div style={styles.field}>
            <label style={styles.label}>Klasse wählen</label>
            <div style={styles.classGrid}>
              {CLASSES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setSelectedClass(c.value)}
                  style={{
                    ...styles.classCard,
                    ...(selectedClass === c.value ? styles.classCardSelected : {}),
                  }}
                >
                  <span style={styles.classIcon}>{c.icon}</span>
                  <span style={styles.className}>{c.name}</span>
                  <span style={styles.classBonus}>
                    +{CLASS_MODIFIER} {ATTRIBUTE_NAMES.find(a => a.key === c.bonus)?.de}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Attribute Rolling */}
          <div style={styles.field}>
            <div style={styles.attrHeader}>
              <label style={styles.label}>Attribute</label>
              <button
                type="button"
                onClick={handleRoll}
                disabled={rolling}
                style={styles.rollButton}
              >
                {rolling ? '🎲 Würfelt...' : attributes ? '🎲 Neu würfeln' : '🎲 Attribute würfeln'}
              </button>
            </div>
            <p style={styles.rollHint}>4W6, niedrigsten Würfel streichen (D&D-Regeln)</p>

            {attributes && (
              <div style={styles.attrGrid}>
                {ATTRIBUTE_NAMES.map((attr) => {
                  const roll = attributes[attr.key];
                  const modified = applyClassModifiers(attributes, selectedClass);
                  const attrData = modified[attr.key];
                  const sorted = [...roll.dice].sort((a, b) => a - b);
                  const droppedValue = sorted[0];
                  let droppedUsed = false;

                  return (
                    <div key={attr.key} style={styles.attrRow}>
                      <div style={styles.attrLabel}>
                        <span style={styles.attrIcon}>{attr.icon}</span>
                        <span>{attr.de}</span>
                      </div>
                      <div style={styles.attrRight}>
                        <span style={styles.attrDice}>
                          {roll.dice.map((d, i) => {
                            const isDropped = d === droppedValue && !droppedUsed;
                            if (isDropped) droppedUsed = true;
                            return (
                              <span
                                key={i}
                                style={{
                                  ...styles.die,
                                  ...(isDropped ? styles.dieDropped : {}),
                                }}
                              >
                                {d}
                              </span>
                            );
                          })}
                        </span>
                        {attrData.modifier !== 0 && (
                          <span style={{
                            ...styles.attrModifier,
                            color: attrData.modifier > 0 ? '#34d399' : '#f87171',
                          }}>
                            {attrData.modifier > 0 ? `+${attrData.modifier}` : attrData.modifier}
                          </span>
                        )}
                        <span style={styles.attrTotal}>{attrData.final}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!attributes && (
              <div style={styles.attrPlaceholder}>
                <span style={styles.placeholderIcon}>🎲</span>
                <p>Klicke auf "Attribute würfeln" um deine Werte zu bestimmen</p>
              </div>
            )}
          </div>

          {error && (
            <div style={styles.error} role="alert">
              <span>⚠️</span> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !selectedClass || !attributes || !name.trim()}
            style={{
              ...styles.submitButton,
              ...(!selectedClass || !attributes || !name.trim() ? styles.submitDisabled : {}),
            }}
          >
            {loading ? 'Wird erstellt...' : 'Charakter erstellen'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'radial-gradient(ellipse at top, #1a0a2e 0%, #0d0d1a 50%, #000000 100%)',
    padding: '32px 24px',
  },
  content: {
    maxWidth: '580px',
    margin: '0 auto',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
  },
  headerIcon: {
    fontSize: '40px',
    display: 'block',
    marginBottom: '8px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #a78bfa, #c084fc)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '13px',
    color: '#8b7faa',
    fontStyle: 'italic',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '28px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  label: {
    color: '#a78bfa',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  input: {
    background: 'rgba(139, 92, 246, 0.08)',
    border: '1px solid rgba(139, 92, 246, 0.25)',
    borderRadius: '10px',
    padding: '14px 16px',
    fontSize: '15px',
    color: '#e2d9f3',
    outline: 'none',
  },
  classGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '10px',
  },
  classCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '20px 12px',
    background: 'rgba(20, 10, 40, 0.6)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: '14px',
    cursor: 'pointer',
    color: '#c4b5fd',
    transition: 'all 0.2s',
  },
  classCardSelected: {
    background: 'linear-gradient(145deg, rgba(124, 58, 237, 0.3), rgba(109, 40, 217, 0.4))',
    border: '1px solid rgba(167, 139, 250, 0.7)',
    color: '#fff',
    boxShadow: '0 0 24px rgba(124, 58, 237, 0.4)',
    transform: 'scale(1.05)',
  },
  classIcon: {
    fontSize: '36px',
  },
  className: {
    fontSize: '13px',
    fontWeight: '600',
  },
  classBonus: {
    fontSize: '10px',
    color: '#34d399',
    marginTop: '2px',
  },
  attrHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rollButton: {
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#e2d9f3',
    background: 'rgba(139, 92, 246, 0.2)',
    border: '1px solid rgba(139, 92, 246, 0.4)',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  rollHint: {
    fontSize: '12px',
    color: '#6b5b8a',
    margin: 0,
    fontStyle: 'italic',
  },
  attrGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    background: 'rgba(20, 10, 40, 0.5)',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid rgba(139, 92, 246, 0.15)',
  },
  attrRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid rgba(139, 92, 246, 0.08)',
  },
  attrLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#e2d9f3',
    fontSize: '14px',
  },
  attrIcon: {
    fontSize: '18px',
  },
  attrRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  attrDice: {
    display: 'flex',
    gap: '4px',
  },
  die: {
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    background: 'rgba(139, 92, 246, 0.15)',
    color: '#c4b5fd',
    fontSize: '12px',
    fontWeight: '600',
  },
  dieDropped: {
    opacity: 0.3,
    textDecoration: 'line-through',
  },
  attrTotal: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#a78bfa',
    minWidth: '32px',
    textAlign: 'right',
  },
  attrModifier: {
    fontSize: '14px',
    fontWeight: '700',
    minWidth: '28px',
    textAlign: 'center',
  },
  attrPlaceholder: {
    textAlign: 'center',
    padding: '40px 24px',
    background: 'rgba(20, 10, 40, 0.4)',
    borderRadius: '12px',
    border: '1px dashed rgba(139, 92, 246, 0.25)',
    color: '#6b5b8a',
    fontSize: '14px',
  },
  placeholderIcon: {
    fontSize: '40px',
    display: 'block',
    marginBottom: '12px',
  },
  error: {
    background: 'rgba(220, 38, 38, 0.15)',
    border: '1px solid rgba(220, 38, 38, 0.4)',
    borderRadius: '10px',
    padding: '12px 16px',
    color: '#fca5a5',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  submitButton: {
    padding: '18px',
    fontSize: '16px',
    fontWeight: '700',
    color: '#ffffff',
    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(124, 58, 237, 0.4)',
    transition: 'all 0.2s',
  },
  submitDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
};
