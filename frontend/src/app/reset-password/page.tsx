/**
 * Password Reset Page
 * Handles password reset from email links
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';

function ResetPasswordContent() {
  const [status, setStatus] = useState<'loading' | 'form' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        // Get the token from URL parameters
        const access_token = searchParams.get('access_token');
        const refresh_token = searchParams.get('refresh_token');
        
        if (access_token && refresh_token) {
          // Set the session with the tokens from the URL
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (error) {
            setStatus('error');
            setMessage('Invalid reset link or link has expired');
          } else {
            setStatus('form');
            setMessage('Please enter your new password');
          }
        } else {
          setStatus('error');
          setMessage('Invalid reset link');
        }
      } catch {
        setStatus('error');
        setMessage('An error occurred while processing your reset link');
      }
    };

    handlePasswordReset();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters long');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setMessage(error.message || 'Failed to update password');
        setIsSubmitting(false);
      } else {
        setStatus('success');
        setMessage('Password updated successfully! Redirecting to login...');
        
        // Sign out and redirect to login
        setTimeout(async () => {
          await supabase.auth.signOut();
          router.push('/auth/login?message=Password updated successfully');
        }, 2000);
      }
    } catch {
      setMessage('An error occurred while updating your password');
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-surface border border-border rounded-xl p-8 text-center">
            <div className="animate-pulse">
              <div className="w-8 h-8 bg-primary/20 rounded-full mx-auto mb-4"></div>
              <p className="text-text-muted">Processing reset link...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-surface border border-border rounded-xl p-8 text-center">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-text-primary mb-2">Reset Failed</h1>
            <p className="text-text-muted mb-6">{message}</p>
            <button
              onClick={() => router.push('/auth/login')}
              className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-surface border border-border rounded-xl p-8 text-center">
            <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-text-primary mb-2">Success!</h1>
            <p className="text-text-muted">{message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-surface border border-border rounded-xl p-8">
          <h1 className="text-2xl font-bold text-text-primary mb-2 text-center">Reset Password</h1>
          <p className="text-text-muted text-center mb-6">{message}</p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-1">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary"
                placeholder="Enter new password"
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-primary mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary"
                placeholder="Confirm new password"
              />
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {isSubmitting ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-text-muted">Loading...</div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
} 