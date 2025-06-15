/**
 * Main Chat Layout Component
 * Handles the overall structure with sidebar and main chat area
 */

'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { clsx } from 'clsx';

interface ChatLayoutProps {
  children: React.ReactNode;
  onNewChat?: () => void;
  selectedConversationId?: string;
  onConversationSelect?: (conversationId: string) => void;
}

export function ChatLayout({ 
  children, 
  onNewChat,
  selectedConversationId,
  onConversationSelect
}: ChatLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="h-screen bg-[#1a1a1a] flex overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'z-50 bg-[#171717] border-r border-[#3f3f46] transform transition-all duration-300 ease-in-out',
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
        <header className="bg-[#171717] border-b border-[#3f3f46] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Sidebar toggle button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-[#2d2d2d]"
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
              <h1 className="text-lg font-semibold text-white transition-opacity duration-300">T3.chat</h1>
            )}
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