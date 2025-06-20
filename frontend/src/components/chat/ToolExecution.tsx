/**
 * Tool Execution Component - Creative Enhanced Version
 * Displays tool calls and results with engaging animations and visual feedback
 */

'use client';

import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';

// Tool execution state types
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
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
  isResponseGenerating?: boolean; // New prop to indicate AI is generating response
  autoCollapse?: boolean; // New prop to enable auto-collapse behavior
}

export function ToolExecution({ 
  tools, 
  className, 
  isResponseGenerating = false,
  autoCollapse = true 
}: ToolExecutionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Auto-collapse logic
  useEffect(() => {
    if (autoCollapse && !isResponseGenerating && tools.length > 0) {
      // Check if all tools are completed
      const allCompleted = tools.every(tool => 
        tool.status === 'completed' || tool.status === 'failed'
      );
      
      if (allCompleted) {
        // Auto-collapse after a delay
        const timer = setTimeout(() => {
          setIsCollapsed(true);
        }, 3000); // 3 second delay
        
        return () => clearTimeout(timer);
      }
    }
  }, [tools, isResponseGenerating, autoCollapse]);

  const completedCount = tools.filter(tool => tool.status === 'completed').length;
  const executingCount = tools.filter(tool => tool.status === 'executing').length;
  const failedCount = tools.filter(tool => tool.status === 'failed').length;
  const allToolsFinished = executingCount === 0 && tools.length > 0;

  // Auto-collapse when all tools are finished and AI response generation starts
  useEffect(() => {
    if (autoCollapse && allToolsFinished && isResponseGenerating) {
      setIsCollapsed(true);
    }
  }, [autoCollapse, allToolsFinished, isResponseGenerating]);
  
  if (!tools || tools.length === 0) {
    return null;
  }

  // Generate compact summary for collapsed view
  const generateCompactSummary = () => {
    const toolTypes = new Set();
    let totalDuration = 0;
    
    tools.forEach(tool => {
      // Categorize tools
      if (tool.name.includes('supabase')) toolTypes.add('database');
      else if (tool.name.includes('search') || tool.name.includes('tavily')) toolTypes.add('search');
      else if (tool.name.includes('sequential') || tool.name.includes('thinking')) toolTypes.add('thinking');
      else toolTypes.add('tool');
      
      // Calculate duration
      if (tool.endTime) {
        totalDuration += (tool.endTime - tool.startTime) / 1000;
      }
    });

    const typeNames = Array.from(toolTypes).map(type => {
      switch (type) {
        case 'database': return 'database queries';
        case 'search': return 'web search';
        case 'thinking': return 'reasoning';
        default: return 'tool execution';
      }
    });

    return `Executed ${tools.length} ${typeNames.join(', ')} tool${tools.length > 1 ? 's' : ''} in ${totalDuration.toFixed(1)}s`;
  };

  // Compact collapsed view
  if (isCollapsed) {
    return (
      <div className={clsx(
        'my-2 rounded-lg bg-gradient-to-r from-card/40 to-muted/20 backdrop-blur-sm border border-border/30',
        'hover:from-card/60 hover:to-muted/30 transition-all duration-300 cursor-pointer',
        className
      )}
      onClick={() => setIsCollapsed(false)}
      >
        <div className="px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Compact status indicator */}
              <div className="flex items-center gap-1">
                {failedCount > 0 && (
                  <div className="w-1.5 h-1.5 bg-destructive rounded-full" />
                )}
                <div className="w-1.5 h-1.5 bg-green-accent rounded-full" />
                <span className="text-xs text-green-accent font-medium">Completed</span>
              </div>
              
              {/* Tool icons preview */}
              <div className="flex items-center gap-0.5">
                {tools.slice(0, 3).map((tool, index) => {
                  const icon = getToolIconForName(tool.name);
                  return (
                    <span key={index} className="text-xs opacity-70">
                      {icon}
                    </span>
                  );
                })}
                {tools.length > 3 && (
                  <span className="text-xs text-text-muted">+{tools.length - 3}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <p className="text-xs text-text-muted">{generateCompactSummary()}</p>
              <svg 
                className="w-3 h-3 text-text-muted transition-transform duration-200"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(
      'my-3 rounded-xl bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-sm border border-border/50 overflow-hidden',
      'shadow-lg shadow-primary/5 hover:shadow-primary/10 transition-all duration-500',
      isResponseGenerating && 'opacity-90', // Slightly dim during response generation
      className
    )}>
      {/* Dynamic Header with Stats */}
      <div className="relative px-4 py-3 bg-gradient-to-r from-primary/8 to-accent/8 border-b border-border/30">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.1),transparent_70%)]" />
        </div>
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-primary/20 border border-primary/30">
                <span className="text-xs">🛠️</span>
              </div>
              {executingCount > 0 && (
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full animate-pulse" />
              )}
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-text-primary">Tool Execution</h3>
                {executingCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-accent/20 text-accent rounded-full">
                    <div className="w-1 h-1 bg-accent rounded-full animate-pulse" />
                    Running
                  </span>
                )}
                {allToolsFinished && isResponseGenerating && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-green-accent/20 text-green-accent rounded-full">
                    <div className="w-1 h-1 bg-green-accent rounded-full" />
                    Complete
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted">
                {tools.length} tool{tools.length > 1 ? 's' : ''} • 
                {completedCount > 0 && <span className="text-green-accent ml-1">{completedCount} ✓</span>}
                {failedCount > 0 && <span className="text-destructive ml-1">{failedCount} ✗</span>}
                {isResponseGenerating && <span className="text-accent ml-1">Generating response...</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Progress Indicator */}
            <div className="flex items-center gap-1.5">
              <div className="w-12 h-1 bg-muted/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-700 ease-out"
                  style={{ width: `${(completedCount / tools.length) * 100}%` }}
                />
              </div>
              <span className="text-xs text-text-muted font-mono">
                {completedCount}/{tools.length}
              </span>
            </div>

            {/* Collapse button */}
            {allToolsFinished && (
              <button
                onClick={() => setIsCollapsed(true)}
                className={clsx(
                  'p-1 rounded-lg transition-all duration-200',
                  'hover:bg-muted/30 hover:scale-105 active:scale-95',
                  'border border-transparent hover:border-border/30',
                  'text-text-muted hover:text-text-secondary'
                )}
                title="Collapse tool execution panel"
              >
                <svg 
                  className="w-3 h-3"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tool Timeline */}
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-primary/30 via-primary/20 to-transparent" />
        
        {tools.map((tool, index) => (
          <ToolCard 
            key={tool.id} 
            tool={tool} 
            isLast={index === tools.length - 1}
            delay={index * 100}
            isResponseGenerating={isResponseGenerating}
          />
        ))}
      </div>

      {/* Response Generation Indicator */}
      {isResponseGenerating && allToolsFinished && (
        <div className="border-t border-border/30 bg-gradient-to-r from-accent/5 to-primary/5 px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-accent font-medium">AI is analyzing tool results and generating response...</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to get tool icon (moved outside component for reuse)
function getToolIconForName(toolName: string): string {
  if (toolName.includes('supabase') || toolName.includes('database')) return '🗄️';
  if (toolName.includes('search') || toolName.includes('tavily')) return '🔍';
  if (toolName.includes('sequential') || toolName.includes('thinking')) return '🧠';
  if (toolName.includes('list')) return '📋';
  return '🛠️';
}

interface ToolCardProps {
  tool: ToolCall;
  isLast: boolean;
  delay: number;
  isResponseGenerating?: boolean;
}

function ToolCard({ tool, delay, isResponseGenerating }: ToolCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [typingText, setTypingText] = useState('');

  useEffect(() => {
    // Stagger animation entrance
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  // Auto-collapse individual tool cards when response generation starts
  useEffect(() => {
    if (isResponseGenerating && isExpanded) {
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isResponseGenerating, isExpanded]);

  useEffect(() => {
    // Typing animation for executing status
    if (tool.status === 'executing') {
      const messages = [
        'Initializing...',
        'Processing request...',
        'Executing tool...',
        'Analyzing data...',
        'Generating response...'
      ];
      
      let messageIndex = 0;
      let charIndex = 0;
      
      const typeInterval = setInterval(() => {
        if (charIndex < messages[messageIndex].length) {
          setTypingText(messages[messageIndex].substring(0, charIndex + 1));
          charIndex++;
        } else {
          setTimeout(() => {
            messageIndex = (messageIndex + 1) % messages.length;
            charIndex = 0;
            setTypingText('');
          }, 1000);
        }
      }, 100);

      return () => clearInterval(typeInterval);
    }
  }, [tool.status]);

  const getStatusIcon = () => {
    switch (tool.status) {
      case 'executing':
        return (
          <div className="relative">
            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <div className="absolute inset-0 w-4 h-4 border border-accent/30 rounded-full animate-pulse" />
          </div>
        );
      case 'completed':
        return (
          <div className="w-4 h-4 rounded-full bg-green-accent/20 border border-green-accent/40 flex items-center justify-center">
            <span className="text-green-accent text-xs">✓</span>
          </div>
        );
      case 'failed':
        return (
          <div className="w-4 h-4 rounded-full bg-destructive/20 border border-destructive/40 flex items-center justify-center">
            <span className="text-destructive text-xs">✗</span>
          </div>
        );
      default:
        return (
          <div className="w-4 h-4 rounded-full bg-muted border border-border animate-pulse" />
        );
    }
  };

  const getToolIcon = (toolName: string) => {
    const iconMap: { [key: string]: { emoji: string; color: string; bg: string } } = {
      supabase: { emoji: '🗄️', color: 'text-green-accent', bg: 'bg-green-accent/10' },
      database: { emoji: '📊', color: 'text-blue-400', bg: 'bg-blue-400/10' },
      search: { emoji: '🔍', color: 'text-accent', bg: 'bg-accent/10' },
      tavily: { emoji: '🌐', color: 'text-accent', bg: 'bg-accent/10' },
      sequential: { emoji: '🧠', color: 'text-purple-light', bg: 'bg-purple-light/10' },
      thinking: { emoji: '💭', color: 'text-purple-light', bg: 'bg-purple-light/10' },
      list: { emoji: '📋', color: 'text-text-secondary', bg: 'bg-text-secondary/10' },
    };

    for (const [key, config] of Object.entries(iconMap)) {
      if (toolName.toLowerCase().includes(key)) {
        return config;
      }
    }
    
    return { emoji: '🛠️', color: 'text-text-secondary', bg: 'bg-text-secondary/10' };
  };

  const getDuration = () => {
    if (!tool.endTime) return null;
    const duration = (tool.endTime - tool.startTime) / 1000;
    if (duration < 1) return `${(duration * 1000).toFixed(0)}ms`;
    return `${duration.toFixed(1)}s`;
  };

  const formatToolName = (name: string) => {
    // Smarter formatting
    const formatted = name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    // Handle common patterns
    return formatted
      .replace(/Supabase/g, 'Supabase')
      .replace(/Sequential Thinking/g, 'Sequential Thinking')
      .replace(/Tavily/g, 'Tavily Search');
  };

  const generateSmartSummary = () => {
    if (tool.summary) return tool.summary;
    
    switch (tool.status) {
      case 'executing':
        return typingText || 'Starting execution...';
      case 'failed':
        return tool.error || 'Execution failed';
      case 'completed':
        if (tool.result) {
          const result = tool.result.toString();
          
          // Smart parsing for different tool types
          if (tool.name.includes('list')) {
            try {
              const parsed = JSON.parse(result);
              if (Array.isArray(parsed)) {
                return `Found ${parsed.length} items`;
              }
            } catch {}
          }
          
          if (tool.name.includes('search')) {
            return 'Search completed with results';
          }
          
          if (tool.name.includes('sequential')) {
            return 'Thought process completed';
          }
          
          if (result.length > 200) {
            return `Processed ${result.length} characters of data`;
          }
          
          return 'Completed successfully';
        }
        return 'Task completed';
      default:
        return 'Pending execution';
    }
  };

  const toolConfig = getToolIcon(tool.name);

  return (
    <div className={clsx(
      'relative transition-all duration-500 ease-out',
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
      isResponseGenerating && 'opacity-75' // Dim during response generation
    )}>
      {/* Timeline Node */}
      <div className="absolute left-5 top-4 z-10">
        <div className={clsx(
          'w-2.5 h-2.5 rounded-full border-2 transition-all duration-300',
          tool.status === 'executing' && 'border-accent bg-accent/30 animate-pulse',
          tool.status === 'completed' && 'border-green-accent bg-green-accent/30',
          tool.status === 'failed' && 'border-destructive bg-destructive/30',
          tool.status !== 'executing' && tool.status !== 'completed' && tool.status !== 'failed' && 'border-muted bg-muted/30'
        )} />
      </div>

      <div className="pl-12 pr-4 py-2">
        {/* Tool Header */}
        <div 
          className={clsx(
            'group cursor-pointer rounded-lg p-3 transition-all duration-300',
            'hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5',
            'border border-transparent hover:border-border/30',
            tool.status === 'executing' && 'bg-accent/5 border-accent/20',
            tool.status === 'failed' && 'bg-destructive/5 border-destructive/20'
          )}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            {/* Tool Icon */}
            <div className={clsx(
              'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
              'border transition-all duration-300 group-hover:scale-105',
              toolConfig.bg,
              'border-border/30 group-hover:border-border/50'
            )}>
              <span className="text-sm">{toolConfig.emoji}</span>
            </div>

            {/* Tool Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h4 className={clsx(
                  'text-sm font-medium transition-colors duration-200',
                  toolConfig.color
                )}>
                  {formatToolName(tool.name)}
                </h4>
                
                {getStatusIcon()}
                
                {getDuration() && (
                  <span className="text-xs text-text-muted font-mono bg-muted/30 px-1.5 py-0.5 rounded">
                    {getDuration()}
                  </span>
                )}
                
                {tool.status === 'executing' && (
                  <div className="flex items-center gap-0.5">
                    <div className="w-1 h-1 bg-accent rounded-full animate-pulse" />
                    <div className="w-1 h-1 bg-accent rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <div className="w-1 h-1 bg-accent rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
                )}
              </div>
              
              <p className="text-xs text-text-muted leading-relaxed">
                {generateSmartSummary()}
                {tool.status === 'executing' && (
                  <span className="inline-block w-1.5 h-3 bg-accent/60 ml-1 animate-pulse" />
                )}
              </p>
            </div>

            {/* Expand Button */}
            <button className={clsx(
              'flex-shrink-0 p-1.5 rounded-lg transition-all duration-200',
              'hover:bg-muted/30 hover:scale-105 active:scale-95',
              'border border-transparent hover:border-border/30'
            )}>
              <svg 
                className={clsx(
                  'w-3 h-3 text-text-muted transition-transform duration-300',
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
        </div>

        {/* Expandable Details with Smooth Animation */}
        <div className={clsx(
          'overflow-hidden transition-all duration-500 ease-out',
          isExpanded ? 'max-h-[800px] opacity-100 mt-3' : 'max-h-0 opacity-0'
        )}>
          <div className="space-y-4 p-3 bg-gradient-to-br from-card/50 to-muted/20 rounded-lg border border-border/30 backdrop-blur-sm">
            
            {/* Input Parameters */}
            {Object.keys(tool.arguments).length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
                    <span className="text-xs">📥</span>
                  </div>
                  <h5 className="text-xs font-medium text-text-secondary">Input Parameters</h5>
                </div>
                
                <div className="bg-code-bg/80 border border-border/50 rounded-lg p-3 backdrop-blur-sm">
                  <pre className="text-xs text-text-secondary whitespace-pre-wrap overflow-x-auto custom-scrollbar">
                    {JSON.stringify(tool.arguments, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Result/Error */}
            {(tool.result || tool.error) && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <div className={clsx(
                    'w-5 h-5 rounded flex items-center justify-center',
                    tool.error ? 'bg-destructive/20' : 'bg-green-accent/20'
                  )}>
                    <span className="text-xs">{tool.error ? '❌' : '📤'}</span>
                  </div>
                  <h5 className="text-xs font-medium text-text-secondary">
                    {tool.error ? 'Error Output' : 'Result'}
                  </h5>
                </div>
                
                <div className={clsx(
                  'border rounded-lg p-3 max-h-60 overflow-y-auto custom-scrollbar backdrop-blur-sm',
                  tool.error 
                    ? 'bg-destructive/5 border-destructive/30' 
                    : 'bg-green-accent/5 border-green-accent/30'
                )}>
                  <pre className={clsx(
                    'text-xs whitespace-pre-wrap overflow-x-auto',
                    tool.error ? 'text-destructive' : 'text-text-secondary'
                  )}>
                    {tool.error || tool.result}
                  </pre>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              {Object.keys(tool.arguments).length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(JSON.stringify(tool.arguments, null, 2));
                  }}
                  className={clsx(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200',
                    'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30',
                    'hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-primary/20'
                  )}
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
                  className={clsx(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200',
                    tool.error 
                      ? 'bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30'
                      : 'bg-green-accent/10 hover:bg-green-accent/20 text-green-accent border border-green-accent/30',
                    'hover:scale-105 active:scale-95 hover:shadow-lg',
                    tool.error ? 'hover:shadow-destructive/20' : 'hover:shadow-green-accent/20'
                  )}
                >
                  Copy Output
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 