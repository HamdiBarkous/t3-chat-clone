/**
 * Enhanced Model Selector Component
 * Groups models by company with reasoning indicators and clean design
 */

'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { clsx } from 'clsx';
import { OpenAI } from '@lobehub/icons';
import { Brain, Lock, LockOpen } from 'lucide-react';

interface ModelInfo {
  id: string;
  name: string;
  context_length?: number;
  reasoning_capable?: boolean;
  reasoning_by_default?: boolean;
  requires_api_key?: boolean;
}

interface ModelSelectorProps {
  models: ModelInfo[];
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
  className?: string;
  // Reasoning props - now per model
  reasoningByModel?: Record<string, boolean>;
  onReasoningToggle?: (model: string, enabled: boolean) => void;
  // API key status
  hasApiKey?: boolean;
  onApiKeyRequired?: () => void;
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

const getCompanyIcon = (company: string): React.ReactNode => {
  switch (company) {
    case 'Google': 
      return (
        <img 
          src="/icons/companies/google.svg" 
          alt="Google" 
          className="w-5 h-5"
        />
      );
    case 'Anthropic': 
      return (
        <img 
          src="https://img.icons8.com/fluency/48/claude.png" 
          alt="claude" 
          className="w-5 h-5"
        />
      );
    case 'OpenAI': 
      return (
        <OpenAI.Avatar size={20} />
      );
    case 'DeepSeek': 
      return (
        <img 
          src="/icons/companies/deepseek.svg" 
          alt="DeepSeek" 
          className="w-5 h-5"
        />
      );
    default: 
      return <div className="w-5 h-5 bg-muted rounded-full" />;
  }
};

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  value,
  onChange,
  disabled = false,
  className = '',
  reasoningByModel,
  onReasoningToggle,
  hasApiKey = false,
  onApiKeyRequired,
}) => {
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
    const model = models.find(m => m.id === modelId);
    
    // Check if model requires API key and user doesn't have one
    if (model?.requires_api_key && !hasApiKey) {
      onApiKeyRequired?.();
      return;
    }
    
    onChange(modelId);
    setIsOpen(false);
  };

  const formatContextLength = (length?: number): string => {
    if (!length) return '';
    if (length >= 1000000) {
      return `${(length / 1000000).toFixed(length % 1000000 === 0 ? 0 : 1)}M`;
    }
    return `${(length / 1000).toFixed(0)}K`;
  };

  // Render reasoning indicator with Brain icon
  const renderReasoningIndicator = (model: ModelInfo, canToggle: boolean, isEnabled: boolean) => {
    if (!model.reasoning_capable) return null;
    
    const isOn = canToggle ? isEnabled : true;
    
    const handleClick = (e: React.MouseEvent) => {
      if (canToggle && onReasoningToggle) {
        e.stopPropagation();
        onReasoningToggle(model.id, !isEnabled);
      }
    };

    return (
      <div
        className={`flex items-center ${canToggle ? 'cursor-pointer' : 'cursor-default'}`}
        onClick={handleClick}
        title={
          canToggle 
            ? `Reasoning ${isOn ? 'ON' : 'OFF'} - Click to toggle`
            : 'Reasoning always enabled'
        }
      >
        <Brain 
          size={16}
          className={`${
            isOn 
              ? 'text-purple-light fill-purple-light/20 stroke-2' 
              : 'text-muted opacity-50 stroke-1'
          } ${!isOn ? 'line-through' : ''}`}
          strokeWidth={isOn ? 2 : 1}
        />
      </div>
    );
  };

  // Render lock indicator for premium models
  const renderLockIndicator = (model: ModelInfo) => {
    if (!model.requires_api_key) return null;
    
    const isLocked = !hasApiKey;
    const Icon = isLocked ? Lock : LockOpen;
    
    return (
      <div
        className="flex items-center"
        title={
          isLocked 
            ? 'Requires API key - Click to add your OpenRouter API key'
            : 'Premium model unlocked with your API key'
        }
      >
        <Icon 
          size={14}
          className={`${
            isLocked 
              ? 'text-yellow-500' 
              : 'text-green-500'
          }`}
        />
      </div>
    );
  };

  return (
    <div ref={dropdownRef} className={clsx('relative', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={clsx(
          'w-full flex items-center justify-between px-4 py-3',
          'bg-secondary/80 backdrop-blur-md border border-border/50 rounded-xl',
          'text-left text-text-primary transition-all duration-300 ease-out',
          'hover:bg-secondary/90 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10',
          'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
          'transform hover:scale-[1.02] active:scale-[0.98]',
          disabled && 'opacity-50 cursor-not-allowed hover:scale-100',
          isOpen && 'ring-2 ring-primary/60 border-primary/50 bg-secondary/95 shadow-lg shadow-primary/15'
        )}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
            {getCompanyIcon(getCompanyFromModel(value))}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {currentModel && renderLockIndicator(currentModel)}
              {currentModel && (
                renderReasoningIndicator(
                  currentModel,
                  !currentModel.reasoning_by_default,
                  reasoningByModel?.[currentModel.id] || false
                )
              )}
              <span className="font-medium truncate">
                {currentModel?.name || 'Select Model'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <svg
            className={clsx(
              'w-4 h-4 text-text-muted/70 transition-all duration-300 ease-out',
              isOpen && 'rotate-180 text-primary/80'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown and Customization Container */}
      {isOpen && (
        <div className={clsx(
          "absolute left-0 z-50 flex gap-4",
          "right-0",
          openUpward ? "bottom-full mb-2" : "top-full mt-2"
        )}>
          {/* Model Selection Dropdown */}
          <div className={clsx(
            "flex-1 max-h-96 overflow-y-auto custom-scrollbar",
            "bg-secondary/85 backdrop-blur-xl border border-border/40 rounded-xl shadow-2xl",
            "animate-in fade-in-0 zoom-in-95 duration-200 ease-out",
            openUpward 
              ? "slide-in-from-bottom-2" 
              : "slide-in-from-top-2"
          )}>
            {Object.entries(groupedModels).map(([company, companyModels], companyIndex) => (
              <div key={company} className={clsx(
                "relative",
                companyIndex > 0 && "mt-4 pt-4 border-t border-border/30"
              )}>
                {/* Company Header */}
                <div className="mx-3 mb-3 px-3 py-2.5 bg-muted/30 backdrop-blur-sm rounded-lg border border-border/20">
                  <div className="flex items-center gap-2 text-sm font-semibold text-text-primary/90">
                    <div className="flex-shrink-0 opacity-90">
                      {getCompanyIcon(company)}
                    </div>
                    <span className="tracking-wide uppercase text-xs font-bold opacity-80">{company}</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-border/40 to-transparent ml-2"></div>
                    <span className="text-xs text-text-muted/60 font-normal">
                      {companyModels.length} model{companyModels.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Models in Company */}
                <div className="mx-3 mb-3 space-y-1 bg-card/20 backdrop-blur-sm rounded-lg p-2 border border-border/10">
                  {companyModels.map((model) => {
                    const isLocked = model.requires_api_key && !hasApiKey;
                    return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => handleModelSelect(model.id)}
                      className={clsx(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left',
                        'transition-all duration-200 ease-out group',
                        'hover:bg-muted/60 hover:backdrop-blur-sm focus:outline-none focus:bg-muted/70',
                        'transform hover:scale-[1.01] active:scale-[0.99]',
                        model.id === value
                          ? 'bg-primary/15 text-primary border border-primary/40 shadow-md shadow-primary/10'
                          : isLocked
                          ? 'text-text-muted/70 hover:text-text-muted border border-transparent hover:border-yellow-200/30 bg-yellow-50/20 dark:bg-yellow-900/10'
                          : 'text-text-primary hover:text-text-primary/90 border border-transparent hover:border-border/30'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {renderLockIndicator(model)}
                            {renderReasoningIndicator(
                              model,
                              !model.reasoning_by_default,
                              reasoningByModel?.[model.id] || false
                            )}
                            <span className={clsx(
                              "font-medium truncate transition-colors",
                              isLocked ? "group-hover:text-text-muted" : "group-hover:text-text-primary"
                            )}>
                              {model.name}
                            </span>
                            {isLocked && (
                              <span className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded">
                                API Key Required
                              </span>
                            )}
                          </div>
                          {model.context_length && (
                            <div className="text-xs text-text-muted/70 group-hover:text-text-muted/90 transition-colors">
                              {formatContextLength(model.context_length)} context
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {model.id === value && (
                        <svg className="w-4 h-4 text-primary animate-in zoom-in-50 duration-150" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 