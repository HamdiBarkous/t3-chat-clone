/**
 * Color palette matching the T3.chat interface
 * These colors are defined in globals.css and can be used with Tailwind classes
 */

export const colors = {
  // Base colors
  background: '#1a1a1a',
  foreground: '#ffffff',
  card: '#1e1e1e',
  
  // Purple theme colors
  primary: '#8b5cf6',          // Main purple
  accent: '#7c3aed',           // Darker purple
  purpleLight: '#a78bfa',      // Lighter purple
  
  // Gray scale
  secondary: '#2d2d2d',
  muted: '#2d2d2d',
  border: '#3f3f46',
  
  // Chat specific
  sidebarBg: '#171717',        // Left sidebar background
  sidebarHover: '#262626',     // Sidebar item hover
  chatBg: '#1a1a1a',          // Main chat area
  messageBg: '#2d2d2d',       // Message bubbles
  
  // Text colors
  textPrimary: '#ffffff',      // Main text
  textSecondary: '#d4d4d8',    // Secondary text
  textMuted: '#71717a',        // Muted text
  
  // Utility colors
  destructive: '#ef4444',      // Error/delete red
  success: '#22c55e',          // Success green
} as const;

/**
 * Tailwind class names for colors
 * Use these for consistent styling across components
 */
export const colorClasses = {
  // Backgrounds
  sidebarBg: 'bg-[#171717]',
  chatBg: 'bg-[#1a1a1a]',
  messageBg: 'bg-[#2d2d2d]',
  cardBg: 'bg-[#1e1e1e]',
  
  // Purple theme
  purpleAccent: 'bg-[#8b5cf6]',
  purpleDark: 'bg-[#7c3aed]',
  purpleLight: 'bg-[#a78bfa]',
  
  // Text colors
  textPrimary: 'text-white',
  textSecondary: 'text-zinc-300',
  textMuted: 'text-zinc-500',
  
  // Borders
  border: 'border-zinc-600',
  borderMuted: 'border-zinc-700',
  
  // Hover states
  hoverSidebar: 'hover:bg-[#262626]',
  hoverPurple: 'hover:bg-[#7c3aed]',
  hoverCard: 'hover:bg-[#2d2d2d]',
} as const;

export type ColorKey = keyof typeof colors;
export type ColorClass = keyof typeof colorClasses; 