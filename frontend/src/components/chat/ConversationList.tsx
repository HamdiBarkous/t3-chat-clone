/**
 * Conversation List Component
 * Displays the list of user conversations with selection handling and visual grouping
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { useConversations } from '@/contexts/ConversationsContext';
import { ConversationSkeleton } from '@/components/ui/Skeleton';
import type { ConversationListItem } from '@/types/api';

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
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl shadow-black/50 p-6 w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-destructive/10 rounded-full border border-destructive/20">
          <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {title}
          </h3>
          <p className="text-sm text-text-muted leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-text-muted bg-muted hover:bg-muted/80 border border-border rounded-lg transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-card"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={clsx(
              'flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-card',
              isDestructive
                ? 'text-destructive-foreground bg-destructive hover:bg-destructive/80 focus:ring-destructive shadow-lg shadow-destructive/20'
                : 'text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-primary shadow-lg shadow-primary/20'
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
    if (!hasStartedScrolling && checkTruncation()) {
      const timeout = setTimeout(() => {
        setIsScrolling(true);
        setHasStartedScrolling(true);
      }, 500); // 500ms delay before starting scroll
      
      scrollTimeoutRef.current = timeout;
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

  // Set CSS custom property for scroll distance
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.setProperty('--scroll-distance', `${scrollDistance}px`);
    }
  }, [scrollDistance]);

  const finalTitle = displayText || title || 'New Conversation';

  return (
    <div 
      ref={titleRef}
      className={clsx(
        'flex-1 min-w-0 relative overflow-hidden',
        className
      )}
      style={{ width: '180px' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        ref={textRef}
        className={clsx(
          'whitespace-nowrap transition-transform duration-[6000ms] ease-linear text-sm font-medium',
          isSelected ? 'text-text-primary' : 'text-text-secondary',
          isScrolling && hasStartedScrolling && isHovered && 'animate-scroll-text'
        )}
      >
        {finalTitle}
        {isStreaming && (
          <span className="streaming-cursor animate-pulse-gentle" />
        )}
      </div>
    </div>
  );
}

// Group conversations by their root conversation
function groupConversations(conversations: ConversationListItem[]): ConversationListItem[][] {
  const groups: Map<string, ConversationListItem[]> = new Map();
  
  conversations.forEach(conversation => {
    const groupKey = conversation.root_conversation_id || conversation.id;
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(conversation);
  });
  
  // Sort each group: original first, then by branch_order
  for (const group of groups.values()) {
    group.sort((a, b) => {
      if (a.branch_type === 'original' && b.branch_type !== 'original') return -1;
      if (b.branch_type === 'original' && a.branch_type !== 'original') return 1;
      return (a.branch_order || 0) - (b.branch_order || 0);
    });
  }
  
  // Convert to array and sort by group_order
  return Array.from(groups.values()).sort((a, b) => {
    const aOrder = a[0]?.group_order || 0;
    const bOrder = b[0]?.group_order || 0;
    return aOrder - bOrder;
  });
}

function getBranchIcon(branchType?: string) {
  switch (branchType) {
    case 'edit':
      return (
        <svg className="w-3 h-3 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      );
    case 'retry':
      return (
        <svg className="w-3 h-3 text-green-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      );
    case 'branch':
    default:
      return (
                  <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
  }
}

export function ConversationList({ 
  selectedConversationId,
  onConversationSelect 
}: ConversationListProps) {
  const { conversations, loading, loadingMore, hasMore, error, deleteConversation, loadMoreConversations } = useConversations();
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
      <div className="space-y-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <ConversationSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div className="text-destructive text-sm font-medium mb-1">Connection Error</div>
        <div className="text-text-muted text-xs">{error}</div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="relative mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl mx-auto mb-4 flex items-center justify-center border border-primary/20">
            <svg className="w-8 h-8 text-primary opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
              <svg className="w-2 h-2 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
        </div>
        <div className="text-text-primary text-sm font-medium mb-1">No conversations yet</div>
        <div className="text-text-muted text-xs leading-relaxed">
          Start your first conversation<br />
          and it will appear here
        </div>
      </div>
    );
  }

  // Group conversations by their relationships
  const conversationGroups = groupConversations(conversations);

  return (
    <>
      <div className="space-y-2 px-1">
        {conversationGroups.map((group, groupIndex) => (
          <div key={group[0].root_conversation_id || group[0].id} className="space-y-1">
            {group.map((conversation, index) => {
              const isOriginal = conversation.branch_type === 'original' || !conversation.branch_type;
              const isBranch = !isOriginal;
              
              return (
                <div
                  key={conversation.id}
                  className={clsx(
                    'conversation-card relative rounded-xl group cursor-pointer',
                    'transition-all duration-300 ease-out transform-gpu',
                    'hover:shadow-lg hover:shadow-black/10 hover:-translate-y-0.5',
                    selectedConversationId === conversation.id
                      ? 'selected bg-secondary border border-border'
                      : 'hover:bg-gradient-to-r hover:from-muted hover:to-muted/80 border border-transparent',
                    'animate-in fade-in-0',
                    isBranch && 'ml-6 relative before:absolute before:left-[-24px] before:top-1/2 before:w-4 before:h-px before:bg-border before:transform before:-translate-y-1/2',
                    isBranch && index > 0 && 'before:content-[""] before:absolute before:left-[-24px] before:top-0 before:w-px before:h-1/2 before:bg-border'
                  )}
                  onClick={() => onConversationSelect?.(conversation.id)}
                >

                  
                  <div className="relative p-3.5 flex items-center">
                    {/* Branch indicator with enhanced styling */}
                    {isBranch && (
                      <div className="flex items-center mr-3 flex-shrink-0">
                        <div className="w-5 h-5 bg-muted/50 rounded-lg flex items-center justify-center border border-border/50">
                          {getBranchIcon(conversation.branch_type)}
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
                        'text-text-muted hover:text-destructive hover:bg-destructive/10 hover:scale-110',
                        'focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-destructive/50'
                      )}
                      title="Delete conversation"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-destructive/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-300" />
                      <svg className="w-4 h-4 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* New conversation indicator */}
                  {newConversationIds.has(conversation.id) && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse-gentle">
                      <div className="absolute inset-0 bg-primary rounded-full animate-ping" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="px-1 mt-2">
          <button
            onClick={loadMoreConversations}
            disabled={loadingMore}
            className={clsx(
              'w-full p-3 rounded-xl border border-dashed border-border transition-all duration-200',
              'text-sm font-medium text-text-muted hover:text-text-primary',
              'hover:border-border/80 hover:bg-muted/50',
              'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              loadingMore && 'bg-muted/30'
            )}
          >
            {loadingMore ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Loading more...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Load more conversations</span>
              </div>
            )}
          </button>
        </div>
      )}

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