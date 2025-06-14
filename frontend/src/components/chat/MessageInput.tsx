/**
 * Message Input Component
 * Auto-resizing textarea with model selector and send functionality
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Dropdown } from '@/components/ui/Dropdown';
import { clsx } from 'clsx';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
  currentModel?: string;
  onModelChange?: (model: string) => void;
}

// Mock available models - will be replaced with API call
const availableModels = [
  { value: 'gpt-4o', label: 'GPT-4o', description: 'Most capable model' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Fast and cost-effective' },
  { value: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', description: 'Excellent reasoning' },
  { value: 'claude-3-haiku', label: 'Claude 3 Haiku', description: 'Fast responses' },
];

export function MessageInput({
  onSendMessage,
  disabled = false,
  currentModel = 'gpt-4o',
  onModelChange,
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [selectedModel, setSelectedModel] = useState(currentModel);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    onModelChange?.(model);
  };

  const canSend = message.trim().length > 0 && !disabled;

  return (
    <div className="border-t border-[#3f3f46] bg-[#1a1a1a] p-4">
      <div className="max-w-4xl mx-auto">
        {/* Model Selector */}
        <div className="mb-3">
          <Dropdown
            options={availableModels}
            value={selectedModel}
            onChange={handleModelChange}
            disabled={disabled}
            className="w-48"
          />
        </div>

        {/* Message Input Form */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative">
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message here... (Enter to send, Shift+Enter for new line)"
              disabled={disabled}
              className={clsx(
                'w-full px-4 py-3 pr-16 bg-[#2d2d2d] border border-[#3f3f46] rounded-lg text-white placeholder-zinc-500 resize-none',
                'focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] focus:border-transparent',
                'transition-colors min-h-[52px] max-h-[200px]',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              rows={1}
            />

            {/* Send Button */}
            <div className="absolute right-2 bottom-2">
              <Button
                type="submit"
                size="sm"
                disabled={!canSend}
                className={clsx(
                  'p-2 min-w-0',
                  canSend 
                    ? 'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white' 
                    : 'bg-[#3f3f46] text-zinc-500 cursor-not-allowed'
                )}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </Button>
            </div>
          </div>

          {/* Helper Text */}
          <div className="flex items-center justify-between mt-2 text-xs text-zinc-500">
            <div className="flex items-center gap-4">
              <span>Enter to send • Shift+Enter for new line</span>
              {message.length > 0 && (
                <span className={clsx(
                  message.length > 4000 ? 'text-red-400' : 'text-zinc-500'
                )}>
                  {message.length}/4000
                </span>
              )}
            </div>
            
            {disabled && (
              <span className="text-zinc-400">Sending...</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
} 