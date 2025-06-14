/**
 * Signup Page
 * Handles user registration and email confirmation flow
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { SignupForm } from '@/components/auth/SignupForm';
import { useAuth } from '@/contexts/AuthContext';

function SignupContent() {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const { user, initialized } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Redirect if already authenticated
  useEffect(() => {
    if (initialized && user) {
      router.push('/');
    }
  }, [user, initialized, router]);

  // Check if we're returning from email confirmation
  useEffect(() => {
    const confirmed = searchParams.get('confirmed');
    if (confirmed === 'true') {
      // User successfully confirmed their email
      router.push('/');
    }
  }, [searchParams, router]);

  // Don't render anything until auth is initialized
  if (!initialized) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#8b5cf6] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Don't render if user is authenticated (will redirect)
  if (user) {
    return null;
  }

  const handleSignupSuccess = (result: { needsConfirmation: boolean; message?: string }) => {
    if (result.needsConfirmation) {
      setConfirmationMessage(result.message || 'Please check your email to confirm your account.');
      setShowConfirmation(true);
    } else {
      // User was signed in immediately
      router.push('/');
    }
  };

  if (showConfirmation) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-[#1e1e1e] p-8 rounded-lg border border-[#3f3f46]">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-[#8b5cf6]/20 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-[#8b5cf6]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z"
                  />
                </svg>
              </div>
              
              <h1 className="text-2xl font-semibold text-white mb-2">
                Check your email
              </h1>
              
              <p className="text-zinc-400 mb-6">
                {confirmationMessage}
              </p>
              
              <div className="space-y-4">
                <p className="text-sm text-zinc-500">
                  Click the link in the email to activate your account and start using T3.chat.
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowConfirmation(false);
                      setConfirmationMessage('');
                    }}
                    className="flex-1 px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    Back to signup
                  </button>
                  
                  <button
                    onClick={() => router.push('/auth/login')}
                    className="flex-1 px-4 py-2 text-sm bg-[#8b5cf6] text-white rounded-lg hover:bg-[#7c3aed] transition-colors"
                  >
                    Go to login
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <SignupForm
          onSuccess={handleSignupSuccess}
          onSwitchToLogin={() => router.push('/auth/login')}
        />
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#8b5cf6] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
} 