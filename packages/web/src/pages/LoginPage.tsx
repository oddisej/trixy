/**
 * LoginPage — Dungeon-themed login with email/password + OAuth.
 * Requirements: 10.1, 10.2
 */

import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';

export interface LoginPageProps {
  onLoginSuccess: (userId: string) => void;
  onNavigateToRegister: () => void;
}

export function LoginPage({ onLoginSuccess, onNavigateToRegister }: LoginPageProps): React.JSX.Element {
  const api = useApi();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await api.login(email, password);
      if (result.kind === 'ok') {
        onLoginSuccess(result.userId);
      } else if (result.kind === 'invalid_credentials') {
        setError('E-Mail oder Passwort ist falsch.');
      } else if (result.kind === 'account_locked') {
        setError(`Dein Konto ist gesperrt. Versuche es in ${result.remainingSeconds} Sekunden erneut.`);
      } else {
        setError('Anmeldung fehlgeschlagen. Bitte versuche es erneut.');
      }
    } catch {
      setError('Verbindung zum Server fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: 'google' | 'apple') {
    setError(null);
    setLoading(true);
    try {
      const result = await api.loginWithProvider(provider);
      if (result.kind === 'ok') {
        onLoginSuccess(result.userId);
      } else if (result.kind === 'provider_unavailable') {
        setError(`${provider}-Anmeldung ist gerade nicht verfügbar.`);
      } else {
        setError('Anmeldung fehlgeschlagen.');
      }
    } catch {
      setError('Verbindung zum Server fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      {/* Ambient particles */}
      <div style={styles.particles}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ ...styles.particle, animationDelay: `${i * 0.8}s`, left: `${15 + i * 14}%` }} />
        ))}
      </div>

      <div style={styles.card}>
        {/* Logo / Title */}
        <div style={styles.logoSection}>
          <div style={styles.logoIcon}>⚔️</div>
          <h1 style={styles.title}>The Dungeons of Arhenzech</h1>
          <p style={styles.subtitle}>Willkommen zurück</p>
        </div>

        {/* Error */}
        {error && (
          <div style={styles.error} role="alert">
            <span style={styles.errorIcon}>⚠️</span> {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} aria-label="Login form" style={styles.form}>
          <div style={styles.field}>
            <label htmlFor="email" style={styles.label}>E-Mail</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="name@example.com"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="password" style={styles.label}>Passwort</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={128}
              autoComplete="current-password"
              placeholder="••••••••"
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={loading} style={styles.primaryButton}>
            {loading ? 'Wird angemeldet...' : 'Anmelden'}
          </button>
        </form>

        {/* Divider */}
        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>oder</span>
          <div style={styles.dividerLine} />
        </div>

        {/* OAuth */}
        <div style={styles.oauthRow}>
          <button
            type="button"
            onClick={() => handleOAuth('google')}
            disabled={loading}
            style={styles.oauthButton}
            aria-label="Mit Google anmelden"
          >
            🌐 Google
          </button>
          <button
            type="button"
            onClick={() => handleOAuth('apple')}
            disabled={loading}
            style={styles.oauthButton}
            aria-label="Mit Apple anmelden"
          >
            🍎 Apple
          </button>
        </div>

        {/* Register link */}
        <p style={styles.registerText}>
          Noch kein Konto?{' '}
          <button type="button" onClick={onNavigateToRegister} style={styles.linkButton}>
            Jetzt registrieren
          </button>
        </p>
      </div>

      <style>{keyframes}</style>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const keyframes = `
@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
  50% { transform: translateY(-40px) scale(1.2); opacity: 0.7; }
}
@keyframes glow {
  0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3), inset 0 0 20px rgba(139, 92, 246, 0.05); }
  50% { box-shadow: 0 0 40px rgba(139, 92, 246, 0.5), inset 0 0 30px rgba(139, 92, 246, 0.1); }
}
@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
`;

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(ellipse at bottom, #1a0a2e 0%, #0d0d1a 50%, #000000 100%)',
    padding: '24px',
    position: 'relative',
    overflow: 'hidden',
  },
  particles: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute',
    bottom: '-10px',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'rgba(139, 92, 246, 0.6)',
    animation: 'float 4s ease-in-out infinite',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: 'linear-gradient(145deg, rgba(20, 10, 40, 0.95), rgba(10, 5, 25, 0.98))',
    borderRadius: '20px',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    padding: '48px 36px',
    animation: 'glow 4s ease-in-out infinite',
    position: 'relative',
    zIndex: 1,
  },
  logoSection: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logoIcon: {
    fontSize: '48px',
    marginBottom: '8px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '800',
    letterSpacing: '2px',
    background: 'linear-gradient(135deg, #a78bfa, #7c3aed, #c084fc)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: '0 0 4px 0',
    lineHeight: '1.3',
  },
  subtitle: {
    color: '#8b7faa',
    fontSize: '14px',
    fontStyle: 'italic',
    margin: 0,
  },
  error: {
    background: 'rgba(220, 38, 38, 0.15)',
    border: '1px solid rgba(220, 38, 38, 0.4)',
    borderRadius: '10px',
    padding: '12px 16px',
    marginBottom: '20px',
    color: '#fca5a5',
    fontSize: '13px',
    lineHeight: '1.4',
  },
  errorIcon: {
    marginRight: '6px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
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
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  primaryButton: {
    marginTop: '8px',
    padding: '16px',
    fontSize: '16px',
    fontWeight: '700',
    color: '#ffffff',
    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'transform 0.15s, box-shadow 0.2s',
    boxShadow: '0 4px 20px rgba(124, 58, 237, 0.4)',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '24px 0',
    gap: '12px',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: 'rgba(139, 92, 246, 0.2)',
  },
  dividerText: {
    color: '#6b5b8a',
    fontSize: '12px',
    whiteSpace: 'nowrap',
  },
  oauthRow: {
    display: 'flex',
    gap: '12px',
  },
  oauthButton: {
    flex: 1,
    padding: '12px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#c4b5fd',
    background: 'rgba(139, 92, 246, 0.08)',
    border: '1px solid rgba(139, 92, 246, 0.25)',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'background 0.2s, border-color 0.2s',
  },
  registerText: {
    textAlign: 'center',
    marginTop: '24px',
    color: '#6b5b8a',
    fontSize: '13px',
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: '#a78bfa',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    textDecoration: 'underline',
    padding: 0,
  },
};
