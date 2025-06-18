/**
 * Signup Page
 * Handles user registration and email confirmation flow
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SignupForm } from '@/components/auth/SignupForm';
import { useAuth } from '@/contexts/AuthContext';

export default function SignupPage() {
  const { user, initialized } = useAuth();
  const router = useRouter();
  const [signupResult, setSignupResult] = useState<{ needsConfirmation: boolean; message?: string } | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (initialized && user) {
      router.push('/');
    }
  }, [user, initialized, router]);

  // Don't render until we know auth state
  if (!initialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-text-primary">Loading...</div>
      </div>
    );
  }

  // Already authenticated
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {signupResult?.needsConfirmation ? (
          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <div className="mb-4">
              <svg className="w-12 h-12 mx-auto text-green-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">Check Your Email</h2>
            <p className="text-text-muted mb-6">
              {signupResult.message || 'Please check your email and click the confirmation link to activate your account.'}
            </p>
            <button
              onClick={() => router.push('/auth/login')}
              className="text-primary hover:text-purple-light transition-colors"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <SignupForm
            onSuccess={(result) => {
              if (result.needsConfirmation) {
                setSignupResult(result);
              } else {
                router.push('/');
              }
            }}
            onSwitchToLogin={() => router.push('/auth/login')}
          />
        )}
      </div>
    </div>
  );
} 