/**
 * Sidebar Component
 * Contains user info, new chat button, and conversation list
 */

'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { ConversationList } from './ConversationList';

interface SidebarProps {
  onClose?: () => void;
  onNewChat?: () => void;
  selectedConversationId?: string;
  onConversationSelect?: (conversationId: string) => void;
}

export function Sidebar({ 
  onClose, 
  onNewChat,
  selectedConversationId,
  onConversationSelect
}: SidebarProps) {
  const { user, signOut } = useAuth();

  const handleNewChat = () => {
    onNewChat?.();
    onClose?.();
  };

  return (
    <div className="h-screen flex flex-col max-h-screen">
      {/* Header */}
      <div className="p-4 border-b border-[#3f3f46] flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-white">T3.chat</h1>
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white transition-colors md:hidden"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* New Chat Button */}
        <Button 
          onClick={handleNewChat}
          className="w-full"
          variant="primary"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </Button>
      </div>

      {/* Conversation List - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0 max-h-full scrollbar-hide">
        <div className="p-2">
          <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider px-3 py-2 mb-2 sticky top-0 bg-[#171717] z-10">
            Recent Conversations
          </h2>
          <div className="space-y-1">
            <ConversationList 
              selectedConversationId={selectedConversationId}
              onConversationSelect={onConversationSelect}
            />
          </div>
        </div>
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-[#3f3f46] flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            {/* Avatar */}
            <div className="w-8 h-8 bg-[#8b5cf6] rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-medium">
                {user?.user_metadata?.name?.[0]?.toUpperCase() || 
                 user?.email?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            
            {/* User info */}
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-medium truncate">
                {user?.user_metadata?.name || 'User'}
              </p>
              <p className="text-zinc-400 text-xs truncate">
                {user?.email}
              </p>
            </div>
          </div>

          {/* Settings dropdown */}
          <div className="relative">
            <button
              onClick={() => signOut()}
              className="p-1 text-zinc-400 hover:text-white transition-colors rounded hover:bg-[#2d2d2d]"
              title="Sign out"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 