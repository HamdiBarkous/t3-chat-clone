/**
 * Message Bubble Component
 * Displays individual messages with different styles for user and assistant
 */

'use client';

import React from 'react';
import { clsx } from 'clsx';
import type { Message } from '@/types/api';
import { MessageStatus } from '@/types/api';

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
        'flex max-w-[80%] gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}>
        {/* Avatar */}
        <div className={clsx(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1',
          isUser 
            ? 'bg-[#8b5cf6]' 
            : 'bg-[#2d2d2d] border border-[#3f3f46]'
        )}>
          {isUser ? (
            <span className="text-white text-sm font-medium">U</span>
          ) : (
            <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          )}
        </div>

        {/* Message Content */}
        <div className={clsx(
          'flex flex-col',
          isUser ? 'items-end' : 'items-start'
        )}>
          {/* Message Bubble */}
          <div className={clsx(
            'px-4 py-3 rounded-lg relative',
            isUser 
              ? 'bg-[#8b5cf6] text-white' 
              : 'bg-[#2d2d2d] text-white border border-[#3f3f46]'
          )}>
            {/* Message Text */}
            <div className="whitespace-pre-wrap break-words">
              {message.content}
              {isStreaming && (
                <span className="inline-block w-2 h-5 bg-current ml-1 animate-pulse" />
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className={clsx(
            'flex items-center gap-2 mt-1 text-xs text-zinc-500',
            isUser ? 'flex-row-reverse' : 'flex-row'
          )}>
            <span>{formatTimestamp(message.created_at)}</span>
            
            {/* Status indicators */}
            {message.role === 'user' && (
              <div className="flex items-center gap-1">
                {message.status === MessageStatus.PENDING && (
                  <div className="w-2 h-2 bg-zinc-500 rounded-full animate-pulse" />
                )}
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

            {isAssistant && isStreaming && (
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 bg-[#8b5cf6] rounded-full animate-bounce" />
                <div className="w-1 h-1 bg-[#8b5cf6] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-1 h-1 bg-[#8b5cf6] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <span className="text-[#8b5cf6] ml-1">AI is typing...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 