import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useApi } from '../hooks/useApi';

const RACES = ['human', 'elf', 'dwarf'] as const;
const CLASSES = ['warrior', 'mage', 'rogue'] as const;
const ATTRIBUTES = ['strength', 'dexterity', 'intelligence', 'charisma'] as const;

export interface CharacterCreationScreenProps {
  onCharacterCreated: (characterId: string) => void;
  onBack: () => void;
}

/**
 * Character creation form with race, class, attributes, and background story.
 * Requirements: 6.1, 6.2
 */
export function CharacterCreationScreen({ onCharacterCreated, onBack }: CharacterCreationScreenProps): React.JSX.Element {
  const [name, setName] = useState('');
  const [race, setRace] = useState<string>(RACES[0]);
  const [characterClass, setCharacterClass] = useState<string>(CLASSES[0]);
  const [attributes, setAttributes] = useState<Record<string, number>>(
    Object.fromEntries(ATTRIBUTES.map((attr) => [attr, 10]))
  );
  const [backgroundStory, setBackgroundStory] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const api = useApi();

  function updateAttribute(key: string, value: string) {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 1 && num <= 20) {
      setAttributes((prev) => ({ ...prev, [key]: num }));
    }
  }

  async function handleCreate() {
    setError(null);

    if (!name.trim()) {
      setError('Bitte gib einen Charakternamen ein.');
      return;
    }

    if (backgroundStory.length > 2000) {
      setError('Die Hintergrundgeschichte darf maximal 2000 Zeichen lang sein.');
      return;
    }

    setLoading(true);
    try {
      const result = await api.createCharacter({
        name: name.trim(),
        race,
        characterClass,
        attributes,
        backgroundStory,
      });
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        onCharacterCreated(result.data.characterId);
      }
    } catch {
      setError('Charaktererstellung fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onBack} accessibilityRole="button" accessibilityLabel="Zurück">
        <Text style={styles.backLink}>← Zurück</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Charakter erstellen</Text>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Charaktername"
        placeholderTextColor="#888"
        accessibilityLabel="Charaktername"
      />

      <Text style={styles.label}>Rasse</Text>
      <View style={styles.optionRow}>
        {RACES.map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.optionButton, race === r && styles.optionSelected]}
            onPress={() => setRace(r)}
            accessibilityRole="button"
            accessibilityLabel={`Rasse ${r}`}
            accessibilityState={{ selected: race === r }}
          >
            <Text style={[styles.optionText, race === r && styles.optionTextSelected]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Klasse</Text>
      <View style={styles.optionRow}>
        {CLASSES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.optionButton, characterClass === c && styles.optionSelected]}
            onPress={() => setCharacterClass(c)}
            accessibilityRole="button"
            accessibilityLabel={`Klasse ${c}`}
            accessibilityState={{ selected: characterClass === c }}
          >
            <Text style={[styles.optionText, characterClass === c && styles.optionTextSelected]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Attribute (1–20)</Text>
      {ATTRIBUTES.map((attr) => (
        <View key={attr} style={styles.attributeRow}>
          <Text style={styles.attributeLabel}>{attr}</Text>
          <TextInput
            style={styles.attributeInput}
            value={String(attributes[attr])}
            onChangeText={(v) => updateAttribute(attr, v)}
            keyboardType="numeric"
            accessibilityLabel={`Attribut ${attr}`}
          />
        </View>
      ))}

      <Text style={styles.label}>Hintergrundgeschichte (max. 2000 Zeichen)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={backgroundStory}
        onChangeText={setBackgroundStory}
        placeholder="Erzähle die Geschichte deines Charakters..."
        placeholderTextColor="#888"
        multiline
        numberOfLines={5}
        maxLength={2000}
        accessibilityLabel="Hintergrundgeschichte"
      />
      <Text style={styles.charCount}>{backgroundStory.length}/2000</Text>

      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={handleCreate}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Charakter erstellen"
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Charakter erstellen</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  backLink: {
    color: '#7b7bf0',
    fontSize: 14,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 24,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 13,
    marginBottom: 12,
  },
  label: {
    color: '#cccccc',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#333355',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    color: '#888888',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333355',
  },
  optionSelected: {
    borderColor: '#4a4ae0',
    backgroundColor: '#2a2a4e',
  },
  optionText: {
    color: '#aaaaaa',
    fontSize: 14,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#ffffff',
  },
  attributeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  attributeLabel: {
    color: '#cccccc',
    fontSize: 14,
    flex: 1,
    textTransform: 'capitalize',
  },
  attributeInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: '#ffffff',
    width: 60,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#333355',
  },
  button: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  primaryButton: {
    backgroundColor: '#4a4ae0',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
