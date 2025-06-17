/**
 * Message Input Component
 * Auto-resizing textarea with model selector, file upload, and send functionality
 */

'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Dropdown } from '@/components/ui/Dropdown';
import { FileUpload, useFileUpload } from '@/components/ui/FileUpload';
import { DocumentBadge } from '@/components/ui/DocumentBadge';
import { ImagePreview } from '@/components/ui/ImagePreview';
import { useModels } from '@/hooks/useModels';
import { ToolToggle } from '@/components/chat/ToolToggle';
import { clsx } from 'clsx';

interface MessageInputProps {
  onSendMessage: (content: string, files?: File[], useTools?: boolean, enabledTools?: string[]) => void;
  disabled?: boolean;
  currentModel?: string;
  onModelChange?: (model: string) => void;
}

export function MessageInput({
  onSendMessage,
  disabled = false,
  currentModel = 'openai/gpt-4o',
  onModelChange,
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [selectedModel, setSelectedModel] = useState(currentModel);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Tool state
  const [toolsEnabled, setToolsEnabled] = useState(false);
  const [enabledTools, setEnabledTools] = useState<string[]>([]);
  
  // File upload functionality
  const { uploadedFiles, addFiles, removeFile, clearFiles } = useFileUpload();
  
  // Get models from backend
  const { models, loading: modelsLoading } = useModels();
  
  // Transform models for dropdown
  const availableModels = useMemo(() => {
    if (modelsLoading || models.length === 0) {
      // Fallback models while loading
      return [
        { value: 'openai/gpt-4o', label: 'GPT-4o', description: 'Most capable model' },
        { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', description: 'Fast and cost-effective' },
        { value: 'anthropic/claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', description: 'Excellent reasoning' },
        { value: 'anthropic/claude-3-haiku-20240307', label: 'Claude 3 Haiku', description: 'Fast responses' },
      ];
    }
    
    return models.map(model => ({
      value: model.id,
      label: model.name,
      description: model.description || 'AI model'
    }));
  }, [models, modelsLoading]);

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
    if ((message.trim() || uploadedFiles.length > 0) && !disabled) {
      onSendMessage(
        message.trim(), 
        uploadedFiles, 
        toolsEnabled, 
        toolsEnabled ? enabledTools : undefined
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
    setSelectedModel(model);
    onModelChange?.(model);
  };

  const handleToolToggle = (enabled: boolean, tools: string[]) => {
    setToolsEnabled(enabled);
    setEnabledTools(tools);
  };

  const canSend = (message.trim().length > 0 || uploadedFiles.length > 0) && !disabled;

  return (
    <div className="border-t border-[#3f3f46] bg-[#1a1a1a] p-4">
      <div className="max-w-4xl mx-auto">
        {/* Model Selector and Tool Toggle */}
        <div className="mb-3 flex items-center gap-3">
          <Dropdown
            options={availableModels}
            value={selectedModel}
            onChange={handleModelChange}
            disabled={disabled}
            className="w-48"
          />
          <ToolToggle
            enabled={toolsEnabled}
            enabledTools={enabledTools}
            onToggle={handleToolToggle}
            disabled={disabled}
          />
        </div>

        {/* Uploaded Files Display */}
        {uploadedFiles.length > 0 && (
          <div className="mb-3 p-3 bg-[#2d2d2d] border border-[#3f3f46] rounded-lg">
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
                      <div className="text-sm text-zinc-400 mb-2">
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
                      <div className="text-sm text-zinc-400 mb-2">
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
                'w-full px-4 py-3 pr-24 bg-[#2d2d2d] border border-[#3f3f46] rounded-lg text-white placeholder-zinc-500 resize-none',
                'focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] focus:border-transparent',
                'transition-colors min-h-[52px] max-h-[200px]',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              rows={1}
            />

            {/* File Upload and Send Buttons */}
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              {/* File Upload Button */}
              <FileUpload
                onFileSelect={addFiles}
                multiple={true}
                disabled={disabled}
                className="flex-shrink-0"
              >
                <Button
                  type="button"
                  size="sm"
                  disabled={disabled}
                  className={clsx(
                    'p-2 min-w-0 bg-[#3f3f46] hover:bg-[#4f4f56] text-zinc-400 hover:text-white',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  title="Attach files"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </Button>
              </FileUpload>

              {/* Send Button */}
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