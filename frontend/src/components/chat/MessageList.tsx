/**
 * Message List Component
 * Displays a scrollable list of messages with auto-scroll to bottom
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import type { Message } from '@/types/api';

interface MessageListProps {
  messages: Message[];
  streamingMessageId?: string;
  isLoading?: boolean;
}

export function MessageList({ 
  messages, 
  streamingMessageId,
  isLoading = false 
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, streamingMessageId]);

  // Sort messages by timestamp to ensure proper chronological ordering
  const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#2d2d2d] rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Start the conversation</h3>
          <p className="text-zinc-400">Send a message to begin chatting with AI</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-6"
    >
      <div className="max-w-4xl mx-auto">
        {/* Messages */}
        {sortedMessages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isStreaming={streamingMessageId === message.id}
          />
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start mb-6">
            <div className="flex max-w-[80%] gap-3">
              {/* AI Avatar */}
              <div className="w-8 h-8 rounded-full bg-[#2d2d2d] border border-[#3f3f46] flex items-center justify-center flex-shrink-0 mt-1">
                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>

              {/* Loading bubble */}
              <div className="bg-[#2d2d2d] border border-[#3f3f46] px-4 py-3 rounded-lg">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
} 