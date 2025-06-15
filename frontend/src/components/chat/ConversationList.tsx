/**
 * Conversation List Component
 * Displays the list of user conversations with selection handling
 */

'use client';

import React from 'react';
import { clsx } from 'clsx';
import { useConversations } from '@/contexts/ConversationsContext';

interface ConversationListProps {
  selectedConversationId?: string;
  onConversationSelect?: (conversationId: string) => void;
}

export function ConversationList({ 
  selectedConversationId,
  onConversationSelect 
}: ConversationListProps) {
  const { conversations, loading, error, deleteConversation } = useConversations();

  // Note: Auto-selection is now handled by routing in the main pages

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (confirm('Are you sure you want to delete this conversation?')) {
      await deleteConversation(conversationId);
      // The parent component will handle navigation if needed
    }
  };

  if (loading) {
    return (
      <div className="p-2 text-center">
        <div className="text-zinc-400 text-sm">Loading conversations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-2 text-center">
        <div className="text-red-400 text-sm">
          Error loading conversations: {error}
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-2 text-center">
        <div className="text-zinc-400 text-sm">
          <div className="mb-2">
            <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          No conversations yet
          <br />
          Start a new chat to begin
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {conversations.map((conversation) => (
        <div
          key={conversation.id}
          className={clsx(
            'relative p-3 rounded-lg transition-colors group cursor-pointer',
            selectedConversationId === conversation.id
              ? 'bg-[#2d2d2d] border border-[#8b5cf6]/30'
              : 'hover:bg-[#262626] border border-transparent'
          )}
          onClick={() => onConversationSelect?.(conversation.id)}
        >
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center flex-1 mr-2">
              {conversation.title?.startsWith('Branch from ') && (
                <svg className="w-3 h-3 text-[#8b5cf6] mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
              <h3 className={clsx(
                'font-medium text-sm truncate',
                selectedConversationId === conversation.id
                  ? 'text-white'
                  : 'text-zinc-200 group-hover:text-white'
              )}>
                {conversation.title || 'New Conversation'}
              </h3>
            </div>
            
            <span className="text-xs text-zinc-500 flex-shrink-0">
              {formatTimeAgo(conversation.updated_at)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-400 truncate flex-1 mr-2">
              {conversation.last_message_preview || 'No messages yet'}
            </p>
            
            <div className="flex items-center space-x-1 flex-shrink-0">
              <span className="text-xs text-zinc-500">
                {conversation.message_count}
              </span>
              <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
          </div>

          {/* Model indicator and delete button */}
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-zinc-500 bg-[#3f3f46] px-2 py-1 rounded">
              {conversation.current_model}
            </span>
            
            {selectedConversationId === conversation.id && (
              <button
                onClick={(e) => handleDeleteConversation(conversation.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-400 transition-all z-10"
                title="Delete conversation"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
} 