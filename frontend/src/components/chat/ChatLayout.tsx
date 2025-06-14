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
    <div className="min-h-screen bg-[#1a1a1a] flex">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-[#171717] border-r border-[#3f3f46] transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar 
          onClose={() => setSidebarOpen(false)}
          onNewChat={onNewChat}
          selectedConversationId={selectedConversationId}
          onConversationSelect={onConversationSelect}
        />
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header with hamburger menu */}
        <header className="bg-[#171717] border-b border-[#3f3f46] p-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        {/* Chat content */}
        <div className="flex-1 flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
} 