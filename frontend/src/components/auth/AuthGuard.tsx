/**
 * Auth Guard Component
 * Protects routes by redirecting unauthenticated users
 */

'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function AuthGuard({ 
  children, 
  fallback = <AuthLoadingSpinner />,
  redirectTo = '/auth/login'
}: AuthGuardProps) {
  const { user, loading, initialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (initialized && !loading && !user) {
      router.push(redirectTo);
    }
  }, [user, loading, initialized, router, redirectTo]);

  // Still initializing or loading
  if (!initialized || loading) {
    return <>{fallback}</>;
  }

  // Not authenticated
  if (!user) {
    return null; // Will redirect via useEffect
  }

  // Authenticated - render children
  return <>{children}</>;
}

// Loading spinner component
function AuthLoadingSpinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-text-primary text-sm">Loading...</p>
      </div>
    </div>
  );
} 