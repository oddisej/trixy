/**
 * CharacterCreationPage — form for race, class, attributes, background story.
 * Requirements: 4.1
 */

import React, { useState } from 'react';
import type { Race, CharacterClass, AttributeKey } from '../types';
import { useApi } from '../hooks/useApi';

export interface CharacterCreationPageProps {
  onCharacterCreated: (characterId: string) => void;
}

const RACES: Race[] = ['human', 'elf', 'dwarf'];
const CLASSES: CharacterClass[] = ['warrior', 'mage', 'rogue'];
const ATTRIBUTES: AttributeKey[] = ['strength', 'dexterity', 'intelligence', 'charisma'];

export function CharacterCreationPage({
  onCharacterCreated,
}: CharacterCreationPageProps): React.JSX.Element {
  const api = useApi();
  const [name, setName] = useState('');
  const [race, setRace] = useState<Race>(RACES[0]);
  const [charClass, setCharClass] = useState<CharacterClass>(CLASSES[0]);
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
      setError('Character name is required.');
      return;
    }
    if (backgroundStory.length > 2000) {
      setError('Background story must be 2000 characters or fewer.');
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
      setError('Failed to create character. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="character-creation-page">
      <h1>Create Character</h1>

      <form onSubmit={handleSubmit} aria-label="Character creation form">
        <div className="form-field">
          <label htmlFor="char-name">Name</label>
          <input
            id="char-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="char-race">Race</label>
          <select
            id="char-race"
            value={race}
            onChange={(e) => setRace(e.target.value as Race)}
          >
            {RACES.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="char-class">Class</label>
          <select
            id="char-class"
            value={charClass}
            onChange={(e) => setCharClass(e.target.value as CharacterClass)}
          >
            {CLASSES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend>Attributes (1–20)</legend>
          {ATTRIBUTES.map((attr) => (
            <div key={attr} className="form-field">
              <label htmlFor={`attr-${attr}`}>
                {attr.charAt(0).toUpperCase() + attr.slice(1)}
              </label>
              <input
                id={`attr-${attr}`}
                type="number"
                min={1}
                max={20}
                value={attributes[attr]}
                onChange={(e) => handleAttributeChange(attr, Number(e.target.value))}
              />
            </div>
          ))}
        </fieldset>

        <div className="form-field">
          <label htmlFor="background-story">Background Story (max 2000 chars)</label>
          <textarea
            id="background-story"
            value={backgroundStory}
            onChange={(e) => setBackgroundStory(e.target.value)}
            maxLength={2000}
            rows={5}
          />
          <span className="char-count">{backgroundStory.length}/2000</span>
        </div>

        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Character'}
        </button>
      </form>
    </div>
  );
}
