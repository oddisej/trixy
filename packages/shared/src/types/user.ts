/**
 * User domain model.
 */

export interface User {
  id: string; // UUID
  email: string;
  passwordHash?: string; // null for OAuth-only accounts
  authProviders: ('local' | 'google' | 'apple')[];
  createdAt: Date;
  failedLoginCount: number;
  lockedUntil?: Date;
  voiceInputEnabled: boolean;
  voiceLanguage: 'de' | 'en';
}
