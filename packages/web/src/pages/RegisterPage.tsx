/**
 * RegisterPage — email/password registration form.
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
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const result = await api.register(email, password);
      if (result.kind === 'ok') {
        onRegisterSuccess(result.userId);
      } else if (result.kind === 'email_in_use') {
        setError('This email is already registered.');
      } else if (result.kind === 'invalid_email_format') {
        setError('Please enter a valid email address.');
      } else if (result.kind === 'invalid_password_format') {
        setError('Password must be 8–128 characters with at least one uppercase letter, one lowercase letter, and one digit.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } catch {
      setError('Service temporarily unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="register-page">
      <h1>Register</h1>

      <form onSubmit={handleSubmit} aria-label="Registration form">
        <div className="form-field">
          <label htmlFor="reg-email">Email</label>
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="form-field">
          <label htmlFor="reg-password">Password</label>
          <input
            id="reg-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
          />
          <small>Min. 8 characters, 1 uppercase, 1 lowercase, 1 digit</small>
        </div>

        <div className="form-field">
          <label htmlFor="reg-confirm-password">Confirm Password</label>
          <input
            id="reg-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
          />
        </div>

        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>

      <p>
        Already have an account?{' '}
        <button type="button" onClick={onNavigateToLogin} className="link-button">
          Login
        </button>
      </p>
    </div>
  );
}
