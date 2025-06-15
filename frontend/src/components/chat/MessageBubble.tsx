/**
 * Message Bubble Component
 * Displays individual messages with different styles for user and assistant
 */

'use client';

import React from 'react';
import { clsx } from 'clsx';
import type { Message } from '@/types/api';
import { MessageStatus } from '@/types/api';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming = false }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={clsx(
      'flex w-full mb-6',
      isUser ? 'justify-end' : 'justify-start'
    )}>
      <div className={clsx(
        'flex flex-col max-w-[80%]',
        isUser ? 'items-end' : 'items-start'
      )}>
        {/* Message Bubble */}
        <div className={clsx(
          'rounded-lg relative',
          isUser 
            ? 'bg-[#8b5cf6] text-white px-4 py-3' 
            : 'bg-[#2d2d2d] text-white border border-[#3f3f46]'
        )}>
          {/* Message Text */}
          {isUser ? (
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          ) : (
            <div className={clsx(isAssistant ? 'p-4' : 'px-4 py-3')}>
              {message.content ? (
                <MarkdownRenderer content={message.content} />
              ) : isStreaming ? (
                // Show typing indicator when streaming and no content yet
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-[#8b5cf6] rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-[#7c3aed] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-1.5 h-1.5 bg-[#8b5cf6] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              ) : null}
              {isStreaming && message.content && (
                <span className="inline-block w-2 h-5 bg-[#8b5cf6] ml-1 animate-pulse" />
              )}
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className={clsx(
          'flex items-center gap-2 mt-1 text-xs text-zinc-500',
          isUser ? 'flex-row-reverse' : 'flex-row'
        )}>
          <span>{formatTimestamp(message.created_at)}</span>
          
          {/* Status indicators - simplified for new backend */}
          {message.role === 'user' && (
            <div className="flex items-center gap-1">
              {message.status === MessageStatus.COMPLETED && (
                <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {message.status === MessageStatus.FAILED && (
                <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                )}
            </div>
          )}


        </div>
      </div>
    </div>
  );
} 