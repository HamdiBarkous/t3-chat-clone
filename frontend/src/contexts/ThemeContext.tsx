/**
 * Theme Context Provider
 * Manages different color themes for the application
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeName = 'violet-storm' | 'arctic-nexus' | 'ember-glow' | 'neon-cyber' | 'rose-gold';

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
    name: 'neon-cyber',
    displayName: 'Neon Cyber',
    colors: {
      '--background-start': '#0a0a0f',
      '--background-end': '#1a1a2e',
      '--foreground': '#e0ffff',
      '--card': '#16213e',
      '--card-foreground': '#e0ffff',
      '--popover': '#16213e',
      '--popover-foreground': '#e0ffff',
      '--primary': '#00ff9f',
      '--primary-foreground': '#000000',
      '--secondary': '#0f3460',
      '--secondary-foreground': '#00d4ff',
      '--muted': '#1a2332',
      '--muted-foreground': '#7dd3fc',
      '--accent': '#ff0080',
      '--accent-foreground': '#ffffff',
      '--destructive': '#ff3366',
      '--destructive-foreground': '#ffffff',
      '--border': 'rgba(0, 255, 159, 0.3)',
      '--input': '#0f3460',
      '--ring': 'rgba(0, 255, 159, 0.8)',
      '--sidebar-bg': '#0a0a0f',
      '--sidebar-item-hover': '#16213e',
      '--chat-bg': 'transparent',
      '--message-bg': '#0f3460',
      '--purple-accent': '#8b5cf6',
      '--purple-light': '#a78bfa',
      '--purple-dark': '#7c3aed',
      '--text-primary': '#e0ffff',
      '--text-secondary': '#00d4ff',
      '--text-muted': '#7dd3fc',
      '--code-bg': '#0a0a0f',
      '--green-accent': '#00ff9f',
    }
  },
  {
    name: 'rose-gold',
    displayName: 'Rose Gold',
    colors: {
      '--background-start': '#1a0f14',
      '--background-end': '#2e1a20',
      '--foreground': '#fff0f5',
      '--card': '#2a1a22',
      '--card-foreground': '#fff0f5',
      '--popover': '#2a1a22',
      '--popover-foreground': '#fff0f5',
      '--primary': '#e879f9',
      '--primary-foreground': '#ffffff',
      '--secondary': '#3d2a35',
      '--secondary-foreground': '#f3d5e0',
      '--muted': '#5a4047',
      '--muted-foreground': '#c9a3b0',
      '--accent': '#fbbf24',
      '--accent-foreground': '#000000',
      '--destructive': '#ef4444',
      '--destructive-foreground': '#ffffff',
      '--border': 'rgba(232, 121, 249, 0.2)',
      '--input': '#3d2a35',
      '--ring': 'rgba(232, 121, 249, 0.6)',
      '--sidebar-bg': '#1a0f14',
      '--sidebar-item-hover': '#2a1a22',
      '--chat-bg': 'transparent',
      '--message-bg': '#3d2a35',
      '--purple-accent': '#e879f9',
      '--purple-light': '#f0abfc',
      '--purple-dark': '#d946ef',
      '--text-primary': '#fff0f5',
      '--text-secondary': '#f3d5e0',
      '--text-muted': '#c9a3b0',
      '--code-bg': '#1a0f14',
      '--green-accent': '#34d399',
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