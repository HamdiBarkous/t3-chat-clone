/**
 * Theme Switcher Component
 * Allows users to switch between different color themes
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(prev => (prev + 1) % themes.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prev => prev <= 0 ? themes.length - 1 : prev - 1);
      } else if (e.key === 'Enter' && focusedIndex >= 0) {
        e.preventDefault();
        setTheme(themes[focusedIndex].name);
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedIndex, themes, setTheme]);

  // Reset focused index when opening
  useEffect(() => {
    if (isOpen) {
      const currentIndex = themes.findIndex(t => t.name === currentTheme);
      setFocusedIndex(currentIndex);
    } else {
      setFocusedIndex(-1);
    }
  }, [isOpen, currentTheme, themes]);

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
      <div className="fixed inset-0" style={{ zIndex: 999999 }}>
        {/* Backdrop with blur */}
        <div 
          className="absolute inset-0 bg-background/40 backdrop-blur-md transition-opacity duration-200" 
          onClick={() => setIsOpen(false)}
        />
        
        {/* Dropdown Panel */}
        <div 
          className="absolute top-20 right-6 w-80 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200"
          role="menu"
          aria-label="Theme selection"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border/30 bg-gradient-to-r from-primary/5 to-accent/5">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              Choose Your Theme
            </h3>
            <p className="text-xs text-text-muted mt-1">Select a visual style that matches your vibe</p>
          </div>
          
          {/* Theme Options */}
          <div className="p-3 space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
            {themes.map((theme, index) => {
              const colors = getThemePreviewColors(theme.name);
              const isSelected = currentTheme === theme.name;
              const isFocused = focusedIndex === index;
              
              return (
                <button
                  key={theme.name}
                  onClick={() => {
                    setTheme(theme.name);
                    setIsOpen(false);
                    buttonRef.current?.focus();
                  }}
                  onMouseEnter={() => setFocusedIndex(index)}
                  className={clsx(
                    'w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 text-left group relative overflow-hidden',
                    isSelected 
                      ? 'bg-primary/15 border-2 border-primary/30 shadow-lg shadow-primary/10' 
                      : 'hover:bg-muted/50 border-2 border-transparent hover:border-border/30',
                    isFocused && 'ring-2 ring-primary/50 ring-offset-2 ring-offset-card',
                    'transform hover:scale-[1.02] active:scale-[0.98]'
                  )}
                  role="menuitem"
                  aria-selected={isSelected}
                >
                  {/* Background gradient for selected theme */}
                  {isSelected && (
                    <div 
                      className="absolute inset-0 bg-gradient-to-r opacity-5"
                      style={{
                        background: `linear-gradient(135deg, ${colors.primary}20, ${colors.accent}20)`
                      }}
                    />
                  )}
                  
                  {/* Theme Preview Orbs */}
                  <div className="flex items-center gap-1.5 relative z-10">
                    <div 
                      className="w-5 h-5 rounded-full border-2 border-white/20 shadow-lg transition-transform group-hover:scale-110"
                      style={{ 
                        backgroundColor: colors.primary,
                        boxShadow: `0 0 20px ${colors.primary}40`
                      }}
                    />
                    <div 
                      className="w-4 h-4 rounded-full border-2 border-white/20 shadow-md transition-transform group-hover:scale-110 delay-75"
                      style={{ 
                        backgroundColor: colors.secondary,
                        boxShadow: `0 0 15px ${colors.secondary}30`
                      }}
                    />
                    <div 
                      className="w-3 h-3 rounded-full border border-white/20 shadow-sm transition-transform group-hover:scale-110 delay-150"
                      style={{ 
                        backgroundColor: colors.accent,
                        boxShadow: `0 0 10px ${colors.accent}40`
                      }}
                    />
                  </div>
                  
                  {/* Theme Info */}
                  <div className="flex-1 min-w-0 relative z-10">
                    <div className={clsx(
                      'font-semibold text-base transition-colors',
                      isSelected ? 'text-primary' : 'text-text-primary group-hover:text-text-primary'
                    )}>
                      {theme.displayName}
                    </div>
                    <div className="text-sm text-text-muted group-hover:text-text-secondary transition-colors mt-0.5">
                      {theme.name === 'violet-storm' && 'Deep violet with cosmic energy'}
                      {theme.name === 'arctic-nexus' && 'Cool ice-blue minimalism'}
                      {theme.name === 'ember-glow' && 'Warm orange fire tones'}
                      {theme.name === 'neon-cyber' && 'Electric cyberpunk vibes'}
                      {theme.name === 'rose-gold' && 'Elegant pink and gold luxury'}
                    </div>
                  </div>
                  
                  {/* Selection Indicator */}
                  <div className="relative z-10 flex items-center">
                    {isSelected ? (
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center animate-in zoom-in-50 duration-200">
                        <svg className="w-3.5 h-3.5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-6 h-6 border-2 border-border/30 rounded-full group-hover:border-primary/50 transition-colors" />
                    )}
                  </div>
                  
                  {/* Hover glow effect */}
                  <div 
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at center, ${colors.primary}10, transparent 70%)`
                    }}
                  />
                </button>
              );
            })}
          </div>
          
          {/* Footer */}
          <div className="px-6 py-3 border-t border-border/30 bg-muted/20">
            <p className="text-xs text-text-muted text-center">
              Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">ESC</kbd> to close • Use arrow keys to navigate
            </p>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className={clsx('relative', className)}>
      {/* Theme Toggle Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200',
          'text-text-muted hover:text-text-primary',
          'bg-card/50 hover:bg-card/80 backdrop-blur-sm',
          'border border-border/30 hover:border-border/60',
          'shadow-sm hover:shadow-md',
          'transform hover:scale-105 active:scale-95',
          isOpen && 'bg-primary/10 border-primary/30 text-primary shadow-lg shadow-primary/10'
        )}
        title="Switch theme"
        aria-label="Theme switcher"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        {/* Theme Color Preview */}
        <div className="flex items-center gap-1">
          {(() => {
            const colors = getThemePreviewColors(currentTheme);
            return (
              <>
                <div 
                  className="w-3.5 h-3.5 rounded-full border border-border/50 shadow-sm transition-transform hover:scale-110"
                  style={{ 
                    backgroundColor: colors.primary,
                    boxShadow: `0 0 8px ${colors.primary}40`
                  }}
                />
                <div 
                  className="w-3 h-3 rounded-full border border-border/50 shadow-sm transition-transform hover:scale-110 delay-75"
                  style={{ 
                    backgroundColor: colors.secondary,
                    boxShadow: `0 0 6px ${colors.secondary}30`
                  }}
                />
                <div 
                  className="w-2.5 h-2.5 rounded-full border border-border/50 shadow-sm transition-transform hover:scale-110 delay-150"
                  style={{ 
                    backgroundColor: colors.accent,
                    boxShadow: `0 0 4px ${colors.accent}40`
                  }}
                />
              </>
            );
          })()}
        </div>
        
        <span className="hidden sm:inline font-medium">
          {themes.find(t => t.name === currentTheme)?.displayName}
        </span>
        
        <svg 
          className={clsx(
            'w-4 h-4 transition-transform duration-200',
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