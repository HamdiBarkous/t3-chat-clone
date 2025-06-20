/**
 * Reasoning Display Component
 * Shows AI reasoning content with basic collapse functionality
 */

'use client';

import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';

interface ReasoningDisplayProps {
  reasoning: string;
  isStreaming?: boolean;
  startTime?: number;
}

export function ReasoningDisplay({ 
  reasoning, 
  isStreaming = false, 
  startTime
}: ReasoningDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [elapsedTime, setElapsedTime] = useState<number | null>(null);

  // Calculate elapsed time for display
  useEffect(() => {
    if (isStreaming && startTime) {
      const interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 500); // Update every 500ms
      
      return () => clearInterval(interval);
    } else if (!isStreaming && startTime) {
      // Set final time when streaming ends
      setElapsedTime(Date.now() - startTime);
    }
  }, [isStreaming, startTime]);

  // Don't render if no reasoning content
  if (!reasoning && !isStreaming) {
    return null;
  }

  const formatTime = (ms: number) => {
    const seconds = ms / 1000;
    return seconds < 1 ? `${Math.round(ms)}ms` : `${seconds.toFixed(1)}s`;
  };

  return (
    <div className="mb-4">
      {/* Reasoning Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-muted/30 border-l-4 border-blue-500 rounded-r hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className="text-sm font-medium text-blue-400">
            {isStreaming ? 'Thinking...' : 'Reasoning'}
          </span>
          {elapsedTime && (
            <span className="text-xs text-text-muted">
              ({formatTime(elapsedTime)})
            </span>
          )}
        </div>
        
        <svg 
          className={clsx(
            "w-4 h-4 text-text-muted transition-transform",
            isExpanded ? "rotate-180" : ""
          )} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {/* Reasoning Content */}
      {isExpanded && (
        <div className="bg-muted/20 border-l-4 border-blue-500/30 rounded-br p-3 mt-1">
          <div className="text-sm text-text-muted whitespace-pre-wrap font-mono">
            {reasoning || (isStreaming && 'Starting to think...')}
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-blue-400 ml-1 animate-pulse"></span>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 