/**
 * Reasoning Display Component
 * Shows AI reasoning content with auto-collapse functionality
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';

interface ReasoningDisplayProps {
  reasoning: string;
  isStreaming?: boolean;
  streamingReasoning?: string;
  startTime?: number; // When reasoning started (for timing)
}

export function ReasoningDisplay({ 
  reasoning, 
  isStreaming = false, 
  streamingReasoning = '',
  startTime
}: ReasoningDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [thinkingTime, setThinkingTime] = useState<number | null>(null);
  const [finalThinkingTime, setFinalThinkingTime] = useState<number | null>(null);
  const autoCollapseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const thinkingTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedAutoCollapseRef = useRef(false);

  // Handle streaming time updates
  useEffect(() => {
    if (isStreaming && startTime) {
      // Reset state for new reasoning session
      setFinalThinkingTime(null);
      hasStartedAutoCollapseRef.current = false;
      setIsExpanded(true);
      
      // Clear any existing interval
      if (thinkingTimeIntervalRef.current) {
        clearInterval(thinkingTimeIntervalRef.current);
      }
      
      // Clear any existing auto-collapse timer
      if (autoCollapseTimeoutRef.current) {
        clearTimeout(autoCollapseTimeoutRef.current);
        autoCollapseTimeoutRef.current = null;
      }
      
      // Start live time updates during streaming
      const interval = setInterval(() => {
        const currentTime = (Date.now() - startTime) / 1000;
        setThinkingTime(currentTime);
      }, 100);
      thinkingTimeIntervalRef.current = interval;
      
      return () => {
        if (thinkingTimeIntervalRef.current) {
          clearInterval(thinkingTimeIntervalRef.current);
        }
      };
    }
  }, [isStreaming, startTime]);

  // Handle completion and auto-collapse
  useEffect(() => {
    if (!isStreaming && startTime && !hasStartedAutoCollapseRef.current) {
      // Calculate and store final thinking time
      const finalTime = (Date.now() - startTime) / 1000;
      setFinalThinkingTime(finalTime);
      setThinkingTime(finalTime);
      
      // Clear streaming interval
      if (thinkingTimeIntervalRef.current) {
        clearInterval(thinkingTimeIntervalRef.current);
        thinkingTimeIntervalRef.current = null;
      }
      
      // Start auto-collapse timer (3 seconds after completion)
      autoCollapseTimeoutRef.current = setTimeout(() => {
        setIsExpanded(false);
      }, 3000);
      
      hasStartedAutoCollapseRef.current = true;
    }
  }, [isStreaming, startTime]);

  // Reset state when component unmounts or reasoning changes
  useEffect(() => {
    return () => {
      if (autoCollapseTimeoutRef.current) {
        clearTimeout(autoCollapseTimeoutRef.current);
      }
      if (thinkingTimeIntervalRef.current) {
        clearInterval(thinkingTimeIntervalRef.current);
      }
    };
  }, []);

  // Clear auto-collapse if user manually interacts
  const handleToggle = () => {
    if (autoCollapseTimeoutRef.current) {
      clearTimeout(autoCollapseTimeoutRef.current);
      autoCollapseTimeoutRef.current = null;
    }
    setIsExpanded(!isExpanded);
  };

  const currentReasoning = isStreaming ? streamingReasoning : reasoning;
  
  // Don't render if no reasoning content
  if (!currentReasoning && !isStreaming) {
    return null;
  }

  const formatTime = (seconds: number) => {
    if (seconds < 1) {
      return `${Math.round(seconds * 1000)}ms`;
    }
    return `${seconds.toFixed(1)}s`;
  };

  // Use final time if available, otherwise current streaming time
  const displayTime = finalThinkingTime || thinkingTime;

  return (
    <div className="mb-4">
      {/* Reasoning Header - Always visible */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-3 bg-muted/30 border-l-4 border-blue-500 rounded-r hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className="text-sm font-medium text-blue-400">
            {isStreaming ? 'Thinking...' : 'Reasoning'}
          </span>
          {displayTime !== null && (
            <span className="text-xs text-text-muted">
              {isStreaming ? 'for' : 'thought for'} {formatTime(displayTime)}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Auto-collapse indicator */}
          {!isStreaming && isExpanded && autoCollapseTimeoutRef.current && (
            <span className="text-xs text-text-muted animate-pulse">
              auto-collapsing...
            </span>
          )}
          
          {/* Expand/Collapse Icon */}
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
        </div>
      </button>

      {/* Reasoning Content - Collapsible */}
      {isExpanded && (
        <div className="bg-muted/20 border-l-4 border-blue-500/30 rounded-br p-3 mt-1">
          <div className="text-sm text-text-muted whitespace-pre-wrap font-mono">
            {currentReasoning || (isStreaming && (
              <span className="animate-pulse">Starting to think...</span>
            ))}
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-blue-400 ml-1 animate-pulse"></span>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 