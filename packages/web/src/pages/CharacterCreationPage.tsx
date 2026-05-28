/**
 * CharacterCreationPage — Dungeon-themed character creation.
 * Requirements: 4.1
 */

import React, { useState } from 'react';
import type { Race, CharacterClass, AttributeKey } from '../types';
import { useApi } from '../hooks/useApi';

export interface CharacterCreationPageProps {
  onCharacterCreated: (characterId: string) => void;
}

const RACES: { value: Race; icon: string; name: string }[] = [
  { value: 'human', icon: '🛡️', name: 'Mensch' },
  { value: 'elf', icon: '🏹', name: 'Elf' },
  { value: 'dwarf', icon: '⚒️', name: 'Zwerg' },
];

const CLASSES: { value: CharacterClass; icon: string; name: string }[] = [
  { value: 'warrior', icon: '⚔️', name: 'Krieger' },
  { value: 'mage', icon: '🔮', name: 'Magier' },
  { value: 'rogue', icon: '🗡️', name: 'Schurke' },
];

const ATTRIBUTE_LABELS: Record<AttributeKey, { de: string; icon: string }> = {
  strength: { de: 'Stärke', icon: '💪' },
  dexterity: { de: 'Geschick', icon: '🤸' },
  intelligence: { de: 'Intelligenz', icon: '🧠' },
  charisma: { de: 'Charisma', icon: '✨' },
};

const ATTRIBUTES: AttributeKey[] = ['strength', 'dexterity', 'intelligence', 'charisma'];

