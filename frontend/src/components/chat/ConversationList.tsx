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
  const titleRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!title) {
      setDisplayText('New Conversation');
      setIsStreaming(false);
      return;
    }

    if (isNew) {
      // Streaming animation for new titles
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

      return () => clearInterval(streamInterval);
    } else {
      // No animation for existing titles
      setDisplayText(title);
      setIsStreaming(false);
    }
  }, [title, isNew]);

  // Calculate precise scroll distance
  const calculateScrollDistance = () => {
    if (titleRef.current && textRef.current) {
      const containerWidth = titleRef.current.clientWidth;
      const textWidth = textRef.current.scrollWidth;
      const distance = Math.max(0, textWidth - containerWidth + 10); // +10px for padding
      setScrollDistance(distance);
      return distance > 0;
    }
    return false;
  };

  // Check if text is truncated and calculate scroll distance
  const checkTruncation = () => {
    return calculateScrollDistance();
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    // Only start scrolling if not already scrolling and text is truncated
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
        'streaming-title font-medium text-sm transition-colors duration-200 w-full overflow-hidden flex-1 mr-2',
        isSelected ? 'text-white' : 'text-zinc-200 group-hover:text-white',
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={textRef}
        className={clsx(
          'whitespace-nowrap transition-transform duration-1000 ease-linear',
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
        {isStreaming && <span className="streaming-cursor" />}
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

  // Note: Auto-selection is now handled by routing in the main pages

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (confirm('Are you sure you want to delete this conversation?')) {
      await deleteConversation(conversationId);
      // The parent component will handle navigation if needed
    }
  };

  if (loading) {
    return (
      <div className="p-2 text-center">
        <div className="text-zinc-400 text-sm">Loading conversations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-2 text-center">
        <div className="text-red-400 text-sm">
          Error loading conversations: {error}
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-2 text-center">
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
    <div className="space-y-1">
      {conversations.map((conversation) => (
        <div
          key={conversation.id}
          className={clsx(
            'conversation-card relative p-3 rounded-lg group cursor-pointer animate-slide-in-up',
            selectedConversationId === conversation.id
              ? 'selected bg-[#2d2d2d] border border-[#8b5cf6]/30'
              : 'hover:bg-[#262626] border border-transparent'
          )}
          onClick={() => onConversationSelect?.(conversation.id)}
        >
          <div className="flex items-center">
            {conversation.title?.startsWith('Branch from ') && (
              <svg className="w-3 h-3 text-[#8b5cf6] mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
            
            <StreamingTitle
              title={conversation.title || 'New Conversation'}
              isNew={newConversationIds.has(conversation.id)}
              isSelected={selectedConversationId === conversation.id}
            />
            
            {/* Modern delete button with trash icon */}
            <button
              onClick={(e) => handleDeleteConversation(conversation.id, e)}
              className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-all duration-200 flex-shrink-0"
              title="Delete conversation"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
} 