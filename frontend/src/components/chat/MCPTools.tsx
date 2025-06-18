/**
 * MCP Tools Component
 * Provides access to all available MCP tools: Web Search, Supabase, and Sequential Thinking
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';

interface MCPToolsProps {
  enabledTools: string[];
  searchProvider: 'tavily' | 'firecrawl';
  onToggle: (toolId: string, enabled: boolean, provider?: 'tavily' | 'firecrawl') => void;
  disabled?: boolean;
}

export function MCPTools({ enabledTools, searchProvider, onToggle, disabled = false }: MCPToolsProps) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isConfigOpen && e.key === 'Escape') {
        setIsConfigOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isConfigOpen]);

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
          description: 'Database operations & management',
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
    const isEnabled = enabledTools.includes(toolId);
    
    // Handle non-web-search tools
    onToggle(toolId, !isEnabled);
  };

  const getActiveTools = () => {
    return enabledTools.map(toolId => getToolInfo(toolId));
  };

  const activeTools = getActiveTools();
  const hasActiveTools = activeTools.length > 0;

  const renderConfigDropdown = () => {
    if (!isConfigOpen || !mounted) return null;

    // Only include non-web-search tools
    const allTools = ['supabase', 'sequential_thinking'];
    const toolsByCategory = {
      'Database': allTools.filter(id => ['supabase'].includes(id)),
      'Reasoning': allTools.filter(id => ['sequential_thinking'].includes(id))
    };

    return createPortal(
      <div className="fixed inset-0" style={{ zIndex: 999999 }}>
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-background/20 backdrop-blur-sm" 
          onClick={() => setIsConfigOpen(false)}
        />
        
        {/* Config Panel */}
        <div 
          className="absolute top-20 right-6 w-80 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl overflow-hidden"
          role="menu"
          aria-label="MCP tools selection"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-border/30 bg-gradient-to-r from-primary/5 to-accent/5">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              Additional Tools
            </h3>
            <p className="text-xs text-text-muted mt-1">Enable database and reasoning tools</p>
          </div>
          
          {/* Tool Categories */}
          <div className="p-3 space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
            {Object.entries(toolsByCategory).map(([category, tools]) => (
              <div key={category}>
                <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2 px-1">
                  {category}
                </h4>
                <div className="space-y-2">
                  {tools.map((toolId) => {
                    const toolInfo = getToolInfo(toolId);
                    const isEnabled = enabledTools.includes(toolId);
                    
                    return (
                      <button
                        key={toolId}
                        onClick={() => handleToolToggle(toolId)}
                        className={clsx(
                          'w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 text-left group relative overflow-hidden',
                          isEnabled 
                            ? 'bg-primary/15 border-2 border-primary/30 shadow-lg shadow-primary/10' 
                            : 'hover:bg-muted/50 border-2 border-transparent hover:border-border/30',
                          'transform hover:scale-[1.02] active:scale-[0.98]'
                        )}
                        role="menuitem"
                        aria-selected={isEnabled}
                      >
                        {/* Background gradient for enabled tools */}
                        {isEnabled && (
                          <div 
                            className="absolute inset-0 bg-gradient-to-r opacity-5"
                            style={{
                              background: `linear-gradient(135deg, var(--primary), var(--accent))`
                            }}
                          />
                        )}
                        
                        {/* Tool Icon */}
                        <div className="relative z-10">
                          <div className={clsx(
                            'w-10 h-10 rounded-lg flex items-center justify-center text-lg',
                            'bg-gradient-to-r shadow-md',
                            toolInfo.color
                          )}>
                            {toolInfo.icon}
                          </div>
                        </div>
                        
                        {/* Tool Info */}
                        <div className="flex-1 min-w-0 relative z-10">
                          <div className={clsx(
                            'font-semibold text-sm transition-colors flex items-center gap-2',
                            isEnabled ? 'text-primary' : 'text-text-primary group-hover:text-text-primary'
                          )}>
                            {toolInfo.name}
                          </div>
                          <div className="text-xs text-text-muted group-hover:text-text-secondary transition-colors mt-0.5">
                            {toolInfo.description}
                          </div>
                        </div>
                        
                        {/* Selection Indicator */}
                        <div className="relative z-10 flex items-center">
                          {isEnabled ? (
                            <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          ) : (
                            <div className="w-5 h-5 border-2 border-border/30 rounded-full group-hover:border-primary/50 transition-colors" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          
          {/* Footer */}
          <div className="px-4 py-3 border-t border-border/30 bg-muted/20">
            <p className="text-xs text-text-muted text-center">
              Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">ESC</kbd> to close
            </p>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="relative flex items-center">
      {/* Main Tools Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsConfigOpen(!isConfigOpen)}
        disabled={disabled}
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium',
          hasActiveTools 
            ? 'bg-primary/15 text-primary border border-primary/30 shadow-sm' 
            : 'bg-secondary/50 text-text-muted hover:bg-secondary hover:text-text-primary border border-border/30',
          'transform hover:scale-105 active:scale-95',
          disabled && 'opacity-50 cursor-not-allowed hover:scale-100'
        )}
        title={hasActiveTools ? `${activeTools.length} tool${activeTools.length > 1 ? 's' : ''} enabled` : 'Enable MCP tools'}
      >
        {/* Icon */}
        <div className="flex items-center">
          {hasActiveTools ? (
            <div className="flex items-center -space-x-1">
              {activeTools.slice(0, 3).map((tool, index) => (
                <div key={index} className="w-5 h-5 rounded-full border-2 border-background bg-card flex items-center justify-center text-xs">
                  {tool.icon}
                </div>
              ))}
              {activeTools.length > 3 && (
                <div className="w-5 h-5 rounded-full border-2 border-background bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  +{activeTools.length - 3}
                </div>
              )}
            </div>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
            </svg>
          )}
        </div>

        {/* Label */}
        <span>
          {hasActiveTools ? `${activeTools.length} Tool${activeTools.length > 1 ? 's' : ''}` : 'Tools'}
        </span>

        {/* Dropdown Arrow */}
        <svg 
          className={clsx(
            'w-3 h-3 transition-transform duration-200',
            isConfigOpen && 'rotate-180'
          )} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Config Dropdown */}
      {renderConfigDropdown()}
    </div>
  );
} 