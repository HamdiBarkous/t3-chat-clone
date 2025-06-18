/**
 * MCP Tools Component
 * Provides access to all available MCP tools: Web Search, Supabase, and Sequential Thinking
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { useSupabaseMCP } from '@/hooks/useProfile';

interface MCPToolsProps {
  enabledTools: string[];
  searchProvider: 'tavily' | 'firecrawl';
  onToggle: (toolId: string, enabled: boolean, provider?: 'tavily' | 'firecrawl') => void;
  onShowCustomization?: () => void;
  disabled?: boolean;
}

export function MCPTools({ enabledTools, searchProvider, onToggle, onShowCustomization, disabled = false }: MCPToolsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showSupabaseSetup, setShowSupabaseSetup] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Get user's Supabase MCP config
  const { config: supabaseMCPConfig, loading: configLoading } = useSupabaseMCP();

  // Check if user has Supabase credentials configured
  const hasSupabaseCredentials = !configLoading && supabaseMCPConfig.supabase_access_token && supabaseMCPConfig.supabase_access_token.length > 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isExpanded && e.key === 'Escape') {
        setIsExpanded(false);
        buttonRef.current?.focus();
      }
      if (showSupabaseSetup && e.key === 'Escape') {
        setShowSupabaseSetup(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, showSupabaseSetup]);

  const getToolInfo = (toolId: string) => {
    switch (toolId) {
      case 'tavily':
        return {
          name: 'Tavily',
          description: 'AI-powered web search',
          category: 'Web Search',
          icon: (
            <img 
              src="https://cdn.brandfetch.io/idWIQk277S/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" 
              alt="Tavily"
              className="w-6 h-6 object-contain"
            />
          ),
          color: 'from-blue-500 to-cyan-500'
        };
      case 'firecrawl':
        return {
          name: 'Firecrawl',
          description: 'Web scraping & extraction',
          category: 'Web Search',
          icon: (
            <div className="w-6 h-6 flex items-center justify-center text-orange-500 text-lg font-bold">
              🔥
            </div>
          ),
          color: 'from-orange-500 to-red-500'
        };
      case 'supabase':
        return {
          name: 'Supabase',
          description: hasSupabaseCredentials ? 'Database operations & management' : 'Setup required in customization',
          category: 'Database',
          icon: (
            <img 
              src="https://www.vectorlogo.zone/logos/supabase/supabase-icon.svg" 
              alt="Supabase"
              className="w-6 h-6 object-contain"
            />
          ),
          color: 'from-green-500 to-emerald-500'
        };
      case 'sequential_thinking':
        return {
          name: 'Sequential Thinking',
          description: 'Step-by-step reasoning & analysis',
          category: 'Reasoning',
          icon: (
            <div className="w-6 h-6 flex items-center justify-center text-purple-500 text-lg">
              🧠
            </div>
          ),
          color: 'from-purple-500 to-indigo-500'
        };
      default:
        return {
          name: 'Unknown Tool',
          description: 'Unknown tool',
          category: 'Other',
          icon: <div className="w-6 h-6 bg-gray-400 rounded" />,
          color: 'from-gray-400 to-gray-500'
        };
    }
  };

  const handleToolToggle = (toolId: string) => {
    // Special handling for Supabase if credentials not configured
    if (toolId === 'supabase' && !hasSupabaseCredentials) {
      setShowSupabaseSetup(true);
      return;
    }

    const isEnabled = enabledTools.includes(toolId);
    onToggle(toolId, !isEnabled);
  };

  const handleSupabaseSetup = () => {
    setShowSupabaseSetup(false);
    onShowCustomization?.();
  };

  const getActiveTools = () => {
    return enabledTools.filter(id => ['supabase', 'sequential_thinking'].includes(id)).map(toolId => getToolInfo(toolId));
  };

  const activeTools = getActiveTools();
  const hasActiveTools = activeTools.length > 0;

  return (
    <div className="relative flex items-center gap-2">
      {/* Main Tools Toggle Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={disabled}
        className={clsx(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 text-sm font-medium',
          'shadow-sm hover:shadow-md',
          hasActiveTools || isExpanded
            ? 'text-primary bg-gradient-to-r from-primary/8 to-primary/12 hover:from-primary/12 hover:to-primary/18 border border-primary/20 hover:border-primary/30' 
            : 'text-text-muted/70 hover:text-text-primary bg-gradient-to-r from-white/3 to-white/8 hover:from-white/8 hover:to-white/15 backdrop-blur-md border border-white/5 hover:border-white/20',
          'transform hover:scale-[1.02] active:scale-[0.98]',
          disabled && 'opacity-50 cursor-not-allowed hover:scale-100'
        )}
        title={hasActiveTools ? `${activeTools.length} additional tool${activeTools.length > 1 ? 's' : ''} enabled` : 'Additional tools'}
      >
        {/* Icon */}
        <div className="w-4 h-4 flex items-center justify-center">
          {hasActiveTools ? (
            <div className="relative">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
              </svg>
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></div>
            </div>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
            </svg>
          )}
        </div>
        
        {/* Label */}
        <span>Tools</span>
        
        {/* Count Badge */}
        {hasActiveTools && (
          <div className="w-5 h-5 bg-primary/20 text-primary text-xs rounded-full flex items-center justify-center font-medium">
            {activeTools.length}
          </div>
        )}

        {/* Expand Arrow */}
        <svg 
          className={clsx(
            'w-3 h-3 transition-transform duration-200',
            isExpanded ? 'rotate-180' : 'rotate-0'
          )} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Individual Tool Toggles - Slide out animation */}
      {isExpanded && (
        <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-200">
          {['supabase', 'sequential_thinking'].map((toolId) => {
            const toolInfo = getToolInfo(toolId);
            const isEnabled = enabledTools.includes(toolId);
            const needsSetup = toolId === 'supabase' && !hasSupabaseCredentials;
            
            return (
              <button
                key={toolId}
                type="button"
                onClick={() => handleToolToggle(toolId)}
                disabled={disabled}
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 text-sm font-medium relative overflow-hidden',
                  'shadow-sm hover:shadow-md',
                  needsSetup
                    ? 'text-text-muted bg-gradient-to-r from-muted/30 to-muted/40 hover:from-muted/40 hover:to-muted/50 border border-border/40 hover:border-border/60'
                    : isEnabled 
                      ? 'text-primary bg-gradient-to-r from-primary/8 to-primary/12 hover:from-primary/12 hover:to-primary/18 border border-primary/20 hover:border-primary/30' 
                      : 'text-text-muted/70 hover:text-text-primary bg-gradient-to-r from-white/3 to-white/8 hover:from-white/8 hover:to-white/15 backdrop-blur-md border border-white/5 hover:border-white/20',
                  'transform hover:scale-[1.02] active:scale-[0.96] active:duration-75',
                  'before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/20 before:to-primary/10 before:opacity-0 before:transition-opacity before:duration-200',
                  'active:before:opacity-100',
                  disabled && 'opacity-50 cursor-not-allowed hover:scale-100'
                )}
                title={needsSetup ? `Setup ${toolInfo.name} in customization sidebar` : `${isEnabled ? 'Disable' : 'Enable'} ${toolInfo.name}`}
              >
                {/* Ripple effect on click */}
                <div className="absolute inset-0 overflow-hidden rounded-lg">
                  <div className={clsx(
                    'absolute inset-0 bg-gradient-to-r from-primary/30 to-primary/20 rounded-full transition-all duration-500 ease-out',
                    'scale-0 opacity-0',
                    'active:scale-150 active:opacity-100 active:duration-300'
                  )} />
                </div>

                {/* Icon */}
                <div className={clsx(
                  'w-4 h-4 flex items-center justify-center relative z-10 transition-transform duration-200',
                  'group-active:scale-110'
                )}>
                  {toolInfo.icon}
                </div>
                
                {/* Label */}
                <span className="relative z-10 transition-all duration-200">
                  {toolInfo.name}
                </span>
                
                                 {/* Setup indicator */}
                 {needsSetup && (
                   <div className="relative z-10 flex items-center">
                     <svg className="w-3 h-3 text-text-muted/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.5 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                     </svg>
                   </div>
                 )}
                
                {/* Active indicator with pulse animation */}
                {isEnabled && !needsSetup && (
                  <div className="relative z-10">
                    <div className="w-1 h-1 bg-primary rounded-full animate-pulse"></div>
                  </div>
                )}

                {/* Success flash effect when toggling */}
                <div className={clsx(
                  'absolute inset-0 bg-gradient-to-r from-green-400/20 to-emerald-400/20 rounded-lg transition-opacity duration-200',
                  'opacity-0 pointer-events-none'
                )} />
              </button>
            );
          })}
        </div>
      )}

      {/* Supabase Setup Modal */}
      {showSupabaseSetup && mounted && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src="https://www.vectorlogo.zone/logos/supabase/supabase-icon.svg" 
                  alt="Supabase"
                  className="w-8 h-8 object-contain"
                />
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">Setup Supabase MCP</h3>
                  <p className="text-sm text-text-muted">Configure your credentials to enable database tools</p>
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Open Customization Sidebar</p>
                    <p className="text-xs text-text-muted">Click the settings icon in the top-right corner</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Add Supabase Credentials</p>
                    <p className="text-xs text-text-muted">Enter your access token and optional project reference</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Apply Changes</p>
                    <p className="text-xs text-text-muted">Save your settings to enable Supabase tools</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSupabaseSetup}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                  Open Customization
                </button>
                <button
                  onClick={() => setShowSupabaseSetup(false)}
                  className="px-4 py-2 bg-muted text-text-muted hover:bg-muted/80 rounded-lg transition-colors text-sm font-medium"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
} 