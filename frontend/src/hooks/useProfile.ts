'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import type { ProfileResponse, ProfileUpdate, ApiKeyUpdate } from '@/types/api';

interface SupabaseMCPConfig {
  supabase_access_token: string;
  supabase_project_ref: string;
  supabase_read_only: boolean;
}

interface UseSupabaseMCPReturn {
  config: SupabaseMCPConfig;
  loading: boolean;
  error: string | null;
  updateConfig: (data: Partial<SupabaseMCPConfig>) => Promise<void>;
  refetchConfig: () => Promise<void>;
}

export function useSupabaseMCP(): UseSupabaseMCPReturn {
  const [config, setConfig] = useState<SupabaseMCPConfig>({
    supabase_access_token: '',
    supabase_project_ref: '',
    supabase_read_only: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const profileData = await apiClient.get<ProfileResponse>('/user/profile');
      setConfig({
        supabase_access_token: profileData.supabase_access_token || '',
        supabase_project_ref: profileData.supabase_project_ref || '',
        supabase_read_only: profileData.supabase_read_only ?? true
      });
    } catch (err: unknown) {
      console.error('Failed to fetch Supabase MCP config:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch configuration');
      // Keep default values on error
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (data: Partial<SupabaseMCPConfig>): Promise<void> => {
    try {
      setError(null);
      const updateData: ProfileUpdate = {
        supabase_access_token: data.supabase_access_token,
        supabase_project_ref: data.supabase_project_ref,
        supabase_read_only: data.supabase_read_only
      };
      
      const updatedProfile = await apiClient.patch<ProfileResponse>('/user/profile', updateData);
      setConfig({
        supabase_access_token: updatedProfile.supabase_access_token || '',
        supabase_project_ref: updatedProfile.supabase_project_ref || '',
        supabase_read_only: updatedProfile.supabase_read_only ?? true
      });
    } catch (err: unknown) {
      console.error('Failed to update Supabase MCP config:', err);
      setError(err instanceof Error ? err.message : 'Failed to update configuration');
      throw err; // Re-throw so the component can handle it
    }
  };

  const refetchConfig = async (): Promise<void> => {
    await fetchConfig();
  };

  // Fetch config on mount
  useEffect(() => {
    fetchConfig();
  }, []);

  return {
    config,
    loading,
    error,
    updateConfig,
    refetchConfig
  };
}

interface UseApiKeyReturn {
  hasApiKey: boolean;
  availableModels: string[];
  loading: boolean;
  error: string | null;
  updateApiKey: (apiKey: string | null) => Promise<void>;
  testApiKey: (apiKey: string) => Promise<{ valid: boolean; message: string }>;
  refetch: () => Promise<void>;
}

export function useApiKey(): UseApiKeyReturn {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>(['openai/gpt-4o-mini']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const profileData = await apiClient.get<ProfileResponse>('/user/profile');
      setHasApiKey(!!profileData.openrouter_api_key);
      setAvailableModels(profileData.available_models || ['openai/gpt-4o-mini']);
    } catch (err: unknown) {
      console.error('Failed to fetch profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  const updateApiKey = async (apiKey: string | null): Promise<void> => {
    try {
      setError(null);
      const updateData: ApiKeyUpdate = { api_key: apiKey || undefined };
      
      const response = await apiClient.put<ProfileResponse & { message: string }>('/user/api-key', updateData);
      setHasApiKey(!!response.openrouter_api_key);
      
      // Simplified model access: has key = all models, no key = only gpt-4o-mini
      if (response.openrouter_api_key) {
        // User has API key, they have access to all models (we'll get this from models endpoint)
        setAvailableModels(['openai/gpt-4o-mini']); // Will be updated by models endpoint
      } else {
        // User has no API key, only gpt-4o-mini
        setAvailableModels(['openai/gpt-4o-mini']);
      }
    } catch (err: any) {
      console.error('Failed to update API key:', err);
      
      // Extract more specific error messages from API response
      let errorMessage = 'Failed to update API key';
      if (err?.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const testApiKey = async (apiKey: string): Promise<{ valid: boolean; message: string }> => {
    try {
      const response = await apiClient.post<{ valid: boolean; message: string }>('/user/api-key/test', {
        api_key: apiKey
      });
      return response;
    } catch (err: any) {
      console.error('Failed to test API key:', err);
      
      // Extract error message from API response
      let errorMessage = 'Failed to test API key';
      if (err?.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      return {
        valid: false,
        message: errorMessage
      };
    }
  };

  const refetch = async (): Promise<void> => {
    await fetchProfile();
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return {
    hasApiKey,
    availableModels,
    loading,
    error,
    updateApiKey,
    testApiKey,
    refetch
  };
} 