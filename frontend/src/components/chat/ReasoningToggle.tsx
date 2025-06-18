/**
 * Reasoning Toggle Component
 * Allows users to enable/disable reasoning mode for compatible models
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';

interface ReasoningToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
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
  // Don't show the toggle if model doesn't support reasoning (unless it reasons by default)
  if (!modelSupportsReasoning && !modelReasonsByDefault) {
    return null;
  }

  const handleToggle = () => {
    onToggle(!enabled);
  };

  const getToggleText = () => {
    if (modelReasonsByDefault) {
      return enabled ? 'Reasoning On' : 'Reasoning Off';
    }
    return enabled ? 'Reasoning On' : 'Reasoning Off';
  };

  const getToggleIcon = () => {
    if (modelReasonsByDefault && enabled) {
      return '🧠'; // Brain for reasoning by default
    }
    return enabled ? '💭' : '⚡'; // Thought bubble for reasoning, lightning for fast mode
  };

  return (
    <Button
      type="button"
      variant={enabled ? 'primary' : 'secondary'}
      size="sm"
      onClick={handleToggle}
      disabled={disabled}
      className="flex items-center gap-2 transition-colors"
    >
      <span className="text-sm">{getToggleIcon()}</span>
      <span className="text-sm">{getToggleText()}</span>
    </Button>
  );
} 