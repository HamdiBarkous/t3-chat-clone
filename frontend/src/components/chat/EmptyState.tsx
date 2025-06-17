/**
 * Empty State Component
 * Displays when no conversation is selected with a clean, minimal interface
 */

'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface EmptyStateProps {
  onNewChat?: () => void;
}

export function EmptyState({ onNewChat }: EmptyStateProps) {
  const { user } = useAuth();

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-2xl">
        {/* Welcome Message */}
        <div className="mb-12">
          <div className="mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
          </div>
          
          <h2 className="text-3xl font-semibold text-white mb-4">
            Welcome to T3.chat
          </h2>
          <p className="text-zinc-400 text-lg mb-8">
            {user?.user_metadata?.name ? 
              `Hi ${user.user_metadata.name}, ready to start a conversation?` : 
              'Ready to start a conversation with AI?'
            }
          </p>
          
          {/* Start Chat Button */}
          <button
            onClick={onNewChat}
            className="inline-flex items-center px-6 py-3 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-medium rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-[#8b5cf6]/25"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Start New Chat
          </button>
        </div>

        {/* Subtle feature hints */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto text-center">
          <div className="p-4">
            <div className="w-8 h-8 text-[#8b5cf6] mx-auto mb-2">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-white font-medium text-sm mb-1">Fast Responses</h3>
            <p className="text-zinc-500 text-xs">Get instant AI-powered answers</p>
          </div>
          
          <div className="p-4">
            <div className="w-8 h-8 text-[#8b5cf6] mx-auto mb-2">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-white font-medium text-sm mb-1">Conversations</h3>
            <p className="text-zinc-500 text-xs">Your chat history is saved</p>
          </div>
          
          <div className="p-4">
            <div className="w-8 h-8 text-[#8b5cf6] mx-auto mb-2">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-white font-medium text-sm mb-1">Smart AI</h3>
            <p className="text-zinc-500 text-xs">Advanced language models</p>
          </div>
        </div>
      </div>
    </div>
  );
} 