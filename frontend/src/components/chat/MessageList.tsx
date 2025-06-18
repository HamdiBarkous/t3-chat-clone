/**
 * Message List Component
 * Displays a scrollable list of messages with simple auto-scroll on new messages
 */

'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { MessageBubble } from './MessageBubble';
import { ToolExecution, type ToolCall } from './ToolExecution';
import type { Message } from '@/types/api';

interface MessageListProps {
  messages: Message[];
  streamingMessageId?: string;
  isLoading?: boolean;
  isLoadingConversation?: boolean;
  toolExecutions?: ToolCall[];
  streamingContent?: string;
  streamingReasoning?: string;
  reasoningStartTime?: number | null;
}

export function MessageList({ 
  messages, 
  streamingMessageId,
  isLoading = false,
  isLoadingConversation = false,
  toolExecutions,
  streamingContent,
  streamingReasoning,
  reasoningStartTime
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Simple scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom]);

  // Sort messages by timestamp and deduplicate by ID to ensure proper chronological ordering
  const uniqueMessages = messages.filter((message, index, array) => 
    array.findIndex(m => m.id === message.id) === index
  );
  const sortedMessages = [...uniqueMessages].sort((a, b) => a.timestamp - b.timestamp);

  // Determine if AI is generating response (streaming an assistant message)
  const isResponseGenerating = !!streamingMessageId && isLoading;

  // Show conversation loading state when switching conversations
  if (isLoadingConversation) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="relative w-8 h-8">
          {/* Spinning gradient icon */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-dark to-primary rounded-full animate-spin animate-pulse" 
               style={{ animationDuration: '1.5s' }}>
          </div>
          
          {/* Inner icon */}
          <div className="absolute inset-1 bg-background rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-primary animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-secondary to-background rounded-full flex items-center justify-center border border-border">
            <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">Start the conversation</h3>
          <p className="text-text-muted">Send a message to begin chatting with AI</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide"
    >
      <div className="max-w-4xl mx-auto">
        {/* Messages */}
        {sortedMessages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isStreaming={streamingMessageId === message.id}
            streamingContent={streamingMessageId === message.id ? streamingContent : undefined}
            streamingReasoning={streamingMessageId === message.id ? streamingReasoning : undefined}
            reasoningStartTime={reasoningStartTime}
          />
        ))}

        {/* Tool Executions - Show during/after tool calls */}
        {toolExecutions && toolExecutions.length > 0 && (
          <ToolExecution 
            tools={toolExecutions} 
            isResponseGenerating={isResponseGenerating}
            autoCollapse={true}
          />
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
} 