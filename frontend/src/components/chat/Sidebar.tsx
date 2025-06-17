/**
 * Sidebar Component
 * Contains user info, new chat button, and conversation list
 */

'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { ConversationList } from './ConversationList';

interface SidebarProps {
  onClose?: () => void;
  onNewChat?: () => void;
  selectedConversationId?: string;
  onConversationSelect?: (conversationId: string) => void;
}

const SCROLL_STORAGE_KEY = 'sidebar-scroll-position';

export function Sidebar({ 
  onClose, 
  onNewChat,
  selectedConversationId,
  onConversationSelect
}: SidebarProps) {
  const { user, signOut } = useAuth();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isRestoringScroll = useRef(false);

  // Save scroll position to sessionStorage on scroll
  const saveScrollPosition = useCallback(() => {
    if (scrollContainerRef.current && !isRestoringScroll.current) {
      const scrollTop = scrollContainerRef.current.scrollTop;
      sessionStorage.setItem(SCROLL_STORAGE_KEY, scrollTop.toString());
    }
  }, []);

  // Save scroll position before conversation selection
  const handleConversationSelect = useCallback((conversationId: string) => {
    saveScrollPosition();
    onConversationSelect?.(conversationId);
  }, [onConversationSelect, saveScrollPosition]);

  // Restore scroll position when component mounts or re-mounts
  useEffect(() => {
    const restoreScrollPosition = () => {
      if (scrollContainerRef.current) {
        const savedPosition = sessionStorage.getItem(SCROLL_STORAGE_KEY);
        if (savedPosition) {
          isRestoringScroll.current = true;
          scrollContainerRef.current.scrollTop = parseInt(savedPosition, 10);
          
          // Reset the flag after a short delay
          setTimeout(() => {
            isRestoringScroll.current = false;
          }, 100);
        }
      }
    };

    // Restore immediately if DOM is ready
    restoreScrollPosition();
    
    // Also restore after a short delay in case conversations are still loading
    const timeoutId = setTimeout(restoreScrollPosition, 100);
    
    return () => clearTimeout(timeoutId);
  }, []); // Only run on mount

  // Add scroll event listener to continuously save position
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Throttle scroll saves to avoid too frequent storage writes
    let scrollTimeout: NodeJS.Timeout;
    const throttledSave = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(saveScrollPosition, 150);
    };

    container.addEventListener('scroll', throttledSave, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', throttledSave);
      clearTimeout(scrollTimeout);
    };
  }, [saveScrollPosition]);

  const handleNewChat = useCallback(() => {
    onNewChat?.();
    onClose?.();
  }, [onNewChat, onClose]);

  return (
    <div className="h-screen flex flex-col max-h-screen bg-sidebar-bg">
      {/* Header */}
      <div className="p-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-text-primary">T3.chat</h1>
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="p-1 text-text-muted hover:text-text-primary transition-colors md:hidden"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* New Chat Button */}
        <Button 
          onClick={handleNewChat}
          className="w-full"
          variant="primary"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </Button>
      </div>

      {/* Conversation List - Scrollable */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto min-h-0 max-h-full scrollbar-hide"
      >
        <div className="p-2">
          <h2 className="text-xs font-medium text-text-muted uppercase tracking-wider px-3 py-2 mb-2 sticky top-0 bg-sidebar-bg z-10">
            Recent Conversations
          </h2>
          <div className="space-y-1">
            <ConversationList 
              selectedConversationId={selectedConversationId}
              onConversationSelect={handleConversationSelect}
            />
          </div>
        </div>
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            {/* Avatar */}
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground text-sm font-medium">
                {user?.user_metadata?.name?.[0]?.toUpperCase() || 
                 user?.email?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            
            {/* User info */}
            <div className="min-w-0 flex-1">
              <p className="text-text-primary text-sm font-medium truncate">
                {user?.user_metadata?.name || 'User'}
              </p>
              <p className="text-text-muted text-xs truncate">
                {user?.email}
              </p>
            </div>
          </div>

          {/* Settings dropdown */}
          <div className="relative">
            <button
              onClick={() => signOut()}
              className="p-1 text-text-muted hover:text-text-primary transition-colors rounded hover:bg-muted"
              title="Sign out"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 