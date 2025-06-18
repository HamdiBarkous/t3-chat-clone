'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import type { ProfileResponse, ProfileUpdate } from '@/types/api';

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