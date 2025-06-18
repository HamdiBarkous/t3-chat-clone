/**
 * Login Page
 * Handles user authentication and routing
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { user, initialized } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (initialized && user) {
      router.push('/');
    }
  }, [user, initialized, router]);

  // Don't render anything until auth is initialized
  if (!initialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Don't render if user is authenticated (will redirect)
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <LoginForm
          onSuccess={() => router.push('/')}
          onSwitchToSignup={() => router.push('/auth/signup')}
        />
      </div>
    </div>
  );
} 