/**
 * Reasoning Toggle Component
 * Allows users to enable/disable reasoning mode for compatible models
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';

interface ReasoningToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean, config?: { effort?: string; max_tokens?: number }) => void;
  disabled?: boolean;
  modelSupportsReasoning?: boolean;
  modelReasonsByDefault?: boolean;
}

export function ReasoningToggle({
  enabled,
  onToggle,
  disabled = false,
  modelSupportsReasoning = false,
  modelReasonsByDefault = false,
}: ReasoningToggleProps) {
  const [showConfig, setShowConfig] = useState(false);
  const [effort, setEffort] = useState<'low' | 'medium' | 'high'>('high');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowConfig(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Don't show the toggle if model doesn't support reasoning (unless it reasons by default)
  if (!modelSupportsReasoning && !modelReasonsByDefault) {
    return null;
  }

  const handleToggle = () => {
    if (modelReasonsByDefault) {
      // For models that reason by default, we can only disable reasoning
      onToggle(!enabled, enabled ? undefined : { effort });
    } else {
      // For models that can toggle reasoning, enable/disable with config
      onToggle(!enabled, !enabled ? { effort } : undefined);
    }
  };

  const handleEffortChange = (newEffort: 'low' | 'medium' | 'high') => {
    setEffort(newEffort);
    if (enabled) {
      onToggle(true, { effort: newEffort });
    }
  };

  const getToggleText = () => {
    if (modelReasonsByDefault) {
      return enabled ? 'Reasoning On' : 'Reasoning Off';
    }
    return enabled ? `Reasoning (${effort})` : 'No Reasoning';
  };

  const getToggleIcon = () => {
    if (modelReasonsByDefault && enabled) {
      return '🧠'; // Brain for reasoning by default
    }
    return enabled ? '💭' : '⚡'; // Thought bubble for reasoning, lightning for fast mode
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Main Toggle Button */}
      <Button
        type="button"
        variant={enabled ? 'primary' : 'secondary'}
        size="sm"
        onClick={modelSupportsReasoning && !modelReasonsByDefault ? () => setShowConfig(!showConfig) : handleToggle}
        disabled={disabled}
        className="flex items-center gap-2 transition-colors"
      >
        <span className="text-sm">{getToggleIcon()}</span>
        <span className="text-sm">{getToggleText()}</span>
        {modelSupportsReasoning && !modelReasonsByDefault && (
          <span className={clsx(
            'text-xs transition-transform',
            showConfig && 'rotate-180'
          )}>
            ▼
          </span>
        )}
      </Button>

      {/* Dropdown Config Panel */}
      {showConfig && modelSupportsReasoning && !modelReasonsByDefault && (
        <div className="absolute bottom-full mb-2 left-0 w-56 bg-secondary border border-border rounded-lg shadow-lg z-50">
          <div className="p-3">
            <div className="text-sm font-medium text-text-primary mb-3">
              Reasoning Configuration
            </div>
            
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-text-primary">Enable Reasoning</span>
              <button
                type="button"
                onClick={handleToggle}
                className={clsx(
                  'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                  enabled ? 'bg-primary' : 'bg-muted'
                )}
              >
                <span
                  className={clsx(
                    'inline-block h-3 w-3 transform rounded-full bg-white transition-transform',
                    enabled ? 'translate-x-5' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            {/* Effort Level Selection */}
            {enabled && (
              <div className="space-y-2">
                <div className="text-xs text-text-muted mb-2">Reasoning Effort</div>
                {(['low', 'medium', 'high'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => handleEffortChange(level)}
                    className={clsx(
                      'w-full px-2 py-1.5 text-left rounded text-sm transition-colors',
                      effort === level
                        ? 'bg-primary/20 text-primary border border-primary/50'
                        : 'hover:bg-muted text-text-primary'
                    )}
                  >
                    <div className="font-medium capitalize">{level}</div>
                    <div className="text-xs text-text-muted">
                      {level === 'low' && 'Fast responses, basic reasoning'}
                      {level === 'medium' && 'Balanced speed and depth'}
                      {level === 'high' && 'Deep reasoning, slower responses'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 