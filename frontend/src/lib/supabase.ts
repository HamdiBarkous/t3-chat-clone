/**
 * Supabase client configuration
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Provide fallback values during build time to allow static generation
const url = supabaseUrl || 'https://placeholder.supabase.co';
const key = supabaseAnonKey || 'placeholder-key';

// Check if we're in a browser environment and missing real credentials
const isMissingCredentials = typeof window !== 'undefined' && (!supabaseUrl || !supabaseAnonKey);

// Create the client with fallback values for build time
const _supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: false, // Disable auto refresh on window focus to prevent rerenders
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 't3-chat-auth', // Use a unique storage key
  },
});

// Export a proxy that checks credentials when accessed
export const supabase = new Proxy(_supabase, {
  get(target, prop) {
    // Allow safe access during build/SSR
    if (typeof window === 'undefined') {
      return target[prop as keyof typeof target];
    }
    
    // Check credentials in browser
    if (isMissingCredentials && prop === 'auth') {
      throw new Error(
        'Missing Supabase environment variables. Please check your .env.local file.'
      );
    }
    
    return target[prop as keyof typeof target];
  }
});

// Helper to get current session
export const getSession = async () => {
  if (isMissingCredentials) {
    throw new Error(
      'Missing Supabase environment variables. Please check your .env.local file.'
    );
  }
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error getting session:', error);
    return null;
  }
  return session;
};

// Helper to get current user
export const getCurrentUser = async () => {
  if (isMissingCredentials) {
    throw new Error(
      'Missing Supabase environment variables. Please check your .env.local file.'
    );
  }
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting user:', error);
    return null;
  }
  return user;
};

// Helper to get access token for API calls
export const getAccessToken = async () => {
  const session = await getSession();
  return session?.access_token || null;
}; 