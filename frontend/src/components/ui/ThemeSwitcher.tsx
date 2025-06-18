/**
 * Theme Switcher Component
 * Allows users to switch between different color themes
 */

'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { useTheme } from '@/contexts/ThemeContext';

interface ThemeSwitcherProps {
  className?: string;
}

export function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const { currentTheme, setTheme, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getThemePreviewColors = (themeName: string) => {
    const theme = themes.find(t => t.name === themeName);
    if (!theme) return { primary: '#7c3aed', secondary: '#2a2438', accent: '#06b6d4' };
    
    return {
      primary: theme.colors['--primary'],
      secondary: theme.colors['--secondary'],
      accent: theme.colors['--accent'],
    };
  };

  const renderDropdown = () => {
    if (!isOpen || !mounted) return null;

    return createPortal(
      <>
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-background/20 backdrop-blur-sm" 
          style={{ zIndex: 999999 }}
          onClick={() => setIsOpen(false)}
        />
        
        {/* Dropdown Panel */}
        <div 
          className="fixed top-16 right-4 w-64 bg-card border border-border rounded-lg shadow-2xl p-2"
          style={{ zIndex: 999999 }}
        >
          <div className="text-xs font-medium text-text-muted mb-2 px-2">
            Choose Theme
          </div>
          
          <div className="space-y-1">
            {themes.map((theme) => {
              const colors = getThemePreviewColors(theme.name);
              const isSelected = currentTheme === theme.name;
              
              return (
                <button
                  key={theme.name}
                  onClick={() => {
                    setTheme(theme.name);
                    setIsOpen(false);
                  }}
                  className={clsx(
                    'w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 text-left',
                    isSelected 
                      ? 'bg-primary/10 border border-primary/20' 
                      : 'hover:bg-muted border border-transparent'
                  )}
                >
                  {/* Theme Preview */}
                  <div className="flex items-center gap-1">
                    <div 
                      className="w-4 h-4 rounded-full border border-border/50 shadow-sm"
                      style={{ backgroundColor: colors.primary }}
                    />
                    <div 
                      className="w-4 h-4 rounded-full border border-border/50 shadow-sm"
                      style={{ backgroundColor: colors.secondary }}
                    />
                    <div 
                      className="w-4 h-4 rounded-full border border-border/50 shadow-sm"
                      style={{ backgroundColor: colors.accent }}
                    />
                  </div>
                  
                  {/* Theme Info */}
                  <div className="flex-1 min-w-0">
                    <div className={clsx(
                      'font-medium text-sm',
                      isSelected ? 'text-primary' : 'text-text-primary'
                    )}>
                      {theme.displayName}
                    </div>
                    <div className="text-xs text-text-muted">
                      {theme.name === 'violet-storm' && 'Deep violet with cosmic energy'}
                      {theme.name === 'arctic-nexus' && 'Cool ice-blue minimalism'}
                      {theme.name === 'ember-glow' && 'Warm orange fire tones'}
                      {theme.name === 'neon-cyber' && 'Electric cyberpunk vibes'}
                      {theme.name === 'rose-gold' && 'Elegant pink and gold luxury'}
                    </div>
                  </div>
                  
                  {/* Selected Indicator */}
                  {isSelected && (
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </>,
      document.body
    );
  };

  return (
    <div className={clsx('relative', className)}>
      {/* Theme Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-muted"
        title="Switch theme"
      >
        {/* Theme Color Preview */}
        <div className="flex items-center gap-1">
          {(() => {
            const colors = getThemePreviewColors(currentTheme);
            return (
              <>
                <div 
                  className="w-3 h-3 rounded-full border border-border/50"
                  style={{ backgroundColor: colors.primary }}
                />
                <div 
                  className="w-3 h-3 rounded-full border border-border/50"
                  style={{ backgroundColor: colors.secondary }}
                />
                <div 
                  className="w-3 h-3 rounded-full border border-border/50"
                  style={{ backgroundColor: colors.accent }}
                />
              </>
            );
          })()}
        </div>
        
        <span className="hidden sm:inline">
          {themes.find(t => t.name === currentTheme)?.displayName}
        </span>
        
        <svg 
          className={clsx(
            'w-4 h-4 transition-transform',
            isOpen && 'rotate-180'
          )} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Render dropdown using portal */}
      {renderDropdown()}
    </div>
  );
} 