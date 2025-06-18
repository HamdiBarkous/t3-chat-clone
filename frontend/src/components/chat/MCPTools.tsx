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
  const [isExpanded, setIsExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

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
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

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
            
            return (
              <button
                key={toolId}
                onClick={() => handleToolToggle(toolId)}
                disabled={disabled}
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 text-sm font-medium',
                  'shadow-sm hover:shadow-md',
                  isEnabled 
                    ? 'text-primary bg-gradient-to-r from-primary/8 to-primary/12 hover:from-primary/12 hover:to-primary/18 border border-primary/20 hover:border-primary/30' 
                    : 'text-text-muted/70 hover:text-text-primary bg-gradient-to-r from-white/3 to-white/8 hover:from-white/8 hover:to-white/15 backdrop-blur-md border border-white/5 hover:border-white/20',
                  'transform hover:scale-[1.02] active:scale-[0.98]',
                  disabled && 'opacity-50 cursor-not-allowed hover:scale-100'
                )}
                title={`${isEnabled ? 'Disable' : 'Enable'} ${toolInfo.name}`}
              >
                {/* Icon */}
                <div className="w-4 h-4 flex items-center justify-center">
                  {toolInfo.icon}
                </div>
                
                {/* Label */}
                <span>{toolInfo.name}</span>
                
                {/* Active indicator */}
                {isEnabled && (
                  <div className="w-1 h-1 bg-primary rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
} 