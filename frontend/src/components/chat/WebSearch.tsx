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
          className="absolute inset-0 bg-background/20 backdrop-blur-sm" 
          onClick={() => setIsConfigOpen(false)}
        />
        
        {/* Config Panel */}
        <div 
          className="absolute top-20 right-6 w-72 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl overflow-hidden"
          role="menu"
          aria-label="Search provider selection"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-border/30 bg-gradient-to-r from-primary/5 to-accent/5">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              Search Provider
            </h3>
            <p className="text-xs text-text-muted mt-1">Choose your web search engine</p>
          </div>
          
          {/* Provider Options */}
          <div className="p-3 space-y-2">
            {(['tavily', 'firecrawl'] as const).map((providerOption) => {
              const providerInfo = getProviderInfo(providerOption);
              const isSelected = provider === providerOption;
              
              return (
                <button
                  key={providerOption}
                  onClick={() => handleProviderChange(providerOption)}
                  className={clsx(
                    'w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 text-left group relative overflow-hidden',
                    isSelected 
                      ? 'bg-primary/15 border-2 border-primary/30 shadow-lg shadow-primary/10' 
                      : 'hover:bg-muted/50 border-2 border-transparent hover:border-border/30',
                    'transform hover:scale-[1.02] active:scale-[0.98]'
                  )}
                  role="menuitem"
                  aria-selected={isSelected}
                >
                  {/* Background gradient for selected provider */}
                  {isSelected && (
                    <div 
                      className="absolute inset-0 bg-gradient-to-r opacity-5"
                      style={{
                        background: `linear-gradient(135deg, var(--primary), var(--accent))`
                      }}
                    />
                  )}
                  
                  {/* Provider Icon */}
                  <div className="relative z-10">
                    <div className={clsx(
                      'w-10 h-10 rounded-lg flex items-center justify-center text-lg',
                      'bg-gradient-to-r shadow-md',
                      providerInfo.color
                    )}>
                      {providerInfo.icon}
                    </div>
                  </div>
                  
                  {/* Provider Info */}
                  <div className="flex-1 min-w-0 relative z-10">
                    <div className={clsx(
                      'font-semibold text-sm transition-colors',
                      isSelected ? 'text-primary' : 'text-text-primary group-hover:text-text-primary'
                    )}>
                      {providerInfo.name}
                    </div>
                    <div className="text-xs text-text-muted group-hover:text-text-secondary transition-colors mt-0.5">
                      {providerInfo.description}
                    </div>
                  </div>
                  
                  {/* Selection Indicator */}
                  <div className="relative z-10 flex items-center">
                    {isSelected ? (
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
      {/* Main Search Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleMainToggle}
        disabled={disabled}
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium',
          enabled 
            ? 'bg-primary/15 text-primary border border-primary/30 shadow-sm' 
            : 'bg-secondary/50 text-text-muted hover:bg-secondary hover:text-text-primary border border-border/30',
          'transform hover:scale-105 active:scale-95',
          disabled && 'opacity-50 cursor-not-allowed hover:scale-100'
        )}
        title={enabled ? `Search enabled (${currentProvider.name})` : 'Enable web search'}
      >
        <div className="flex items-center justify-center w-5 h-5">
          {enabled ? currentProvider.icon : '🌐'}
        </div>
        <span>Search</span>
        {enabled && (
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
        )}
      </button>

      {/* Config Button */}
      <button
        type="button"
        onClick={() => setIsConfigOpen(!isConfigOpen)}
        disabled={disabled}
        className={clsx(
          'ml-1 p-2 rounded-lg transition-all duration-200',
          'text-text-muted hover:text-text-primary hover:bg-muted',
          'transform hover:scale-110 active:scale-95',
          isConfigOpen && 'bg-primary/10 text-primary',
          disabled && 'opacity-50 cursor-not-allowed hover:scale-100'
        )}
        title="Configure search provider"
        aria-label="Search provider settings"
        aria-expanded={isConfigOpen}
        aria-haspopup="menu"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Render config dropdown using portal */}
      {renderConfigDropdown()}
    </div>
  );
} 