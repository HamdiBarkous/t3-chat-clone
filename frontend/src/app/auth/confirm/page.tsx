/**
 * Email Confirmation Page
 * Handles the email confirmation callback from Supabase
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

function ConfirmContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, initialized } = useAuth();

  useEffect(() => {
    const handleConfirmation = async () => {
      try {
        // Get the token from URL parameters
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');
        
        if (token_hash && type) {
          // Verify the email confirmation
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as 'signup',
          });

          if (error) {
            setStatus('error');
            setMessage(error.message || 'Failed to confirm email');
          } else {
            setStatus('success');
            setMessage('Email confirmed successfully! You can now sign in.');
            
            // Redirect to login after a delay
            setTimeout(() => {
              router.push('/auth/login');
            }, 2000);
          }
        } else {
          setStatus('error');
          setMessage('Invalid confirmation link');
        }
      } catch {
        setStatus('error');
        setMessage('An error occurred during confirmation');
      }
    };

    handleConfirmation();
  }, [searchParams, router]);

  // If user is already authenticated, redirect to home
  useEffect(() => {
    if (initialized && user) {
      router.push('/');
    }
  }, [user, initialized, router]);

  const getStatusContent = () => {
    switch (status) {
      case 'loading':
        return {
          icon: (
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ),
          title: 'Confirming your email...',
          message: 'Please wait while we verify your account.',
        };
      case 'success':
        return {
          icon: (
            <svg
              className="w-8 h-8 text-green-accent"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          ),
          title: 'Email confirmed!',
          message: message,
        };
      case 'error':
        return {
          icon: (
            <svg
              className="w-8 h-8 text-destructive"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ),
          title: 'Confirmation failed',
          message: message,
        };
    }
  };

  const content = getStatusContent();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card p-8 rounded-lg border border-border">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center">
              {content.icon}
            </div>
            
            <h1 className="text-2xl font-semibold text-text-primary mb-2">
              {content.title}
            </h1>
            
            <p className="text-text-muted mb-6">
              {content.message}
            </p>
            
            {status === 'error' && (
              <div className="space-y-4">
                <button
                  onClick={() => router.push('/auth/signup')}
                  className="w-full px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-purple-dark transition-colors"
                >
                  Try signing up again
                </button>
                
                <button
                  onClick={() => router.push('/auth/login')}
                  className="w-full px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
                >
                  Back to login
                </button>
              </div>
            )}
            
            {status === 'success' && (
              <p className="text-sm text-text-muted">
                Redirecting to login page...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  );
} 