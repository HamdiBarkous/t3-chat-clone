/**
 * Signup Form Component
 * Styled to match T3.chat interface
 */

'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { SignupCredentials } from '@/types/auth';

interface SignupFormProps {
  onSuccess?: (result: { needsConfirmation: boolean; message?: string }) => void;
  onSwitchToLogin?: () => void;
}

export function SignupForm({ onSuccess, onSwitchToLogin }: SignupFormProps) {
  const { signUp } = useAuth();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SignupCredentials & { confirmPassword: string }>();

  const password = watch('password');

  const onSubmit = async (data: SignupCredentials & { confirmPassword: string }) => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const result = await signUp({
        email: data.email,
        password: data.password,
        name: data.name,
      });
      
      if (result.needsConfirmation) {
        setSuccessMessage(
          result.message || 
          'Account created! Please check your email and click the confirmation link to activate your account.'
        );
        onSuccess?.(result);
      } else {
        setSuccessMessage('Account created and you are now signed in!');
        onSuccess?.(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-[#1e1e1e] p-8 rounded-lg border border-[#3f3f46]">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-white mb-2">
            Create your account
          </h1>
          <p className="text-zinc-400">
            Join T3.chat and start chatting with AI
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            label="Name"
            type="text"
            placeholder="Enter your name"
            error={errors.name?.message}
            {...register('name', {
              required: 'Name is required',
              minLength: {
                value: 2,
                message: 'Name must be at least 2 characters',
              },
            })}
          />

          <Input
            label="Email"
            type="email"
            placeholder="Enter your email"
            error={errors.email?.message}
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            })}
          />

          <Input
            label="Password"
            type="password"
            placeholder="Create a password"
            error={errors.password?.message}
            {...register('password', {
              required: 'Password is required',
              minLength: {
                value: 8,
                message: 'Password must be at least 8 characters',
              },
            })}
          />

          <Input
            label="Confirm Password"
            type="password"
            placeholder="Confirm your password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (value) =>
                value === password || 'Passwords do not match',
            })}
          />

          {error && (
            <div className="p-3 rounded-lg bg-red-900/20 border border-red-500/20">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-green-900/20 border border-green-500/20">
              <p className="text-green-400 text-sm">{successMessage}</p>
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            loading={isLoading}
            className="w-full"
          >
            Create Account
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-zinc-400 text-sm">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-[#8b5cf6] hover:text-[#a78bfa] transition-colors"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
} 