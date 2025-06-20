'use client';

import React, { useState } from 'react';
import { X, Eye, EyeOff, Database, Shield, Key } from 'lucide-react';
import clsx from 'clsx';
import { ApiKeyManager } from '@/components/ui/ApiKeyManager';

interface CustomizationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  systemPrompt: string;
  temperature: number;
  topP: number;
  onSystemPromptChange: (prompt: string) => void;
  onTemperatureChange: (temperature: number) => void;
  onTopPChange: (topP: number) => void;
  onApply: () => void;
  onReset: () => void;
  // New props for change tracking
  originalSystemPrompt: string;
  originalTemperature: number;
  originalTopP: number;
  isApplying?: boolean;
  // Supabase MCP props
  supabaseAccessToken: string;
  supabaseProjectRef: string;
  supabaseReadOnly: boolean;
  onSupabaseAccessTokenChange: (token: string) => void;
  onSupabaseProjectRefChange: (ref: string) => void;
  onSupabaseReadOnlyChange: (readOnly: boolean) => void;
  originalSupabaseAccessToken: string;
  originalSupabaseProjectRef: string;
  originalSupabaseReadOnly: boolean;
}

export const CustomizationSidebar: React.FC<CustomizationSidebarProps> = ({
  isOpen,
  onClose,
  systemPrompt,
  temperature,
  topP,
  onSystemPromptChange,
  onTemperatureChange,
  onTopPChange,
  onApply,
  onReset,
  originalSystemPrompt,
  originalTemperature,
  originalTopP,
  isApplying = false,
  supabaseAccessToken,
  supabaseProjectRef,
  supabaseReadOnly,
  onSupabaseAccessTokenChange,
  onSupabaseProjectRefChange,
  onSupabaseReadOnlyChange,
  originalSupabaseAccessToken,
  originalSupabaseProjectRef,
  originalSupabaseReadOnly,
}) => {
  const [showToken, setShowToken] = useState(false);

  // Check if there are any changes
  const hasChanges = 
    systemPrompt !== originalSystemPrompt ||
    temperature !== originalTemperature ||
    topP !== originalTopP ||
    supabaseAccessToken !== originalSupabaseAccessToken ||
    supabaseProjectRef !== originalSupabaseProjectRef ||
    supabaseReadOnly !== originalSupabaseReadOnly;

  const isApplyDisabled = !hasChanges || isApplying;
  
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-all duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={clsx(
          'fixed top-0 right-0 h-full w-96 bg-secondary/95 backdrop-blur-xl border-l border-border/40 shadow-2xl z-50',
          'transform transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/15 rounded-lg">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Customization</h2>
                <p className="text-sm text-text-muted">Fine-tune your AI experience</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted/60 rounded-lg transition-colors duration-200 text-text-muted hover:text-text-primary"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
            {/* System Prompt */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <label className="text-sm font-medium text-text-primary">System Prompt</label>
              </div>
              <textarea
                value={systemPrompt}
                onChange={(e) => onSystemPromptChange(e.target.value)}
                placeholder="Enter custom system instructions that will guide the AI's behavior and responses..."
                className="w-full h-32 px-4 py-3 bg-input/50 border border-border/50 rounded-xl text-text-primary placeholder-text-muted/60 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
              />
              <p className="text-xs text-text-muted/70">
                Define how the AI should behave, its personality, expertise, or response style.
              </p>
            </div>

            {/* Temperature */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <label className="text-sm font-medium text-text-primary">Temperature</label>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-muted">Creativity Level</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-mono text-primary bg-primary/10 px-3 py-1 rounded-lg">
                      {temperature.toFixed(1)}
                    </span>
                  </div>
                </div>
                
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-muted/50 rounded-lg appearance-none cursor-pointer slider"
                />
                
                <div className="flex justify-between text-xs text-text-muted/60">
                  <div className="flex flex-col items-center">
                    <span className="font-medium">0.0</span>
                    <span>Deterministic</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-medium">1.0</span>
                    <span>Balanced</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-medium">2.0</span>
                    <span>Very Creative</span>
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-text-muted/70">
                Controls randomness in responses. Lower values for focused answers, higher for creative outputs.
              </p>
            </div>

            {/* Top P */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <label className="text-sm font-medium text-text-primary">Top P (Nucleus Sampling)</label>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-muted">Response Diversity</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-mono text-primary bg-primary/10 px-3 py-1 rounded-lg">
                      {topP.toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={topP}
                  onChange={(e) => onTopPChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-muted/50 rounded-lg appearance-none cursor-pointer slider"
                />
                
                <div className="flex justify-between text-xs text-text-muted/60">
                  <div className="flex flex-col items-center">
                    <span className="font-medium">0.1</span>
                    <span>Conservative</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-medium">0.5</span>
                    <span>Moderate</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-medium">1.0</span>
                    <span>Diverse</span>
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-text-muted/70">
                Controls the diversity of word choices. Lower values for more predictable responses.
              </p>
            </div>

            {/* API Key Management */}
            <div className="space-y-4 border-t border-border/30 pt-6">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                <label className="text-sm font-medium text-text-primary">Model Access</label>
              </div>
              
              <ApiKeyManager />
            </div>

            {/* Supabase MCP Integration */}
            <div className="space-y-4 border-t border-border/30 pt-6">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                <label className="text-sm font-medium text-text-primary">Supabase MCP Integration</label>
              </div>
              
              <div className="bg-muted/20 border border-border/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Database className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-text-muted">
                      Configure your Supabase credentials to enable database operations through the Model Context Protocol.
                    </p>
                  </div>
                </div>
              </div>

              <form autoComplete="off" data-lpignore="true">
                {/* Honeypot fields to prevent password manager detection */}
                <input type="text" name="username" autoComplete="username" style={{ display: 'none' }} tabIndex={-1} />
                <input type="password" name="password" autoComplete="current-password" style={{ display: 'none' }} tabIndex={-1} />
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-text-primary mb-2">
                      Access Token
                    </label>
                    <div className="relative">
                      <input
                        type={showToken ? "text" : "password"}
                        value={supabaseAccessToken}
                        onChange={(e) => onSupabaseAccessTokenChange(e.target.value)}
                        placeholder="sbp_xxxxxxxxxxxxxxxxxx"
                        autoComplete="off"
                        autoSave="off"
                        data-form-type="other"
                        data-lpignore="true"
                        name="supabase-token"
                        className="w-full px-3 py-2 pr-10 bg-input/50 border border-border/50 rounded-lg text-text-primary placeholder-text-muted/60 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                      >
                        {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <p className="text-xs text-text-muted/70 mt-1">
                      Get from{' '}
                      <a 
                        href="https://supabase.com/dashboard/account/tokens" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Supabase Dashboard
                      </a>
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text-primary mb-2">
                      Project Reference (Optional)
                    </label>
                    <input
                      type="text"
                      value={supabaseProjectRef}
                      onChange={(e) => onSupabaseProjectRefChange(e.target.value)}
                      placeholder="your-project-ref"
                      autoComplete="off"
                      name="supabase-project-ref"
                      className="w-full px-3 py-2 bg-input/50 border border-border/50 rounded-lg text-text-primary placeholder-text-muted/60 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
                    />
                    <p className="text-xs text-text-muted/70 mt-1">
                      Leave empty to access all projects
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="supabase-read-only"
                      checked={supabaseReadOnly}
                      onChange={(e) => onSupabaseReadOnlyChange(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary/50"
                    />
                    <div className="flex items-center gap-2">
                      <Shield className="w-3 h-3 text-text-muted" />
                      <label htmlFor="supabase-read-only" className="text-xs font-medium text-text-primary cursor-pointer">
                        Read-only mode
                      </label>
                    </div>
                  </div>
                  <p className="text-xs text-text-muted/70 ml-5">
                    Restricts operations to read-only queries for safety
                  </p>
                </div>
              </form>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border/30 space-y-3">
            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onReset}
                className="flex-1 px-4 py-3 bg-muted/30 hover:bg-muted/50 border border-border/30 rounded-xl text-sm text-text-muted hover:text-text-primary transition-all duration-200 font-medium"
              >
                Reset to Defaults
              </button>
              <button
                onClick={onApply}
                disabled={isApplyDisabled}
                className={clsx(
                  "flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  isApplyDisabled
                    ? "bg-muted/20 border border-border/20 text-text-muted/50 cursor-not-allowed"
                    : "bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary hover:text-primary"
                )}
              >
                {isApplying ? "Applying..." : hasChanges ? "Apply Changes" : "No Changes"}
              </button>
            </div>
            
            {/* Info */}
            <p className="text-xs text-text-muted/60 text-center">
              Changes apply to new messages in this conversation
            </p>
          </div>
        </div>
      </div>
    </>
  );
}; 