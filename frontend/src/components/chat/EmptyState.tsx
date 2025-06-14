/**
 * Empty State Component
 * Displays when no conversation is selected with quick action buttons
 */

'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface EmptyStateProps {
  onNewChat?: () => void;
}

export function EmptyState({ onNewChat }: EmptyStateProps) {
  const { user } = useAuth();

  const quickActions = [
    {
      title: 'Create',
      description: 'Generate content',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
    {
      title: 'Explore',
      description: 'Ask questions',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      title: 'Code',
      description: 'Programming help',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
    },
    {
      title: 'Learn',
      description: 'Educational content',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-2xl">
        {/* Welcome Message */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">
            How can I help you, {user?.user_metadata?.name || 'there'}?
          </h2>
          <p className="text-zinc-400 text-lg">
            Start a conversation with AI
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={onNewChat}
              className="p-4 bg-[#2d2d2d] hover:bg-[#3f3f46] rounded-lg text-left transition-colors group"
            >
              <div className="flex items-center mb-2 text-[#8b5cf6] group-hover:text-[#a78bfa]">
                {action.icon}
                <span className="ml-2 text-white font-medium">{action.title}</span>
              </div>
              <div className="text-zinc-400 text-sm">{action.description}</div>
            </button>
          ))}
        </div>

        {/* Suggested Prompts */}
        <div className="space-y-2">
          <p className="text-zinc-400 text-sm mb-3">Try asking:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              'How does AI work?',
              'Write a Python function',
              'Explain quantum computing',
              'What\'s the meaning of life?',
            ].map((prompt, index) => (
              <button
                key={index}
                onClick={onNewChat}
                className="px-3 py-1 text-sm bg-[#2d2d2d] hover:bg-[#3f3f46] text-zinc-300 hover:text-white rounded-full transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 