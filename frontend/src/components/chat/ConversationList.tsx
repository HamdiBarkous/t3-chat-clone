/**
 * Conversation List Component
 * Displays the list of user conversations with selection handling
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { useConversations } from '@/contexts/ConversationsContext';

interface ConversationListProps {
  selectedConversationId?: string;
  onConversationSelect?: (conversationId: string) => void;
}

// Modern confirmation modal component
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isDestructive = false
}: ConfirmationModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[#1e1e1e] border border-zinc-700 rounded-2xl shadow-2xl shadow-black/50 p-6 w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-500/10 rounded-full border border-red-500/20">
          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-zinc-100 mb-2">
            {title}
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-lg transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-[#1e1e1e]"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={clsx(
              'flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1e1e1e]',
              isDestructive
                ? 'text-white bg-red-500 hover:bg-red-600 focus:ring-red-500 shadow-lg shadow-red-500/20'
                : 'text-white bg-[#8b5cf6] hover:bg-[#7c3aed] focus:ring-[#8b5cf6] shadow-lg shadow-[#8b5cf6]/20'
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

interface StreamingTitleProps {
  title: string;
  isNew?: boolean;
  isSelected?: boolean;
  className?: string;
}

function StreamingTitle({ title, isNew = false, isSelected = false, className }: StreamingTitleProps) {
  const [displayText, setDisplayText] = useState('');
  const [isStreaming, setIsStreaming] = useState(isNew);
  const [isHovered, setIsHovered] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [hasStartedScrolling, setHasStartedScrolling] = useState(false);
  const [scrollDistance, setScrollDistance] = useState(0);
  const [previousTitle, setPreviousTitle] = useState(title);
  const titleRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!title) {
      setDisplayText('New Conversation');
      setIsStreaming(false);
      setPreviousTitle('');
      return;
    }

    // Check if title has changed (for AI-generated titles)
    const titleChanged = previousTitle !== title && previousTitle !== '' && title !== 'New Conversation';
    const shouldStream = isNew || titleChanged;

    if (shouldStream) {
      // Streaming animation for new or changed titles
      setDisplayText('');
      setIsStreaming(true);
      
      let currentIndex = 0;
      const streamInterval = setInterval(() => {
        if (currentIndex <= title.length) {
          setDisplayText(title.slice(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(streamInterval);
          setIsStreaming(false);
        }
      }, 50); // 50ms per character for smooth streaming

      setPreviousTitle(title);
      return () => clearInterval(streamInterval);
    } else {
      // No animation for existing titles
      setDisplayText(title);
      setIsStreaming(false);
      setPreviousTitle(title);
    }
  }, [title, isNew, previousTitle]);

  // Calculate precise scroll distance
  const calculateScrollDistance = () => {
    if (titleRef.current && textRef.current) {
      const containerWidth = titleRef.current.clientWidth;
      const textWidth = textRef.current.scrollWidth;
      
      // Check if text is truncated (text width exceeds container width)
      const isTruncated = textWidth > containerWidth;
      
      if (isTruncated) {
        // Calculate exact distance needed to show the last character
        // Add a small buffer (5px) to ensure the last character is fully visible
        const distance = textWidth - containerWidth + 5;
        setScrollDistance(distance);
        return true;
      } else {
        // Text fits completely, no scroll needed
        setScrollDistance(0);
        return false;
      }
    }
    return false;
  };

  // Check if text is truncated and calculate scroll distance
  const checkTruncation = () => {
    return calculateScrollDistance();
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    // Only start scrolling if not already scrolling and text is actually truncated
    if (checkTruncation() && !isStreaming && !isScrolling && !hasStartedScrolling) {
      setIsScrolling(true);
      setHasStartedScrolling(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsScrolling(false);
    setHasStartedScrolling(false);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
  };

  // Reset scrolling state when animation completes
  useEffect(() => {
    if (isScrolling) {
      const timeout = setTimeout(() => {
        setHasStartedScrolling(false);
      }, 6000); // Match the animation duration
      
      scrollTimeoutRef.current = timeout;
      return () => {
        if (timeout) clearTimeout(timeout);
      };
    }
  }, [isScrolling]);

  const finalTitle = displayText || 'New Conversation';

  return (
    <div
      ref={titleRef}
      className={clsx(
        'streaming-title font-medium text-sm transition-all duration-300 w-full overflow-hidden flex-1 mr-3',
        isSelected 
          ? 'text-white' 
          : 'text-zinc-200 group-hover:text-white',
        isStreaming && 'text-[#8b5cf6]',
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={textRef}
        className={clsx(
          'whitespace-nowrap transition-transform duration-1000 ease-linear relative',
          isScrolling && 'animate-scroll-text-fast'
        )}
        style={{
          transform: isScrolling 
            ? `translateX(-${scrollDistance}px)` 
            : 'translateX(0)',
          '--scroll-distance': `-${scrollDistance}px`
        } as React.CSSProperties}
      >
        {finalTitle}
        {isStreaming && (
          <span className="streaming-cursor animate-pulse-gentle" />
        )}
      </div>
    </div>
  );
}

export function ConversationList({ 
  selectedConversationId,
  onConversationSelect 
}: ConversationListProps) {
  const { conversations, loading, error, deleteConversation } = useConversations();
  const [newConversationIds, setNewConversationIds] = useState<Set<string>>(new Set());
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    conversationId: string;
    title: string;
  }>({
    isOpen: false,
    conversationId: '',
    title: ''
  });

  // Track new conversations for streaming animation
  useEffect(() => {
    const newIds = new Set<string>();
    conversations.forEach(conv => {
      if (conv.created_at) {
        const createdTime = new Date(conv.created_at).getTime();
        const now = Date.now();
        // Consider conversations created in the last 5 seconds as "new"
        if (now - createdTime < 5000) {
          newIds.add(conv.id);
        }
      }
    });
    setNewConversationIds(newIds);

    // Clear the "new" status after animation completes
    if (newIds.size > 0) {
      const timeout = setTimeout(() => {
        setNewConversationIds(new Set());
      }, 3000); // Clear after 3 seconds
      return () => clearTimeout(timeout);
    }
  }, [conversations]);

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const conversation = conversations.find(c => c.id === conversationId);
    setDeleteModal({
      isOpen: true,
      conversationId,
      title: conversation?.title || 'New Conversation'
    });
  };

  const confirmDelete = async () => {
    if (deleteModal.conversationId) {
      await deleteConversation(deleteModal.conversationId);
    }
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      conversationId: '',
      title: ''
    });
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="flex items-center justify-center space-x-2 mb-3">
          <div className="w-2 h-2 bg-[#8b5cf6] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-[#8b5cf6] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-[#8b5cf6] rounded-full animate-bounce"></div>
        </div>
        <div className="text-zinc-400 text-sm font-medium">Loading conversations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div className="text-red-400 text-sm font-medium mb-1">Connection Error</div>
        <div className="text-zinc-500 text-xs">{error}</div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="relative mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#8b5cf6]/20 to-[#7c3aed]/20 rounded-2xl mx-auto mb-4 flex items-center justify-center border border-[#8b5cf6]/20">
            <svg className="w-8 h-8 text-[#8b5cf6] opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#8b5cf6] rounded-full flex items-center justify-center">
              <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
        </div>
        <div className="text-zinc-300 text-sm font-medium mb-1">No conversations yet</div>
        <div className="text-zinc-500 text-xs leading-relaxed">
          Start your first conversation<br />
          and it will appear here
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1.5 px-1">
        {conversations.map((conversation, index) => (
          <div
            key={conversation.id}
            className={clsx(
              'conversation-card relative rounded-xl group cursor-pointer',
              'transition-all duration-300 ease-out transform-gpu',
              'hover:shadow-lg hover:shadow-black/10 hover:-translate-y-0.5',
              selectedConversationId === conversation.id
                ? 'selected bg-gradient-to-r from-[#8b5cf6]/15 to-[#7c3aed]/10 border border-[#8b5cf6]/30 shadow-lg shadow-[#8b5cf6]/10 translate-y-0'
                : 'hover:bg-gradient-to-r hover:from-[#262626] hover:to-[#2a2a2a] border border-transparent',
              newConversationIds.has(conversation.id) && 'animate-slide-in-up-stagger'
            )}
            onClick={() => onConversationSelect?.(conversation.id)}
            style={{
              animationDelay: newConversationIds.has(conversation.id) ? `${index * 100}ms` : '0ms'
            }}
          >
            {/* Subtle gradient overlay for selected state */}
            {selectedConversationId === conversation.id && (
              <div className="absolute inset-0 bg-gradient-to-r from-[#8b5cf6]/5 to-transparent rounded-xl pointer-events-none" />
            )}
            
            <div className="relative p-3.5 flex items-center">
              {/* Branch indicator with enhanced styling */}
              {conversation.title?.startsWith('Branch from ') && (
                <div className="flex items-center mr-3 flex-shrink-0">
                  <div className="w-5 h-5 bg-[#8b5cf6]/20 rounded-lg flex items-center justify-center border border-[#8b5cf6]/30">
                    <svg className="w-2.5 h-2.5 text-[#8b5cf6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              )}
              
              <StreamingTitle
                title={conversation.title || 'New Conversation'}
                isNew={newConversationIds.has(conversation.id)}
                isSelected={selectedConversationId === conversation.id}
              />
              
              {/* Enhanced delete button */}
              <button
                onClick={(e) => handleDeleteConversation(conversation.id, e)}
                className={clsx(
                  'opacity-0 group-hover:opacity-100 p-2 rounded-lg transition-all duration-200 flex-shrink-0 relative overflow-hidden',
                  'text-zinc-400 hover:text-red-400 hover:bg-red-400/10 hover:scale-110',
                  'focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-400/50'
                )}
                title="Delete conversation"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-400/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-300" />
                <svg className="w-4 h-4 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            {/* New conversation indicator */}
            {newConversationIds.has(conversation.id) && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#8b5cf6] rounded-full animate-pulse-gentle">
                <div className="absolute inset-0 bg-[#8b5cf6] rounded-full animate-ping" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modern Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        title="Delete Conversation"
        message={`Are you sure you want to delete "${deleteModal.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
      />
    </>
  );
} 