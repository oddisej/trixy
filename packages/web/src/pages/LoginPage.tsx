/**
 * LoginPage — email/password form + OAuth buttons (Google, Apple).
 * Requirements: 10.1, 10.2
 */

import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';

export interface LoginPageProps {
  onLoginSuccess: (userId: string) => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps): React.JSX.Element {
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
        setError('Invalid email or password.');
      } else if (result.kind === 'account_locked') {
        setError(`Account locked. Try again in ${result.remainingSeconds} seconds.`);
      } else {
        setError('Login failed. Please try again.');
      }
    } catch {
      setError('Service temporarily unavailable. Please try again.');
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
        setError(`${provider} login is temporarily unavailable.`);
      } else {
        setError('OAuth login failed.');
      }
    } catch {
      setError('Service temporarily unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <h1>Login</h1>

      <form onSubmit={handleSubmit} aria-label="Login form">
        <div className="form-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="form-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            maxLength={128}
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div className="oauth-section">
        <p>Or sign in with:</p>
        <button
          type="button"
          onClick={() => handleOAuth('google')}
          disabled={loading}
          aria-label="Sign in with Google"
        >
          Google
        </button>
        <button
          type="button"
          onClick={() => handleOAuth('apple')}
          disabled={loading}
          aria-label="Sign in with Apple"
        >
          Apple
        </button>
      </div>
    </div>
  );
}