export function CharacterCreationPage({
  onCharacterCreated,
}: CharacterCreationPageProps): React.JSX.Element {
  const api = useApi();
  const [name, setName] = useState('');
  const [race, setRace] = useState<Race>('human');
  const [charClass, setCharClass] = useState<CharacterClass>('warrior');
  const [attributes, setAttributes] = useState<Record<AttributeKey, number>>({
    strength: 10,
    dexterity: 10,
    intelligence: 10,
    charisma: 10,
  });
  const [backgroundStory, setBackgroundStory] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleAttributeChange(key: AttributeKey, value: number) {
    const clamped = Math.max(1, Math.min(20, value));
    setAttributes((prev) => ({ ...prev, [key]: clamped }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Jeder Held braucht einen Namen.');
      return;
    }
    if (backgroundStory.length > 2000) {
      setError('Deine Geschichte ist zu lang. Maximum 2000 Zeichen.');
      return;
    }

    setLoading(true);
    try {
      const character = await api.createCharacter({
        name: name.trim(),
        race,
        class: charClass,
        attributes,
        backgroundStory,
      });
      onCharacterCreated(character.id);
    } catch {
      setError('Die Götter zürnen. Charakter konnte nicht erschaffen werden.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <header style={styles.header}>
          <span style={styles.headerIcon}>🪶</span>
          <h1 style={styles.title}>Erschaffe deinen Helden</h1>
          <p style={styles.subtitle}>Eine Legende beginnt mit einem Namen</p>
        </header>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Name */}
          <div style={styles.field}>
            <label htmlFor="char-name" style={styles.label}>Heldenname</label>
            <input
              id="char-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="z.B. Aragorn der Tapfere"
              style={styles.input}
            />
          </div>

          {/* Race */}
          <div style={styles.field}>
            <label style={styles.label}>Volk</label>
            <div style={styles.optionGrid}>
              {RACES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRace(r.value)}
                  style={{
                    ...styles.optionCard,
                    ...(race === r.value ? styles.optionCardSelected : {}),
                  }}
                >
                  <span style={styles.optionIcon}>{r.icon}</span>
                  <span style={styles.optionName}>{r.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Class */}
          <div style={styles.field}>
            <label style={styles.label}>Klasse</label>
            <div style={styles.optionGrid}>
              {CLASSES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCharClass(c.value)}
                  style={{
                    ...styles.optionCard,
                    ...(charClass === c.value ? styles.optionCardSelected : {}),
                  }}
                >
                  <span style={styles.optionIcon}>{c.icon}</span>
                  <span style={styles.optionName}>{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Attributes */}
          <fieldset style={styles.fieldset}>
            <legend style={styles.legend}>Attribute (1–20)</legend>
            <div style={styles.attributeGrid}>
              {ATTRIBUTES.map((attr) => {
                const meta = ATTRIBUTE_LABELS[attr];
                return (
                  <div key={attr} style={styles.attributeRow}>
                    <div style={styles.attributeLabel}>
                      <span style={styles.attributeIcon}>{meta.icon}</span>
                      <span>{meta.de}</span>
                    </div>
                    <div style={styles.attributeControls}>
                      <button
                        type="button"
                        onClick={() => handleAttributeChange(attr, attributes[attr] - 1)}
                        style={styles.attrButton}
                      >−</button>
                      <span style={styles.attributeValue}>{attributes[attr]}</span>
                      <button
                        type="button"
                        onClick={() => handleAttributeChange(attr, attributes[attr] + 1)}
                        style={styles.attrButton}
                      >+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </fieldset>

          {/* Background */}
          <div style={styles.field}>
            <label htmlFor="background-story" style={styles.label}>
              Hintergrundgeschichte
            </label>
            <textarea
              id="background-story"
              value={backgroundStory}
              onChange={(e) => setBackgroundStory(e.target.value)}
              maxLength={2000}
              rows={6}
              placeholder="Erzähle die Geschichte deines Helden..."
              style={styles.textarea}
            />
            <span style={styles.charCount}>{backgroundStory.length}/2000</span>
          </div>

          {error && (
            <div style={styles.error} role="alert">
              <span>⚠️</span> {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={styles.submitButton}>
            {loading ? '🪄 Erschaffe...' : '✨ Helden erschaffen'}
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
    maxWidth: '640px',
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
    color: '#e2d9f3',
    margin: '0 0 4px 0',
    background: 'linear-gradient(135deg, #a78bfa, #c084fc)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '14px',
    color: '#a78bfa',
    fontStyle: 'italic',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
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
  optionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
  },
  optionCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '16px 12px',
    background: 'rgba(20, 10, 40, 0.6)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: '12px',
    cursor: 'pointer',
    color: '#c4b5fd',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  optionCardSelected: {
    background: 'linear-gradient(145deg, rgba(124, 58, 237, 0.3), rgba(109, 40, 217, 0.4))',
    border: '1px solid rgba(167, 139, 250, 0.6)',
    color: '#fff',
    boxShadow: '0 0 20px rgba(124, 58, 237, 0.3)',
  },
  optionIcon: {
    fontSize: '28px',
  },
  optionName: {
    fontWeight: '600',
  },
  fieldset: {
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: '12px',
    padding: '16px 20px',
    background: 'rgba(20, 10, 40, 0.4)',
  },
  legend: {
    color: '#a78bfa',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    padding: '0 8px',
  },
  attributeGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  attributeRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid rgba(139, 92, 246, 0.1)',
  },
  attributeLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#e2d9f3',
    fontSize: '15px',
  },
  attributeIcon: {
    fontSize: '20px',
  },
  attributeControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  attrButton: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'rgba(139, 92, 246, 0.15)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    color: '#c4b5fd',
    fontSize: '18px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  attributeValue: {
    minWidth: '40px',
    textAlign: 'center',
    fontSize: '20px',
    fontWeight: '700',
    color: '#e2d9f3',
  },
  textarea: {
    background: 'rgba(139, 92, 246, 0.08)',
    border: '1px solid rgba(139, 92, 246, 0.25)',
    borderRadius: '10px',
    padding: '14px 16px',
    fontSize: '14px',
    color: '#e2d9f3',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  charCount: {
    textAlign: 'right',
    fontSize: '11px',
    color: '#6b5b8a',
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
  },
};
