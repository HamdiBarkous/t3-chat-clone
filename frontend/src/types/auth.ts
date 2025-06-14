/**
 * Authentication-related TypeScript types
 */

import { User } from '@supabase/supabase-js';

export type AuthUser = User;

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials extends LoginCredentials {
  name?: string;
}

export interface SignupResult {
  needsConfirmation: boolean;
  message?: string;
}

export interface AuthContextType extends AuthState {
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: SignupCredentials) => Promise<SignupResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export interface AuthError {
  message: string;
  code?: string;
} 