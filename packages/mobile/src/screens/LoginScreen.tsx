import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useApi } from '../hooks/useApi';

export interface LoginScreenProps {
  onLoginSuccess: () => void;
  onNavigateToRegister: () => void;
}

/**
 * Login screen with email/password form and OAuth buttons.
 * Requirements: 6.1, 6.2, 8.1
 */
export function LoginScreen({ onLoginSuccess, onNavigateToRegister }: LoginScreenProps): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const api = useApi();

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      const result = await api.login(email, password);
      if (result.error) {
        setError(result.error);
      } else {
        onLoginSuccess();
      }
    } catch {
      setError('Login fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuthLogin(provider: 'google' | 'apple') {
    setError(null);
    setLoading(true);
    try {
      const result = await api.loginWithProvider(provider);
      if (result.error) {
        setError(result.error);
      } else {
        onLoginSuccess();
      }
    } catch {
      setError(`${provider}-Login fehlgeschlagen.`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trixy RPG</Text>
      <Text style={styles.subtitle}>Melde dich an, um dein Abenteuer fortzusetzen</Text>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TextInput
        style={styles.input}
        placeholder="E-Mail"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="E-Mail-Adresse"
      />

      <TextInput
        style={styles.input}
        placeholder="Passwort"
        placeholderTextColor="#888"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        accessibilityLabel="Passwort"
      />

      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={handleLogin}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Anmelden"
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Anmelden</Text>
        )}
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>oder</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        style={[styles.button, styles.oauthButton]}
        onPress={() => handleOAuthLogin('google')}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Mit Google anmelden"
      >
        <Text style={styles.oauthButtonText}>Mit Google anmelden</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.oauthButton]}
        onPress={() => handleOAuthLogin('apple')}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Mit Apple anmelden"
      >
        <Text style={styles.oauthButtonText}>Mit Apple anmelden</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onNavigateToRegister}
        accessibilityRole="button"
        accessibilityLabel="Zur Registrierung"
      >
        <Text style={styles.linkText}>Noch kein Konto? Registrieren</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#aaaaaa',
    textAlign: 'center',
    marginBottom: 32,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333355',
  },
  button: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#4a4ae0',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333355',
  },
  dividerText: {
    color: '#888888',
    paddingHorizontal: 12,
    fontSize: 13,
  },
  oauthButton: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#333355',
  },
  oauthButtonText: {
    color: '#cccccc',
    fontSize: 15,
    fontWeight: '500',
  },
  linkText: {
    color: '#7b7bf0',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
});
