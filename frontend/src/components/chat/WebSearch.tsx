/**
 * Web Search Component
 * Provides web search functionality with configurable providers (Tavily/Firecrawl)
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';

interface WebSearchProps {
  enabled: boolean;
  provider: 'tavily' | 'firecrawl';
  onToggle: (enabled: boolean, provider: 'tavily' | 'firecrawl') => void;
  disabled?: boolean;
}

export function WebSearch({ enabled, provider, onToggle, disabled = false }: WebSearchProps) {
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

  const handleMainToggle = () => {
    onToggle(!enabled, provider);
  };

  const handleProviderChange = (newProvider: 'tavily' | 'firecrawl') => {
    onToggle(enabled, newProvider);
    setIsConfigOpen(false);
  };

  const getProviderInfo = (providerName: 'tavily' | 'firecrawl') => {
    switch (providerName) {
      case 'tavily':
        return {
          name: 'Tavily',
          description: 'AI-powered web search',
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
          icon: (
            <div className="w-6 h-6 flex items-center justify-center text-orange-500 text-lg font-bold">
              🔥
            </div>
          ),
          color: 'from-orange-500 to-red-500'
        };
    }
  };

  const currentProvider = getProviderInfo(provider);

  const renderConfigDropdown = () => {
    if (!isConfigOpen || !mounted) return null;

    return createPortal(
      <div className="fixed inset-0" style={{ zIndex: 999999 }}>
        {/* Backdrop */}
        <div 
          className="absolute inset-0" 
          onClick={() => setIsConfigOpen(false)}
        />
        
        {/* Simple Provider Menu */}
        <div 
          className="absolute top-16 right-6 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl overflow-hidden ring-1 ring-white/10"
          role="menu"
          aria-label="Search provider selection"
        >
          {(['tavily', 'firecrawl'] as const).map((providerOption) => {
            const providerInfo = getProviderInfo(providerOption);
            const isSelected = provider === providerOption;
            
            return (
              <button
                key={providerOption}
                type="button"
                onClick={() => handleProviderChange(providerOption)}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200',
                  isSelected 
                    ? 'bg-gradient-to-r from-primary/15 to-primary/10 text-primary hover:from-primary/20 hover:to-primary/15' 
                    : 'hover:bg-gradient-to-r hover:from-white/5 hover:to-white/10 text-text-primary',
                  'min-w-[200px] backdrop-blur-sm'
                )}
                role="menuitem"
                aria-selected={isSelected}
              >
                {/* Provider Icon */}
                <div className="w-6 h-6 flex items-center justify-center">
                  {providerInfo.icon}
                </div>
                
                {/* Provider Info */}
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    {providerInfo.name}
                  </div>
                  <div className="text-xs text-text-muted">
                    {providerInfo.description}
                  </div>
                </div>
                
                {/* Selection Indicator */}
                {isSelected && (
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="relative flex items-center">
      {/* Main Search Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleMainToggle}
        disabled={disabled}
        className={clsx(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 text-sm font-medium',
          'shadow-sm hover:shadow-md',
          enabled 
            ? 'text-primary bg-gradient-to-r from-primary/8 to-primary/12 hover:from-primary/12 hover:to-primary/18 border border-primary/20 hover:border-primary/30' 
            : 'text-text-muted/70 hover:text-text-primary bg-gradient-to-r from-white/3 to-white/8 hover:from-white/8 hover:to-white/15 backdrop-blur-md border border-white/5 hover:border-white/20',
          'transform hover:scale-[1.02] active:scale-[0.98]',
          disabled && 'opacity-50 cursor-not-allowed hover:scale-100'
        )}
        title={enabled ? `Web search enabled (${currentProvider.name})` : 'Enable web search'}
      >
        {/* Icon */}
        <div className="w-4 h-4 flex items-center justify-center">
          {enabled ? currentProvider.icon : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          )}
        </div>

        {/* Label */}
        <span>Search</span>

        {/* Provider indicator when enabled */}
        {enabled && (
          <div className="w-1 h-1 bg-primary rounded-full"></div>
        )}
      </button>

      {/* Provider Config - Simple inline toggle */}
      {enabled && (
        <button
          type="button"
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          className="ml-1 p-1.5 text-text-muted/60 hover:text-text-primary transition-all duration-200 rounded-md hover:bg-white/10 backdrop-blur-sm"
          title="Switch search provider"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        </button>
      )}

      {/* Config Dropdown - Simplified */}
      {renderConfigDropdown()}
    </div>
  );
} 