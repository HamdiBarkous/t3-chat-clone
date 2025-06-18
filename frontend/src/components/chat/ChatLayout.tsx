/**
 * Main Chat Layout Component
 * Handles the overall structure with sidebar and main chat area
 */

'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { clsx } from 'clsx';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';

interface ChatLayoutProps {
  children: React.ReactNode;
  onNewChat?: () => void;
  selectedConversationId?: string;
  onConversationSelect?: (conversationId: string) => void;
  // Customization props
  showCustomization?: boolean;
  onCustomizationToggle?: () => void;
}

export function ChatLayout({ 
  children, 
  onNewChat,
  selectedConversationId,
  onConversationSelect,
  showCustomization = false,
  onCustomizationToggle
}: ChatLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="h-screen bg-chat-bg flex overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'z-50 bg-sidebar-bg border-r border-border transform transition-all duration-300 ease-in-out',
          // Mobile: fixed overlay
          'fixed inset-y-0 left-0 w-80 md:relative md:h-full',
          // Desktop: collapsible width
          sidebarOpen 
            ? 'translate-x-0 md:w-80' 
            : '-translate-x-full md:translate-x-0 md:w-0 md:border-r-0 md:overflow-hidden'
        )}
      >
        <div className={clsx(
          'h-full w-80 transition-opacity duration-300',
          sidebarOpen ? 'opacity-100' : 'opacity-0 md:pointer-events-none'
        )}>
          <Sidebar 
            onClose={() => setSidebarOpen(false)}
            onNewChat={onNewChat}
            selectedConversationId={selectedConversationId}
            onConversationSelect={onConversationSelect}
          />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
        {/* Header with toggle button */}
        <header className="bg-sidebar-bg/50 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Sidebar toggle button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-muted"
              title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {sidebarOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            
            {/* App title when sidebar is hidden */}
            {!sidebarOpen && (
              <h1 className="text-lg font-semibold text-text-primary transition-opacity duration-300">T3.chat</h1>
            )}
          </div>
          
          {/* Theme Switcher */}
          <div className="flex items-center gap-2">
            {/* Customization Toggle */}
            <button
              onClick={onCustomizationToggle}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium',
                'hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/50',
                showCustomization 
                  ? 'bg-primary/15 border border-primary/40 text-primary' 
                  : 'bg-card/50 border border-border/30 text-text-muted hover:text-text-primary'
              )}
              title={showCustomization ? 'Hide Customization' : 'Show Customization'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.5 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="hidden sm:inline">Customize</span>
            </button>
            
            <ThemeSwitcher />
          </div>
        </header>

        {/* Chat content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
} 