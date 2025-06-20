'use client';

import React, { useState } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { useApiKey } from '@/hooks/useProfile';

interface ApiKeyManagerProps {
  onSuccess?: () => void;
}

export function ApiKeyManager({ onSuccess }: ApiKeyManagerProps) {
  const { hasApiKey, availableModels, loading, error, updateApiKey, testApiKey } = useApiKey();
  const [apiKey, setApiKey] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid?: boolean; message?: string } | null>(null);
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);

  const handleTest = async () => {
    if (!apiKey.trim()) return;
    
    setIsTesting(true);
    setValidationResult(null);
    
    try {
      const result = await testApiKey(apiKey.trim());
      setValidationResult(result);
    } catch (error) {
      console.error('Failed to test API key:', error);
      setValidationResult({
        valid: false,
        message: 'Failed to test API key. Please try again.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setIsSubmitting(true);
    setValidationResult(null);
    
    try {
      await updateApiKey(apiKey.trim());
      setApiKey('');
      setIsEditing(false);
      setValidationResult(null);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to update API key:', error);
      // Error is already set by the hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async () => {
    setIsSubmitting(true);
    setShowConfirmRemove(false);
    
    try {
      await updateApiKey(null);
      setIsEditing(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to remove API key:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmRemove = () => {
    setShowConfirmRemove(true);
  };

  const handleCancel = () => {
    setApiKey('');
    setIsEditing(false);
    setValidationResult(null);
  };

  if (loading) {
    return (
      <div className="p-6 bg-card border border-border rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
          <div className="h-10 bg-muted rounded w-full"></div>
        </div>
      </div>
    );
  }

  const premiumModelCount = availableModels.filter(model => model !== 'openai/gpt-4o-mini').length;

  return (
    <div className="p-6 bg-card border border-border rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-text-primary">OpenRouter API Key</h3>
          <p className="text-sm text-text-muted mt-1">
            Add your OpenRouter API key to unlock premium models
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            hasApiKey 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
          }`}>
            {hasApiKey ? `${premiumModelCount + 1} models` : '1 model'}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {!isEditing ? (
        <div className="space-y-4">
          {hasApiKey ? (
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-700 dark:text-green-400">
                  API key configured - {premiumModelCount} premium models unlocked
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  disabled={isSubmitting}
                >
                  Update
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={confirmRemove}
                  disabled={isSubmitting}
                  className="text-destructive hover:text-destructive"
                >
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-yellow-700 dark:text-yellow-400">
                  Only gpt-4o-mini available - Add API key to unlock premium models
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditing(true)}
                disabled={isSubmitting}
              >
                Add API Key
              </Button>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-or-v1-..."
              label="OpenRouter API Key"
              helperText="Your API key will be stored securely and used only for your premium model requests"
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-9 text-text-muted hover:text-text-primary"
              disabled={isSubmitting}
            >
              {showKey ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>

          {/* Validation Result */}
          {validationResult && (
            <div className={`p-3 rounded-lg border ${
              validationResult.valid 
                ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center gap-2">
                {validationResult.valid ? (
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                ) : (
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                )}
                <span className={`text-sm ${
                  validationResult.valid 
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-red-700 dark:text-red-400'
                }`}>
                  {validationResult.message}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleTest}
              loading={isTesting}
              disabled={!apiKey.trim() || isTesting || isSubmitting}
            >
              Test Key
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={!apiKey.trim() || isSubmitting}
            >
              {hasApiKey ? 'Update Key' : 'Save Key'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={isSubmitting || isTesting}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-text-muted">
          Get your API key from{' '}
          <a 
            href="https://openrouter.ai/keys" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            OpenRouter
          </a>
          . Your key is stored securely and only used for your requests.
        </p>
      </div>

      {/* Confirmation Dialog for Remove */}
      {showConfirmRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-medium text-text-primary mb-2">
              Remove API Key?
            </h3>
            <p className="text-sm text-text-muted mb-6">
              This will remove your OpenRouter API key and lock all premium models. 
              You'll only have access to gpt-4o-mini. You can re-add your key anytime.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleRemove}
                loading={isSubmitting}
                disabled={isSubmitting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove Key
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowConfirmRemove(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}