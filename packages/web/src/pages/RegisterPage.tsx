/**
 * RegisterPage — Dungeon-themed registration form.
 * Requirements: 10.1, 10.5
 */

import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';

export interface RegisterPageProps {
  onRegisterSuccess: (userId: string) => void;
  onNavigateToLogin: () => void;
}

export function RegisterPage({
  onRegisterSuccess,
  onNavigateToLogin,
}: RegisterPageProps): React.JSX.Element {
  const api = useApi();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein.');
      return;
    }

    setLoading(true);

    try {
      const result = await api.register(email, password);
      if (result.kind === 'ok') {
        onRegisterSuccess(result.userId);
      } else if (result.kind === 'email_in_use') {
        setError('Diese E-Mail ist bereits registriert.');
      } else if (result.kind === 'invalid_email_format') {
        setError('Bitte gib eine gültige E-Mail-Adresse ein.');
      } else if (result.kind === 'invalid_password_format') {
        setError('Passwort muss 8–128 Zeichen lang sein und mindestens einen Großbuchstaben, einen Kleinbuchstaben und eine Ziffer enthalten.');
      } else {
        setError('Registrierung fehlgeschlagen. Bitte versuche es erneut.');
      }
    } catch {
      setError('Verbindung zum Server fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.particles}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ ...styles.particle, animationDelay: `${i * 0.8}s`, left: `${15 + i * 14}%` }} />
        ))}
      </div>

      <div style={styles.card}>
        <div style={styles.logoSection}>
          <div style={styles.logoIcon}>🛡️</div>
          <h1 style={styles.title}>Konto erstellen</h1>
          <p style={styles.subtitle}>The Dungeons of Arhenzech</p>
        </div>

        {error && (
          <div style={styles.error} role="alert">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label htmlFor="reg-email" style={styles.label}>E-Mail</label>
            <input
              id="reg-email"
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
            <label htmlFor="reg-password" style={styles.label}>Passwort</label>
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              placeholder="••••••••"
              style={styles.input}
            />
            <span style={styles.hint}>Min. 8 Zeichen, 1 Großbuchstabe, 1 Kleinbuchstabe, 1 Ziffer</span>
          </div>

          <div style={styles.field}>
            <label htmlFor="reg-confirm" style={styles.label}>Passwort bestätigen</label>
            <input
              id="reg-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              placeholder="••••••••"
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={loading} style={styles.submitButton}>
            {loading ? 'Wird registriert...' : 'Registrieren'}
          </button>
        </form>

        <p style={styles.loginText}>
          Bereits ein Konto?{' '}
          <button type="button" onClick={onNavigateToLogin} style={styles.linkButton}>
            Anmelden
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
    letterSpacing: '1px',
    background: 'linear-gradient(135deg, #a78bfa, #7c3aed, #c084fc)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: '0 0 4px 0',
  },
  subtitle: {
    color: '#8b7faa',
    fontSize: '13px',
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
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
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
  },
  hint: {
    fontSize: '11px',
    color: '#6b5b8a',
    marginTop: '2px',
  },
  submitButton: {
    marginTop: '8px',
    padding: '16px',
    fontSize: '16px',
    fontWeight: '700',
    color: '#ffffff',
    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(124, 58, 237, 0.4)',
  },
  loginText: {
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
