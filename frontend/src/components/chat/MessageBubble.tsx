/**
 * Message Bubble Component
 * Displays individual messages with different styles for user and assistant
 * Optimized for streaming performance with React.memo
 */

'use client';

import React, { useState, memo } from 'react';
import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';
import type { Message } from '@/types/api';
import { MessageStatus } from '@/types/api';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { DocumentBadge } from '@/components/ui/DocumentBadge';
import { ImageDisplay } from '@/components/ui/ImageDisplay';
import { useConversations } from '@/contexts/ConversationsContext';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  streamingContent?: string; // Direct streaming content for performance
}

// Memoized component to prevent unnecessary re-renders during streaming
export function MessageBubble({ message, isStreaming = false, streamingContent }: MessageBubbleProps) {
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
      'flex w-full mb-6 group',
      isUser ? 'justify-end' : 'justify-start'
    )}>
      <div className={clsx(
        'flex flex-col max-w-[80%]',
        isUser ? 'items-end' : 'items-start'
      )}>
        {/* Message Content */}
        {isUser ? (
          // User messages in a subtle box using CSS custom properties
          <div className="message-bg rounded-lg px-4 py-3 border border-border">
            <div className="whitespace-pre-wrap break-words text-primary">
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full bg-input text-primary placeholder-text-muted border border-border rounded p-2 resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    rows={3}
                    placeholder="Edit your message..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleEditMessage}
                      disabled={!editContent.trim() || isSaving}
                      className="px-3 py-1 purple-accent hover:bg-purple-dark disabled:opacity-50 disabled:cursor-not-allowed text-primary text-sm rounded transition-colors"
                    >
                      {isSaving ? 'Creating branch...' : 'Send'}
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={isSaving}
                      className="px-3 py-1 bg-secondary hover:bg-muted text-primary text-sm rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                message.content
              )}
            </div>
          </div>
        ) : (
          // AI messages blend into background (no box) using CSS custom properties
          <div className="text-primary">
            {(() => {
              // Use streaming content if available and currently streaming, otherwise use message content
              const contentToRender = isStreaming && streamingContent !== undefined 
                ? streamingContent 
                : message.content;
              
              if (contentToRender) {
                return (
                  <MarkdownRenderer 
                    content={contentToRender} 
                    isStreaming={isStreaming}
                  />
                );
              } else {
                return (
                  <div className="text-text-muted italic">
                    {isStreaming ? 'Thinking...' : 'No content'}
                  </div>
                );
              }
            })()}
          </div>
        )}

        {/* Document Attachments (for user messages) */}
        {isUser && message.documents && message.documents.length > 0 && (
          <div className="mt-4 max-w-full space-y-3">
            {/* Separate images from regular documents */}
            {(() => {
              const images = message.documents.filter(doc => doc.is_image);
              const regularDocs = message.documents.filter(doc => !doc.is_image);
              
              return (
                <>
                  {/* Display images */}
                  {images.length > 0 && (
                    <div className={clsx(
                      "gap-3",
                      images.length === 1 ? "flex justify-start" : "grid grid-cols-2 max-w-md"
                    )}>
                      {images.map((doc) => (
                        <ImageDisplay
                          key={doc.id}
                          document={doc}
                          size={images.length === 1 ? "md" : "sm"}
                          className="rounded-lg shadow-sm"
                        />
                      ))}
                    </div>
                  )}

                  {/* Display regular documents */}
                  {regularDocs.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {regularDocs.map((doc) => (
                        <DocumentBadge
                          key={doc.id}
                          document={doc}
                          size="sm"
                        />
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Message Actions Row */}
        <div className={clsx(
          'flex items-center gap-3 mt-2 text-xs text-text-muted transition-opacity',
          isUser ? 'justify-end' : 'justify-start'
        )}>
          {/* Model name for assistant messages */}
          {isAssistant && message.model_used && !isStreaming && (
            <span className="text-purple-light">
              {message.model_used.replace('openai/', '').replace('anthropic/', '')}
            </span>
          )}
          
                     {/* Streaming indicator */}
           {isStreaming && (
             <span className="text-green-accent flex items-center gap-1">
               <div className="w-2 h-2 bg-green-accent rounded-full animate-pulse"></div>
             </span>
           )}

          {/* Action buttons - only show on hover and when not streaming */}
          {!isStreaming && (
            <>
              {/* Branch conversation button */}
              <button
                onClick={handleBranchFromHere}
                disabled={isBranching}
                className="opacity-0 group-hover:opacity-100 hover:bg-green-500/10 hover:text-green-400 transition-all duration-200 flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium"
                title="Branch conversation from here"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {isBranching ? 'Branching...' : 'Branch'}
              </button>

              {/* Edit button for user messages */}
              {isUser && (
                <button
                  onClick={startEditing}
                  className="opacity-0 group-hover:opacity-100 hover:bg-blue-500/10 hover:text-blue-400 transition-all duration-200 flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium"
                  title="Edit message"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              )}

              {/* Retry button for assistant messages */}
              {isAssistant && (
                <button
                  onClick={handleRetryMessage}
                  disabled={isRetrying}
                  className="opacity-0 group-hover:opacity-100 hover:bg-purple-500/10 hover:text-purple-400 transition-all duration-200 flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium disabled:opacity-50"
                  title="Retry this response"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {isRetrying ? 'Retrying...' : 'Retry'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
} 