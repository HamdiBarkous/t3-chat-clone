/**
 * Empty State Component
 * Displays when no conversation is selected with a clean, minimal interface
 */

'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { clsx } from 'clsx';

interface EmptyStateProps {
  onNewChat?: () => void;
  className?: string;
  variant?: 'conversations' | 'chat' | 'welcome';
}

export function EmptyState({ onNewChat, className, variant = 'chat' }: EmptyStateProps) {
  const { user } = useAuth();

  if (variant === 'conversations') {
    return (
      <div className={clsx('relative flex flex-col items-center justify-center p-8', className)}>
        {/* Floating particles background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-[#8b5cf6]/20 rounded-full animate-float [animation-delay:0s]" />
          <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-[#7c3aed]/30 rounded-full animate-float [animation-delay:1s]" />
          <div className="absolute bottom-1/3 left-1/2 w-1 h-1 bg-[#8b5cf6]/40 rounded-full animate-float [animation-delay:2s]" />
          <div className="absolute top-1/2 right-1/4 w-2.5 h-2.5 bg-[#7c3aed]/15 rounded-full animate-float [animation-delay:1.5s]" />
        </div>

        {/* Main content */}
        <div className="relative z-10 text-center">
          {/* Enhanced icon with gradient background */}
          <div className="relative mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-[#8b5cf6]/30 via-[#7c3aed]/25 to-[#6d28d9]/20 rounded-3xl mx-auto flex items-center justify-center border border-[#8b5cf6]/30 shadow-lg shadow-[#8b5cf6]/10 backdrop-blur-sm">
              <svg className="w-10 h-10 text-[#8b5cf6] drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              
              {/* Glowing pulse effect */}
              <div className="absolute inset-0 bg-[#8b5cf6]/20 rounded-3xl animate-pulse-gentle opacity-50" />
              
              {/* Plus indicator */}
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] rounded-full flex items-center justify-center shadow-lg shadow-[#8b5cf6]/30 border-2 border-[#0a0a0a]">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
          </div>

          {/* Typography with gradient accent */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-zinc-100 tracking-tight">
              No conversations yet
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-sm mx-auto">
              Your conversations will appear here once you start chatting. 
              <span className="block mt-1 text-[#8b5cf6]/80 font-medium">
                Create your first conversation to begin
              </span>
            </p>
          </div>

          {/* Decorative element */}
          <div className="mt-6 flex items-center justify-center space-x-1 opacity-40">
            <div className="w-1 h-1 bg-[#8b5cf6] rounded-full animate-pulse [animation-delay:0s]" />
            <div className="w-1 h-1 bg-[#7c3aed] rounded-full animate-pulse [animation-delay:0.5s]" />
            <div className="w-1 h-1 bg-[#8b5cf6] rounded-full animate-pulse [animation-delay:1s]" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'welcome') {
    return (
      <div className={clsx('relative flex flex-col items-center justify-center p-12', className)}>
        {/* Background gradient mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#8b5cf6]/5 via-transparent to-[#7c3aed]/5 rounded-2xl" />
        
        {/* Floating elements */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-[#8b5cf6]/5 rounded-full blur-3xl animate-float [animation-delay:0s]" />
          <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-[#7c3aed]/5 rounded-full blur-2xl animate-float [animation-delay:2s]" />
        </div>

        <div className="relative z-10 text-center">
          {/* Welcome icon */}
          <div className="mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-[#8b5cf6]/20 to-[#7c3aed]/15 rounded-full mx-auto flex items-center justify-center border border-[#8b5cf6]/20 shadow-2xl shadow-[#8b5cf6]/10">
              <svg className="w-12 h-12 text-[#8b5cf6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-zinc-100 mb-3 tracking-tight">
            Welcome to T3.chat
          </h2>
          <p className="text-zinc-400 text-base leading-relaxed max-w-md mx-auto">
            Start a conversation with our AI assistant. Ask questions, get help with coding, 
            or just have a friendly chat.
          </p>
        </div>
      </div>
    );
  }

  // Default chat empty state
  return (
    <div className={clsx('relative flex flex-col items-center justify-center p-12 text-center', className)}>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-2 h-2 bg-[#8b5cf6]/30 rounded-full animate-float [animation-delay:0s] blur-sm" />
        <div className="absolute top-1/4 right-1/4 w-1.5 h-1.5 bg-[#7c3aed]/40 rounded-full animate-float [animation-delay:1.5s] blur-sm" />
        <div className="absolute bottom-1/2 left-1/4 w-3 h-3 bg-[#8b5cf6]/20 rounded-full animate-float [animation-delay:2.5s] blur-sm" />
      </div>

      <div className="relative z-10">
        {/* Chat bubble illustration */}
        <div className="mb-8">
          <div className="relative">
            {/* Main chat bubble */}
            <div className="w-16 h-16 bg-gradient-to-br from-[#8b5cf6]/25 to-[#7c3aed]/20 rounded-2xl mx-auto flex items-center justify-center border border-[#8b5cf6]/30 shadow-lg shadow-[#8b5cf6]/10 backdrop-blur-sm">
              <svg className="w-8 h-8 text-[#8b5cf6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            
            {/* Smaller bubbles */}
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#8b5cf6]/30 rounded-lg animate-pulse-gentle [animation-delay:0.5s]" />
            <div className="absolute -bottom-1 -left-3 w-4 h-4 bg-[#7c3aed]/25 rounded-lg animate-pulse-gentle [animation-delay:1s]" />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-zinc-100 tracking-tight">
            Start a conversation
          </h3>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-sm mx-auto">
            Type your message below to begin chatting with the AI assistant.
            <span className="block mt-2 text-[#8b5cf6]/80 text-xs font-medium">
              Your conversation will be saved automatically
            </span>
          </p>
        </div>

        {/* Animated typing indicator */}
        <div className="mt-8 flex items-center justify-center space-x-1">
          <div className="text-[#8b5cf6]/60 text-xs font-medium mr-2">Ready to chat</div>
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-[#8b5cf6] rounded-full animate-bounce [animation-delay:0s]" />
            <div className="w-1 h-1 bg-[#8b5cf6] rounded-full animate-bounce [animation-delay:0.2s]" />
            <div className="w-1 h-1 bg-[#8b5cf6] rounded-full animate-bounce [animation-delay:0.4s]" />
          </div>
        </div>
      </div>
    </div>
  );
} 