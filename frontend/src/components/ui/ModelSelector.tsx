/**
 * Enhanced Model Selector Component
 * Groups models by company with reasoning indicators and clean design
 */

'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { clsx } from 'clsx';

interface ModelInfo {
  id: string;
  name: string;
  context_length?: number;
  reasoning_capable?: boolean;
  reasoning_by_default?: boolean;
}

interface ModelSelectorProps {
  models: ModelInfo[];
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
  className?: string;
  // Reasoning props
  reasoningEnabled?: boolean;
  onReasoningToggle?: (enabled: boolean) => void;
}

interface GroupedModels {
  [company: string]: ModelInfo[];
}

const getCompanyFromModel = (modelId: string): string => {
  if (modelId.startsWith('google/')) return 'Google';
  if (modelId.startsWith('anthropic/')) return 'Anthropic';
  if (modelId.startsWith('openai/')) return 'OpenAI';
  if (modelId.startsWith('deepseek/')) return 'DeepSeek';
  return 'Other';
};

const getCompanyIcon = (company: string): string => {
  switch (company) {
    case 'Google': return '🟢';
    case 'Anthropic': return '🟠';
    case 'OpenAI': return '🔵';
    case 'DeepSeek': return '🟣';
    default: return '⚪';
  }
};

const getReasoningIcon = (model: ModelInfo): string => {
  if (!model.reasoning_capable) return '';
  if (model.reasoning_by_default) return '🧠'; // Always reasoning
  return '💭'; // Optional reasoning
};

const getReasoningTooltip = (model: ModelInfo): string => {
  if (!model.reasoning_capable) return '';
  if (model.reasoning_by_default) return 'Reasoning by default';
  return 'Reasoning available';
};

export function ModelSelector({
  models,
  value,
  onChange,
  disabled = false,
  className = '',
  reasoningEnabled = false,
  onReasoningToggle,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Group models by company
  const groupedModels = useMemo(() => {
    const groups: GroupedModels = {};
    models.forEach(model => {
      const company = getCompanyFromModel(model.id);
      if (!groups[company]) {
        groups[company] = [];
      }
      groups[company].push(model);
    });

    // Sort companies: Google, Anthropic, OpenAI, DeepSeek, Others
    const companyOrder = ['Google', 'Anthropic', 'OpenAI', 'DeepSeek'];
    const sortedGroups: GroupedModels = {};
    
    companyOrder.forEach(company => {
      if (groups[company]) {
        sortedGroups[company] = groups[company];
      }
    });
    
    // Add any remaining companies
    Object.keys(groups).forEach(company => {
      if (!companyOrder.includes(company)) {
        sortedGroups[company] = groups[company];
      }
    });

    return sortedGroups;
  }, [models]);

  // Get current model info
  const currentModel = models.find(m => m.id === value);

  // Close dropdown when clicking outside and determine direction
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    // Determine if we should open upward based on position
    const checkPosition = () => {
      if (dropdownRef.current) {
        const rect = dropdownRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        // If there's less than 400px below but more than 200px above, open upward
        setOpenUpward(spaceBelow < 400 && spaceAbove > 200);
      }
    };

    if (isOpen) {
      checkPosition();
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', checkPosition);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', checkPosition);
    };
  }, [isOpen]);

  const handleModelSelect = (modelId: string) => {
    onChange(modelId);
    setIsOpen(false);
  };

  const handleReasoningToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent dropdown from opening
    if (disabled) return; // Respect disabled state
    if (onReasoningToggle) {
      onReasoningToggle(!reasoningEnabled);
    }
  };

  // Check if current model supports optional reasoning
  const showReasoningToggle = currentModel && 
    currentModel.reasoning_capable && 
    !currentModel.reasoning_by_default;

  const formatContextLength = (length?: number): string => {
    if (!length) return '';
    return `${(length / 1000).toFixed(0)}K`;
  };

  return (
    <div ref={dropdownRef} className={clsx('relative', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={clsx(
          'w-full flex items-center justify-between px-4 py-3 bg-secondary border border-border rounded-lg',
          'text-left text-text-primary transition-all duration-200',
          'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50',
          disabled && 'opacity-50 cursor-not-allowed',
          isOpen && 'ring-2 ring-primary/50 border-primary/50'
        )}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-lg">
            {getCompanyIcon(getCompanyFromModel(value))}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">
                {currentModel?.name || 'Select Model'}
              </span>
              {currentModel && getReasoningIcon(currentModel) && !showReasoningToggle && (
                <span 
                  className="text-sm"
                  title={getReasoningTooltip(currentModel)}
                >
                  {getReasoningIcon(currentModel)}
                </span>
              )}
              {showReasoningToggle && (
                <div
                  onClick={handleReasoningToggle}
                  className={clsx(
                    'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all duration-200 cursor-pointer',
                    'border border-border hover:bg-muted',
                    reasoningEnabled 
                      ? 'bg-primary/10 text-primary border-primary/30' 
                      : 'bg-secondary text-text-muted',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  title={reasoningEnabled ? 'Disable reasoning' : 'Enable reasoning'}
                >
                  <span className="text-xs">
                    {reasoningEnabled ? '💭' : '⚡'}
                  </span>
                  <span>
                    {reasoningEnabled ? 'Reasoning' : 'Fast'}
                  </span>
                </div>
              )}
            </div>
            {currentModel?.context_length && (
              <div className="text-xs text-text-muted">
                {formatContextLength(currentModel.context_length)} context
              </div>
            )}
          </div>
        </div>
        <svg
          className={clsx(
            'w-4 h-4 text-text-muted transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={clsx(
          "absolute left-0 right-0 bg-secondary border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto",
          openUpward 
            ? "bottom-full mb-2" 
            : "top-full mt-2"
        )}>
          {Object.entries(groupedModels).map(([company, companyModels]) => (
            <div key={company} className="p-2">
              {/* Company Header */}
              <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-muted border-b border-border/50 mb-1">
                <span>{getCompanyIcon(company)}</span>
                <span>{company}</span>
              </div>

              {/* Models in Company */}
              <div className="space-y-1">
                {companyModels.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => handleModelSelect(model.id)}
                    className={clsx(
                      'w-full flex items-center justify-between px-3 py-2.5 rounded-md text-left transition-all duration-150',
                      'hover:bg-muted focus:outline-none focus:bg-muted',
                      model.id === value
                        ? 'bg-primary/10 text-primary border border-primary/30'
                        : 'text-text-primary'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {model.name}
                          </span>
                          {getReasoningIcon(model) && (
                            <span 
                              className="text-sm"
                              title={getReasoningTooltip(model)}
                            >
                              {getReasoningIcon(model)}
                            </span>
                          )}
                        </div>
                        {model.context_length && (
                          <div className="text-xs text-text-muted">
                            {formatContextLength(model.context_length)} context
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {model.id === value && (
                      <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 