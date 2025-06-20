/**
 * Message List Component
 * Displays a scrollable list of messages with simple auto-scroll on new messages
 */

'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { MessageBubble } from './MessageBubble';
import { ToolExecution, type ToolCall } from './ToolExecution';
import { MessageSkeleton } from '@/components/ui/Skeleton';
import type { Message } from '@/types/api';
import { ReasoningDisplay } from './ReasoningDisplay';

interface MessageListProps {
  messages: Message[];
  streamingMessageId?: string | null;
  isLoading?: boolean;
  isLoadingConversation?: boolean;
  toolExecutions?: ToolCall[];
  reasoningPhases?: Array<{
    id: string;
    content: string;
    startTime: number;
    endTime?: number;
  }>;
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
  reasoningPhases = [],
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

  // Create unified chronological timeline with messages and tool executions
  const createChronologicalTimeline = () => {
    const timeline: Array<{
      type: 'message' | 'tool-execution' | 'reasoning';
      timestamp: number;
      data: Message | ToolCall | { id: string; content: string; startTime: number; endTime?: number };
      id: string;
    }> = [];

    // Add messages to timeline
    sortedMessages.forEach(message => {
      timeline.push({
        type: 'message',
        timestamp: message.timestamp,
        data: message,
        id: message.id
      });
    });

    // Add individual tool executions to timeline (not grouped)
    // This allows tools to be interleaved chronologically with messages
    if (toolExecutions && toolExecutions.length > 0) {
      toolExecutions.forEach(tool => {
        timeline.push({
          type: 'tool-execution',
          timestamp: tool.startTime,
          data: tool,
          id: tool.id
        });
      });
    }

    // Add individual reasoning phases to timeline 
    // This allows reasoning to be properly ordered with tools
    if (reasoningPhases && reasoningPhases.length > 0) {
      reasoningPhases.forEach(reasoningPhase => {
        timeline.push({
          type: 'reasoning',
          timestamp: reasoningPhase.startTime,
          data: reasoningPhase,
          id: reasoningPhase.id
        });
      });
    }

    // Special handling for streaming messages to ensure correct chronological placement
    const adjustedTimeline = timeline.map(item => {
      if (item.type === 'message') {
        const message = item.data as Message;
        // If this is a streaming message and we have tool executions, ensure it comes after tools
        if (streamingMessageId === message.id && toolExecutions && toolExecutions.length > 0) {
          const latestToolTime = Math.max(...toolExecutions.map(t => t.endTime || t.startTime));
          return {
            ...item,
            timestamp: latestToolTime + 1 // Place slightly after the latest tool
          };
        }
      }
      return item;
    });

    // Sort timeline by timestamp for true chronological order
    const sortedTimeline = adjustedTimeline.sort((a, b) => a.timestamp - b.timestamp);
    
    return sortedTimeline;
  };

  const chronologicalTimeline = createChronologicalTimeline();
  
  // Determine if AI is generating response (streaming an assistant message)
  const isResponseGenerating = !!streamingMessageId && isLoading;

  // Show conversation loading state when switching conversations
  if (isLoadingConversation) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
        <div className="max-w-4xl mx-auto space-y-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <MessageSkeleton key={index} />
          ))}
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
        {/* Render Chronological Timeline */}
        {chronologicalTimeline.map((timelineItem, index) => {
          if (timelineItem.type === 'message') {
            const message = timelineItem.data as Message;
            return (
              <MessageBubble
                key={message.id}
                message={message}
                isStreaming={streamingMessageId === message.id}
                streamingContent={streamingMessageId === message.id ? streamingContent : ''}
                streamingReasoning={streamingMessageId === message.id ? streamingReasoning : ''}
                reasoningStartTime={streamingMessageId === message.id ? reasoningStartTime : undefined}
              />
            );
          } else if (timelineItem.type === 'tool-execution') {
            const tool = timelineItem.data as ToolCall;
            return (
              <div key={timelineItem.id} className="mb-6">
                <ToolExecution 
                  tools={[tool]} 
                  isResponseGenerating={isResponseGenerating}
                />
              </div>
            );
          } else if (timelineItem.type === 'reasoning') {
            const reasoningPhase = timelineItem.data as { id: string; content: string; startTime: number; endTime?: number };
            return (
              <div key={reasoningPhase.id} className="mb-6">
                <ReasoningDisplay 
                  reasoning={reasoningPhase.content}
                  isStreaming={false}
                  startTime={reasoningPhase.startTime}
                />
              </div>
            );
          }
          return null;
        })}

        {/* Loading state */}
        {isLoadingConversation && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
          </div>
        )}

        {/* Bottom spacer for auto-scroll */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
} 