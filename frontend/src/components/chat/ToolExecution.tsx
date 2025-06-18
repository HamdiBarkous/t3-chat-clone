/**
 * Tool Execution Component
 * Displays tool calls and results in a nested, expandable interface
 */

'use client';

import React, { useState } from 'react';
import { clsx } from 'clsx';

// Tool execution state types
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  status: 'executing' | 'completed' | 'failed';
  result?: string;
  error?: string;
  startTime: number;
  endTime?: number;
  summary?: string;
}

interface ToolExecutionProps {
  tools: ToolCall[];
  className?: string;
}

export function ToolExecution({ tools, className }: ToolExecutionProps) {
  if (tools.length === 0) return null;

  return (
    <div className={clsx(
      'my-3 border border-border rounded-lg bg-card overflow-hidden',
      className
    )}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-secondary">
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-primary">🔧</span>
            <span className="font-medium text-text-primary">Tool Execution</span>
          </div>
          <div className="text-text-muted">
            {tools.length} tool{tools.length > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Tool Cards */}
      <div className="divide-y divide-border">
        {tools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </div>
  );
}

interface ToolCardProps {
  tool: ToolCall;
}

function ToolCard({ tool }: ToolCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusIcon = () => {
    switch (tool.status) {
      case 'executing':
        return <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />;
      case 'completed':
        return <span className="text-green-accent">✅</span>;
      case 'failed':
        return <span className="text-destructive">❌</span>;
      default:
        return <span className="text-text-muted">⏳</span>;
    }
  };

  const getToolIcon = (toolName: string) => {
    if (toolName.includes('supabase') || toolName.includes('database')) return '📊';
    if (toolName.includes('search')) return '🔍';
    if (toolName.includes('list')) return '📋';
    return '🛠️';
  };

  const getDuration = () => {
    if (!tool.endTime) return null;
    const duration = (tool.endTime - tool.startTime) / 1000;
    return `${duration.toFixed(1)}s`;
  };

  const formatToolName = (name: string) => {
    return name.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const generateSummary = () => {
    if (tool.summary) return tool.summary;
    if (tool.status === 'executing') return 'Executing...';
    if (tool.status === 'failed') return tool.error || 'Execution failed';
    if (tool.result) {
      // Try to generate a smart summary from the result
      const resultStr = tool.result.toString();
      if (resultStr.length > 100) {
        return `Returned ${resultStr.length} characters of data`;
      }
      return 'Completed successfully';
    }
    return 'Completed';
  };

  return (
    <div className="p-4">
      {/* Tool Card Header */}
      <div 
        className="flex items-center justify-between cursor-pointer group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 flex-1">
          <span className="text-lg">{getToolIcon(tool.name)}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-text-primary">
                {formatToolName(tool.name)}
              </h4>
              {getStatusIcon()}
              {getDuration() && (
                <span className="text-xs text-text-muted">({getDuration()})</span>
              )}
            </div>
            <p className="text-sm text-text-muted mt-1">
              {generateSummary()}
            </p>
          </div>
        </div>
        
        {/* Expand/Collapse Button */}
        <button className="p-1 rounded hover:bg-muted transition-colors">
          <svg 
            className={clsx(
              'w-4 h-4 text-text-muted transition-transform',
              isExpanded && 'rotate-180'
            )}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expandable Details */}
      {isExpanded && (
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          {/* Input Parameters */}
          {Object.keys(tool.arguments).length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
                📥 Input Parameters
              </h5>
              <div className="bg-code-bg border border-border rounded p-3">
                <pre className="text-sm text-text-secondary whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(tool.arguments, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Result/Error */}
          {(tool.result || tool.error) && (
            <div>
              <h5 className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
                {tool.error ? '❌ Error' : '📤 Output'}
              </h5>
              <div className="bg-code-bg border border-border rounded p-3 max-h-60 overflow-y-auto">
                <pre className={clsx(
                  'text-sm whitespace-pre-wrap overflow-x-auto',
                  tool.error ? 'text-destructive' : 'text-text-secondary'
                )}>
                  {tool.error || tool.result}
                </pre>
              </div>
            </div>
          )}

          {/* Copy Buttons */}
          <div className="flex gap-2">
            {Object.keys(tool.arguments).length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(JSON.stringify(tool.arguments, null, 2));
                }}
                className="px-3 py-1 text-xs bg-muted hover:bg-muted/80 text-text-secondary rounded transition-colors"
              >
                Copy Input
              </button>
            )}
            {(tool.result || tool.error) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(tool.error || tool.result || '');
                }}
                className="px-3 py-1 text-xs bg-muted hover:bg-muted/80 text-text-secondary rounded transition-colors"
              >
                Copy Output
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 