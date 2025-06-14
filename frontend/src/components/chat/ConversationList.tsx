/**
 * Conversation List Component
 * Displays the list of user conversations with selection handling
 */

'use client';

import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import type { ConversationListItem } from '@/types/api';

// Mock data for now - will be replaced with API calls
const mockConversations: ConversationListItem[] = [
  {
    id: '1',
    title: 'Simple Neural Network in Python',
    current_model: 'gpt-4o',
    created_at: '2024-06-14T10:30:00Z',
    updated_at: '2024-06-14T11:45:00Z',
    message_count: 12,
    last_message_preview: 'Here\'s a simple implementation of a neural network...',
    last_message_at: '2024-06-14T11:45:00Z',
  },
  {
    id: '2', 
    title: 'Greeting Title',
    current_model: 'gpt-4o-mini',
    created_at: '2024-06-14T09:15:00Z',
    updated_at: '2024-06-14T09:30:00Z',
    message_count: 3,
    last_message_preview: 'Hello! How can I help you today?',
    last_message_at: '2024-06-14T09:30:00Z',
  },
];

interface ConversationListProps {
  selectedConversationId?: string;
  onConversationSelect?: (conversationId: string) => void;
}

export function ConversationList({ 
  selectedConversationId,
  onConversationSelect 
}: ConversationListProps) {
  const [conversations] = useState<ConversationListItem[]>(mockConversations);

  // Auto-select first conversation for demo purposes
  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0 && onConversationSelect) {
      onConversationSelect(conversations[0].id);
    }
  }, [selectedConversationId, conversations, onConversationSelect]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center">
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
    <div className="h-full overflow-y-auto">
      <div className="p-2">
        <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2 px-2">
          Recent
        </h2>
        
        <div className="space-y-1">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => onConversationSelect?.(conversation.id)}
              className={clsx(
                'w-full text-left p-3 rounded-lg transition-colors group',
                selectedConversationId === conversation.id
                  ? 'bg-[#2d2d2d] border border-[#8b5cf6]/30'
                  : 'hover:bg-[#262626] border border-transparent'
              )}
            >
              <div className="flex items-start justify-between mb-1">
                <h3 className={clsx(
                  'font-medium text-sm truncate flex-1 mr-2',
                  selectedConversationId === conversation.id
                    ? 'text-white'
                    : 'text-zinc-200 group-hover:text-white'
                )}>
                  {conversation.title || 'New Conversation'}
                </h3>
                
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

              {/* Model indicator */}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-zinc-500 bg-[#3f3f46] px-2 py-1 rounded">
                  {conversation.current_model}
                </span>
                
                {selectedConversationId === conversation.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Implement delete functionality
                      console.log('Delete conversation:', conversation.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-400 transition-all"
                    title="Delete conversation"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
} 