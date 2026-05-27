import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { DiceResult } from '../components/DiceResult';
import { useApi } from '../hooks/useApi';

interface Message {
  id: string;
  role: 'player' | 'gm' | 'npc';
  text: string;
  diceResult?: {
    rollResult: number;
    modifier: number;
    difficulty: number;
    total: number;
    succeeded: boolean;
  };
}

export interface GameSessionScreenProps {
  sessionId: string;
  onBack: () => void;
}

/**
 * Chat interface with text input, message display, dice results, and optional voice input toggle.
 * Requirements: 6.1, 6.2, 8.1, 9.3
 */
export function GameSessionScreen({ sessionId, onBack }: GameSessionScreenProps): React.JSX.Element {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList<Message>>(null);
  const api = useApi();

  async function handleSend() {
    const text = inputText.trim();
    if (!text || sending) return;

    setError(null);
    const playerMessage: Message = {
      id: `player-${Date.now()}`,
      role: 'player',
      text,
    };
    setMessages((prev) => [...prev, playerMessage]);
    setInputText('');
    setSending(true);

    try {
      const result = await api.sendMessage(sessionId, text, voiceEnabled ? 'voice' : 'text');
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        const gmMessage: Message = {
          id: `gm-${Date.now()}`,
          role: 'gm',
          text: result.data.narration,
          diceResult: result.data.diceResult,
        };
        setMessages((prev) => [...prev, gmMessage]);
      }
    } catch {
      setError('Nachricht konnte nicht gesendet werden. Bitte erneut versuchen.');
    } finally {
      setSending(false);
    }
  }

  function renderMessage({ item }: { item: Message }) {
    const isPlayer = item.role === 'player';
    return (
      <View style={[styles.messageBubble, isPlayer ? styles.playerBubble : styles.gmBubble]}>
        <Text style={styles.roleLabel}>{isPlayer ? 'Du' : item.role === 'gm' ? 'Game Master' : 'NPC'}</Text>
        <Text style={styles.messageText}>{item.text}</Text>
        {item.diceResult && (
          <DiceResult
            rollResult={item.diceResult.rollResult}
            modifier={item.diceResult.modifier}
            difficulty={item.diceResult.difficulty}
            total={item.diceResult.total}
            succeeded={item.diceResult.succeeded}
          />
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} accessibilityRole="button" accessibilityLabel="Zurück">
          <Text style={styles.backLink}>← Zurück</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Spielsitzung</Text>
        <TouchableOpacity
          onPress={() => setVoiceEnabled(!voiceEnabled)}
          accessibilityRole="button"
          accessibilityLabel={voiceEnabled ? 'Spracheingabe deaktivieren' : 'Spracheingabe aktivieren'}
          accessibilityState={{ selected: voiceEnabled }}
        >
          <Text style={[styles.voiceToggle, voiceEnabled && styles.voiceToggleActive]}>
            🎤
          </Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Beschreibe deine Aktion..."
          placeholderTextColor="#888"
          multiline
          maxLength={2000}
          editable={!sending}
          accessibilityLabel="Nachricht eingeben"
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
          accessibilityRole="button"
          accessibilityLabel="Nachricht senden"
        >
          <Text style={styles.sendButtonText}>→</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  backLink: {
    color: '#7b7bf0',
    fontSize: 14,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  voiceToggle: {
    fontSize: 22,
    opacity: 0.4,
  },
  voiceToggleActive: {
    opacity: 1.0,
  },
  errorBanner: {
    backgroundColor: '#3d0000',
    padding: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 13,
    textAlign: 'center',
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    maxWidth: '85%',
  },
  playerBubble: {
    backgroundColor: '#2a2a4e',
    alignSelf: 'flex-end',
  },
  gmBubble: {
    backgroundColor: '#1a1a2e',
    alignSelf: 'flex-start',
  },
  roleLabel: {
    color: '#888888',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  messageText: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 22,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#1a1a2e',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#ffffff',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#333355',
  },
  sendButton: {
    backgroundColor: '#4a4ae0',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});
