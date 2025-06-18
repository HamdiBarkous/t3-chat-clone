/**
 * Theme Context Provider
 * Manages different color themes for the application
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeName = 'violet-storm' | 'arctic-nexus' | 'ember-glow' | 'forest-whisper' | 'cosmic-midnight';

interface ThemeDefinition {
  name: ThemeName;
  displayName: string;
  colors: {
    [key: string]: string;
  };
}

interface ThemeContextType {
  currentTheme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  themes: ThemeDefinition[];
}

const themes: ThemeDefinition[] = [
  {
    name: 'violet-storm',
    displayName: 'Violet Storm',
    colors: {
      '--background-start': '#0f0d1a',
      '--background-end': '#1a1625',
      '--foreground': '#f4f1ff',
      '--card': '#1f1b2e',
      '--card-foreground': '#f4f1ff',
      '--popover': '#1f1b2e',
      '--popover-foreground': '#f4f1ff',
      '--primary': '#7c3aed',
      '--primary-foreground': '#ffffff',
      '--secondary': '#2a2438',
      '--secondary-foreground': '#d4d4d8',
      '--muted': '#3f3852',
      '--muted-foreground': '#a1a1aa',
      '--accent': '#06b6d4',
      '--accent-foreground': '#ffffff',
      '--destructive': '#ef4444',
      '--destructive-foreground': '#ffffff',
      '--border': 'rgba(124, 58, 237, 0.15)',
      '--input': '#2a2438',
      '--ring': 'rgba(124, 58, 237, 0.5)',
      '--sidebar-bg': '#0f0d1a',
      '--sidebar-item-hover': '#1f1b2e',
      '--chat-bg': 'transparent',
      '--message-bg': '#2a2438',
      '--purple-accent': '#7c3aed',
      '--purple-light': '#8b5cf6',
      '--purple-dark': '#6d28d9',
      '--text-primary': '#f4f1ff',
      '--text-secondary': '#d4d4d8',
      '--text-muted': '#a1a1aa',
      '--code-bg': '#1a1625',
      '--green-accent': '#22c55e',
    }
  },
  {
    name: 'arctic-nexus',
    displayName: 'Arctic Nexus',
    colors: {
      '--background-start': '#0a0f1a',
      '--background-end': '#1a1f2e',
      '--foreground': '#f0f9ff',
      '--card': '#111827',
      '--card-foreground': '#f0f9ff',
      '--popover': '#111827',
      '--popover-foreground': '#f0f9ff',
      '--primary': '#0ea5e9',
      '--primary-foreground': '#0a0f1a',
      '--secondary': '#1e293b',
      '--secondary-foreground': '#cbd5e1',
      '--muted': '#334155',
      '--muted-foreground': '#94a3b8',
      '--accent': '#3b82f6',
      '--accent-foreground': '#ffffff',
      '--destructive': '#ef4444',
      '--destructive-foreground': '#ffffff',
      '--border': 'rgba(14, 165, 233, 0.2)',
      '--input': '#1e293b',
      '--ring': 'rgba(14, 165, 233, 0.6)',
      '--sidebar-bg': '#0f172a',
      '--sidebar-item-hover': '#1e293b',
      '--chat-bg': 'transparent',
      '--message-bg': '#1e293b',
      '--purple-accent': '#6366f1',
      '--purple-light': '#818cf8',
      '--purple-dark': '#4f46e5',
      '--text-primary': '#f0f9ff',
      '--text-secondary': '#cbd5e1',
      '--text-muted': '#94a3b8',
      '--code-bg': '#0f172a',
      '--green-accent': '#06b6d4',
    }
  },
  {
    name: 'ember-glow',
    displayName: 'Ember Glow',
    colors: {
      '--background-start': '#1a0f0a',
      '--background-end': '#2e1f1a',
      '--foreground': '#fff9f0',
      '--card': '#271811',
      '--card-foreground': '#fff9f0',
      '--popover': '#271811',
      '--popover-foreground': '#fff9f0',
      '--primary': '#ea580c',
      '--primary-foreground': '#ffffff',
      '--secondary': '#3b2d1e',
      '--secondary-foreground': '#e1d5cb',
      '--muted': '#554033',
      '--muted-foreground': '#b8a394',
      '--accent': '#f59e0b',
      '--accent-foreground': '#ffffff',
      '--destructive': '#ef4444',
      '--destructive-foreground': '#ffffff',
      '--border': 'rgba(234, 88, 12, 0.2)',
      '--input': '#3b2d1e',
      '--ring': 'rgba(234, 88, 12, 0.6)',
      '--sidebar-bg': '#1a0f0a',
      '--sidebar-item-hover': '#271811',
      '--chat-bg': 'transparent',
      '--message-bg': '#3b2d1e',
      '--purple-accent': '#d97706',
      '--purple-light': '#f59e0b',
      '--purple-dark': '#c2410c',
      '--text-primary': '#fff9f0',
      '--text-secondary': '#e1d5cb',
      '--text-muted': '#b8a394',
      '--code-bg': '#1a0f0a',
      '--green-accent': '#10b981',
    }
  },
  {
    name: 'forest-whisper',
    displayName: 'Forest Whisper',
    colors: {
      '--background-start': '#0a1a0f',
      '--background-end': '#1a2e1f',
      '--foreground': '#f0fff9',
      '--card': '#112718',
      '--card-foreground': '#f0fff9',
      '--popover': '#112718',
      '--popover-foreground': '#f0fff9',
      '--primary': '#059669',
      '--primary-foreground': '#ffffff',
      '--secondary': '#1e3b2d',
      '--secondary-foreground': '#cbe1d5',
      '--muted': '#335540',
      '--muted-foreground': '#94b8a3',
      '--accent': '#10b981',
      '--accent-foreground': '#ffffff',
      '--destructive': '#ef4444',
      '--destructive-foreground': '#ffffff',
      '--border': 'rgba(5, 150, 105, 0.2)',
      '--input': '#1e3b2d',
      '--ring': 'rgba(5, 150, 105, 0.6)',
      '--sidebar-bg': '#0a1a0f',
      '--sidebar-item-hover': '#112718',
      '--chat-bg': 'transparent',
      '--message-bg': '#1e3b2d',
      '--purple-accent': '#059669',
      '--purple-light': '#10b981',
      '--purple-dark': '#047857',
      '--text-primary': '#f0fff9',
      '--text-secondary': '#cbe1d5',
      '--text-muted': '#94b8a3',
      '--code-bg': '#0a1a0f',
      '--green-accent': '#22c55e',
    }
  },
  {
    name: 'cosmic-midnight',
    displayName: 'Cosmic Midnight',
    colors: {
      '--background-start': '#0f0a1a',
      '--background-end': '#1f1a2e',
      '--foreground': '#f9f0ff',
      '--card': '#181127',
      '--card-foreground': '#f9f0ff',
      '--popover': '#181127',
      '--popover-foreground': '#f9f0ff',
      '--primary': '#8b5cf6',
      '--primary-foreground': '#ffffff',
      '--secondary': '#2d1e3b',
      '--secondary-foreground': '#d5cbe1',
      '--muted': '#403355',
      '--muted-foreground': '#a394b8',
      '--accent': '#a855f7',
      '--accent-foreground': '#ffffff',
      '--destructive': '#ef4444',
      '--destructive-foreground': '#ffffff',
      '--border': 'rgba(139, 92, 246, 0.2)',
      '--input': '#2d1e3b',
      '--ring': 'rgba(139, 92, 246, 0.6)',
      '--sidebar-bg': '#0f0a1a',
      '--sidebar-item-hover': '#181127',
      '--chat-bg': 'transparent',
      '--message-bg': '#2d1e3b',
      '--purple-accent': '#8b5cf6',
      '--purple-light': '#a855f7',
      '--purple-dark': '#7c3aed',
      '--text-primary': '#f9f0ff',
      '--text-secondary': '#d5cbe1',
      '--text-muted': '#a394b8',
      '--code-bg': '#0f0a1a',
      '--green-accent': '#22c55e',
    }
  }
];

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('violet-storm');

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('t3-chat-theme') as ThemeName;
    if (savedTheme && themes.find(t => t.name === savedTheme)) {
      setCurrentTheme(savedTheme);
    }
  }, []);

  // Apply theme to CSS variables
  useEffect(() => {
    const theme = themes.find(t => t.name === currentTheme);
    if (theme) {
      const root = document.documentElement;
      Object.entries(theme.colors).forEach(([property, value]) => {
        root.style.setProperty(property, value);
      });
    }
  }, [currentTheme]);

  const setTheme = (theme: ThemeName) => {
    setCurrentTheme(theme);
    localStorage.setItem('t3-chat-theme', theme);
  };

  const value: ThemeContextType = {
    currentTheme,
    setTheme,
    themes,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 