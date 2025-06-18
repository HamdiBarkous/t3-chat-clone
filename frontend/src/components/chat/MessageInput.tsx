/**
 * Message Input Component
 * Auto-resizing textarea with model selector, file upload, and send functionality
 */

'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { FileUpload, useFileUpload } from '@/components/ui/FileUpload';
import { DocumentBadge } from '@/components/ui/DocumentBadge';
import { ImagePreview } from '@/components/ui/ImagePreview';
import { useModels } from '@/hooks/useModels';
import { MCPTools } from '@/components/chat/MCPTools';
import { WebSearch } from '@/components/chat/WebSearch';
import { ToolToggle } from './ToolToggle';

import { clsx } from 'clsx';

interface MessageInputProps {
  onSendMessage: (content: string, files?: File[], enabledTools?: string[], reasoning?: boolean) => void;
  disabled?: boolean;
  currentModel?: string;
  onModelChange?: (model: string) => void;
  onShowCustomization?: () => void;
}

export function MessageInput({
  onSendMessage,
  disabled = false,
  currentModel = 'openai/gpt-4o-mini',
  onModelChange,
  onShowCustomization,
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // MCP Tools state
  const [enabledTools, setEnabledTools] = useState<string[]>([]);
  const [searchProvider, setSearchProvider] = useState<'tavily' | 'firecrawl'>('tavily');
  
  // Web search state (separate from other MCP tools)
  const [searchEnabled, setSearchEnabled] = useState(false);
  
  // Reasoning state - track per model
  const [reasoningByModel, setReasoningByModel] = useState<Record<string, boolean>>({});
  
  // File upload functionality
  const { uploadedFiles, addFiles, removeFile, clearFiles } = useFileUpload();
  
  // Get models from backend
  const { models, loading: modelsLoading } = useModels();
  
  // Get current model info for reasoning capabilities
  const currentModelInfo = useMemo(() => {
    return models.find(model => model.id === currentModel);
  }, [models, currentModel]);
  
  // Prepare models for the enhanced selector
  const availableModels = useMemo(() => {
    if (modelsLoading || models.length === 0) {
      // Fallback models while loading
      return [
        { 
          id: 'openai/gpt-4o', 
          name: 'GPT-4o', 
          context_length: 128000,
          reasoning_capable: false,
          reasoning_by_default: false
        },
        { 
          id: 'openai/gpt-4o-mini', 
          name: 'GPT-4o Mini', 
          context_length: 128000,
          reasoning_capable: false,
          reasoning_by_default: false
        },
      ];
    }
    
    return models;
  }, [models, modelsLoading]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      // Set a max-height to prevent infinite growth
      const maxHeight = 200;
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
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
    if ((message.trim() || uploadedFiles.length > 0) && !disabled) {
      // Combine web search and other MCP tools
      const allEnabledTools = [
        ...(searchEnabled ? [searchProvider] : []),
        ...enabledTools
      ];
      
      onSendMessage(
        message.trim(), 
        uploadedFiles, 
        allEnabledTools,
        reasoningByModel[currentModel] ?? false
      );
      setMessage('');
      clearFiles();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleModelChange = (model: string) => {
    onModelChange?.(model);
  };

  const handleToolToggle = (toolId: string, enabled: boolean, provider?: 'tavily' | 'firecrawl') => {
    // Only handle non-search tools (supabase, sequential_thinking)
    if (toolId === 'tavily' || toolId === 'firecrawl') {
      return; // These are handled by WebSearch component
    }
    
    if (enabled) {
      setEnabledTools(prev => [...prev.filter(id => id !== toolId), toolId]);
    } else {
      setEnabledTools(prev => prev.filter(id => id !== toolId));
    }
  };

  const handleSearchToggle = (enabled: boolean, provider: 'tavily' | 'firecrawl') => {
    setSearchEnabled(enabled);
    setSearchProvider(provider);
  };

  const handleReasoningToggle = (model: string, enabled: boolean) => {
    setReasoningByModel(prev => ({ ...prev, [model]: enabled }));
  };

  const canSend = (message.trim().length > 0 || uploadedFiles.length > 0) && !disabled;

  return (
    <div className="border-t border-border bg-transparent p-4">
      <div className="max-w-4xl mx-auto">
        {/* Uploaded Files Display */}
        {uploadedFiles.length > 0 && (
          <div className="mb-3 p-3 bg-secondary border border-border rounded-lg">
            {(() => {
              // Helper function to check if file is an image
              const isImageFile = (filename: string): boolean => {
                const extension = '.' + filename.split('.').pop()?.toLowerCase();
                return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extension);
              };

              const imageFiles = uploadedFiles.filter(file => isImageFile(file.name));
              const documentFiles = uploadedFiles.filter(file => !isImageFile(file.name));

              return (
                <>
                  {/* Display image previews */}
                  {imageFiles.length > 0 && (
                    <div className="mb-3">
                      <div className="text-sm text-text-muted mb-2">
                        Image{imageFiles.length > 1 ? 's' : ''} ({imageFiles.length}):
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {imageFiles.map((file, index) => (
                          <ImagePreview
                            key={index}
                            file={file}
                            onRemove={() => removeFile(uploadedFiles.indexOf(file))}
                            className="w-24"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Display document badges */}
                  {documentFiles.length > 0 && (
                    <div>
                      <div className="text-sm text-text-muted mb-2">
                        Attached file{documentFiles.length > 1 ? 's' : ''} ({documentFiles.length}):
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {documentFiles.map((file, index) => {
                          const originalIndex = uploadedFiles.indexOf(file);
                          return (
                            <div key={index} className="relative">
                              <DocumentBadge
                                document={{
                                  id: `temp-${originalIndex}`,
                                  message_id: 'temp-message-id',
                                  filename: file.name,
                                  file_type: file.name.split('.').pop() || 'unknown',
                                  file_size: file.size,
                                  is_image: false,
                                  created_at: new Date().toISOString()
                                }}
                                onDelete={() => removeFile(originalIndex)}
                                showActions={true}
                                size="sm"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Message Input Form */}
        <form onSubmit={handleSubmit} className="relative">
          <div 
            className={clsx(
              "relative transition-all duration-300 rounded-lg mb-3",
              isFocused 
                ? "ring-2 ring-primary border-transparent" 
                : "border border-border",
              "bg-input"
            )}
          >
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Type your message here..."
              disabled={disabled}
              className={clsx(
                'w-full pl-4 pr-36 py-3 bg-transparent rounded-lg text-text-primary placeholder-text-muted resize-none',
                'focus:outline-none',
                'transition-colors min-h-[52px] max-h-[200px] overflow-y-auto',
                // Hide scrollbar completely
                'scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none]',
                '[&::-webkit-scrollbar]:hidden',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              rows={1}
            />

            {/* Floating Action Button Group */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
              {/* File Upload Group - Compact pill design */}
              <div className="flex items-center bg-secondary rounded-full border border-border shadow-md backdrop-blur-sm px-1 py-1">
                {/* Document Upload Button */}
                <FileUpload
                  onFileSelect={addFiles}
                  multiple={true}
                  disabled={disabled}
                  accept=".pdf,.txt,.md,.csv,.json,.xml,.yaml,.yml,.py,.js,.ts,.jsx,.tsx,.java,.cpp,.c,.h,.hpp,.go,.rs,.php,.rb,.swift,.kt,.scala,.sh,.sql,.css,.html"
                  className="flex-shrink-0"
                >
                  <button
                    type="button"
                    disabled={disabled}
                    className={clsx(
                      'relative p-1.5 min-w-0 rounded-full transition-all duration-200 ease-in-out transform',
                      'bg-transparent text-text-muted hover:bg-muted hover:text-primary',
                      'hover:scale-110 active:scale-95 active:bg-input',
                      'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-0',
                      disabled && 'opacity-50 cursor-not-allowed hover:scale-100'
                    )}
                    title="Attach documents"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                </FileUpload>

                {/* Enhanced Separator */}
                <div className="flex items-center px-0.5">
                  <div className="w-px h-5 bg-border" />
                </div>

                {/* Image Upload Button */}
                <FileUpload
                  onFileSelect={addFiles}
                  multiple={true}
                  disabled={disabled}
                  accept="image/*"
                  className="flex-shrink-0"
                >
                  <button
                    type="button"
                    disabled={disabled}
                    className={clsx(
                      'relative p-1.5 min-w-0 rounded-full transition-all duration-200 ease-in-out transform',
                      'bg-transparent text-text-muted hover:bg-muted hover:text-green-accent',
                      'hover:scale-110 active:scale-95 active:bg-input',
                      'focus:outline-none focus:ring-2 focus:ring-green-accent/50 focus:ring-offset-0',
                      disabled && 'opacity-50 cursor-not-allowed hover:scale-100'
                    )}
                    title="Attach images"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                </FileUpload>
              </div>

              {/* Send Button */}
              <Button
                type="submit"
                size="sm"
                disabled={!canSend}
                className={clsx(
                  'relative p-2.5 min-w-0 rounded-full transition-all duration-200 ease-out ml-2',
                  'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background',
                  'shadow-lg backdrop-blur-sm flex-shrink-0',
                  canSend 
                    ? 'purple-accent hover:bg-purple-dark text-primary-foreground transform hover:scale-105 active:scale-95 focus:ring-purple-light/50' 
                    : 'bg-muted text-text-muted cursor-not-allowed'
                )}
                title={canSend ? 'Send message' : 'Type a message to send'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </Button>
            </div>
          </div>

          {/* Model Selector and Tools - Moved below textarea */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ModelSelector
                models={availableModels}
                value={currentModel}
                onChange={handleModelChange}
                disabled={disabled}
                className="w-64"
                reasoningByModel={reasoningByModel}
                onReasoningToggle={handleReasoningToggle}
              />
              <WebSearch
                enabled={searchEnabled}
                provider={searchProvider}
                onToggle={handleSearchToggle}
                disabled={disabled}
              />
              <MCPTools
                enabledTools={enabledTools}
                searchProvider={searchProvider}
                onToggle={handleToolToggle}
                onShowCustomization={onShowCustomization}
                disabled={disabled}
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 