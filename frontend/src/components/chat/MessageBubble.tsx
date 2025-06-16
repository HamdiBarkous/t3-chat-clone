/**
 * Message Bubble Component
 * Displays individual messages with different styles for user and assistant
 */

'use client';

import React, { useState } from 'react';
import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';
import type { Message } from '@/types/api';
import { MessageStatus } from '@/types/api';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { DocumentBadge } from '@/components/ui/DocumentBadge';
import { useConversations } from '@/contexts/ConversationsContext';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming = false }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const router = useRouter();
  const { branchConversation, editMessage, retryMessage } = useConversations();
  const [isBranching, setIsBranching] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleBranchFromHere = async () => {
    if (isBranching) return;
    
    setIsBranching(true);
    try {
      const newConversation = await branchConversation(message.conversation_id, message.id);
      if (newConversation) {
        // Navigate to the new conversation
        router.push(`/conversations/${newConversation.id}`);
      }
    } catch (error) {
      console.error('Error branching conversation:', error);
    } finally {
      setIsBranching(false);
    }
  };

  const handleEditMessage = async () => {
    if (isSaving || !editContent.trim()) return;
    
    setIsSaving(true);
    try {
      const newConversation = await editMessage(message.conversation_id, message.id, editContent.trim());
      if (newConversation) {
        // Navigate to the new conversation and trigger AI response generation
        router.push(`/conversations/${newConversation.id}?autoGenerateResponse=true`);
      }
    } catch (error) {
      console.error('Error editing message:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetryMessage = async () => {
    if (isRetrying) return;
    
    setIsRetrying(true);
    try {
      const newConversation = await retryMessage(message.conversation_id, message.id);
      if (newConversation) {
        // Navigate to the new conversation and trigger AI response generation
        router.push(`/conversations/${newConversation.id}?autoGenerateResponse=true`);
      }
    } catch (error) {
      console.error('Error retrying message:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const startEditing = () => {
    setIsEditing(true);
    setEditContent(message.content);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditContent(message.content);
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
        {/* Document Attachments (for user messages) */}
        {isUser && message.documents && message.documents.length > 0 && (
          <div className="mb-2 max-w-full">
            <div className="text-xs text-zinc-500 mb-1">
              Attached files ({message.documents.length}):
            </div>
            <div className="flex flex-wrap gap-1">
              {message.documents.map((doc) => (
                <DocumentBadge
                  key={doc.id}
                  document={doc}
                  size="sm"
                />
              ))}
            </div>
          </div>
        )}

        {/* Message Bubble */}
        <div 
          className={clsx(
            'rounded-lg relative',
            isUser 
              ? 'bg-[#8b5cf6] text-white px-4 py-3' 
              : 'bg-[#2d2d2d] text-white border border-[#3f3f46]'
          )}
        >
          {/* Message Text */}
          {isUser ? (
            <div className="whitespace-pre-wrap break-words">
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full bg-[#7c3aed] text-white placeholder-purple-200 border border-purple-400 rounded p-2 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
                    rows={3}
                    placeholder="Edit your message..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleEditMessage}
                      disabled={!editContent.trim() || isSaving}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
                    >
                      {isSaving ? 'Creating branch...' : 'Send'}
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={isSaving}
                      className="px-3 py-1 bg-purple-800 hover:bg-purple-900 text-white text-sm rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                message.content
              )}
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
          
          {/* Status indicators */}
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

          {/* Action buttons */}
          {!isStreaming && (
            <div className="flex items-center gap-1">
              {/* Edit button for user messages */}
              {isUser && !isEditing && (
                <button
                  onClick={startEditing}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200"
                  title="Edit message"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit</span>
                </button>
              )}

              {/* Retry button for assistant messages */}
              {isAssistant && (
                <button
                  onClick={handleRetryMessage}
                  disabled={isRetrying}
                  className={clsx(
                    'flex items-center gap-1 px-2 py-1 rounded text-xs',
                    'hover:bg-zinc-800 transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    isRetrying ? 'text-zinc-500' : 'text-zinc-400 hover:text-zinc-200'
                  )}
                  title="Retry response"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>{isRetrying ? 'Retrying...' : 'Retry'}</span>
                </button>
              )}

              {/* Branch button for assistant messages */}
              {isAssistant && (
                <button
                  onClick={handleBranchFromHere}
                  disabled={isBranching}
                  className={clsx(
                    'flex items-center gap-1 px-2 py-1 rounded text-xs',
                    'hover:bg-zinc-800 transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    isBranching ? 'text-zinc-500' : 'text-zinc-400 hover:text-zinc-200'
                  )}
                  title="Branch from here"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>{isBranching ? 'Branching...' : 'Branch'}</span>
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
} 