/**
 * New Conversation Modal
 * Allows users to create a new conversation with model and system prompt selection
 */

'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateConversation: (data: ConversationFormData) => void;
}

interface ConversationFormData {
  model: string;
  systemPrompt?: string;
  title?: string;
}

// Mock available models - will be replaced with API call
const availableModels = [
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable model' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and cost-effective' },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Excellent reasoning' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', description: 'Fast responses' },
];

const systemPromptTemplates = [
  { name: 'Default', prompt: '' },
  { name: 'Creative Writer', prompt: 'You are a creative writer who helps with storytelling, poetry, and imaginative content. Be expressive and inspiring.' },
  { name: 'Code Assistant', prompt: 'You are a helpful programming assistant. Provide clear, well-commented code examples and explain programming concepts thoroughly.' },
  { name: 'Teacher', prompt: 'You are a patient and knowledgeable teacher. Break down complex topics into easy-to-understand explanations with examples.' },
  { name: 'Analyst', prompt: 'You are a analytical thinker who provides detailed analysis, considers multiple perspectives, and supports conclusions with evidence.' },
];

export function NewConversationModal({
  isOpen,
  onClose,
  onCreateConversation,
}: NewConversationModalProps) {
  const [selectedModel, setSelectedModel] = useState(availableModels[0].id);
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [customPrompt, setCustomPrompt] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ConversationFormData>();

  const handleClose = () => {
    reset();
    setSelectedModel(availableModels[0].id);
    setSelectedTemplate(0);
    setCustomPrompt(false);
    onClose();
  };

  const onSubmit = (data: ConversationFormData) => {
    const systemPrompt = customPrompt 
      ? data.systemPrompt 
      : systemPromptTemplates[selectedTemplate].prompt;

    onCreateConversation({
      model: selectedModel,
      systemPrompt: systemPrompt || undefined,
      title: data.title || undefined,
    });

    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Start New Conversation"
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Model Selection */}
        <div>
          <label className="block text-sm font-medium text-white mb-3">
            Choose AI Model
          </label>
          <div className="grid grid-cols-2 gap-3">
            {availableModels.map((model) => (
              <button
                key={model.id}
                type="button"
                onClick={() => setSelectedModel(model.id)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  selectedModel === model.id
                    ? 'border-[#8b5cf6] bg-[#8b5cf6]/10'
                    : 'border-[#3f3f46] hover:border-[#52525b]'
                }`}
              >
                <div className="font-medium text-white text-sm">{model.name}</div>
                <div className="text-zinc-400 text-xs mt-1">{model.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* System Prompt */}
        <div>
          <label className="block text-sm font-medium text-white mb-3">
            System Prompt (Optional)
          </label>
          
          {!customPrompt ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2">
                {systemPromptTemplates.map((template, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedTemplate(index)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      selectedTemplate === index
                        ? 'border-[#8b5cf6] bg-[#8b5cf6]/10'
                        : 'border-[#3f3f46] hover:border-[#52525b]'
                    }`}
                  >
                    <div className="font-medium text-white text-sm">{template.name}</div>
                    {template.prompt && (
                      <div className="text-zinc-400 text-xs mt-1 line-clamp-2">
                        {template.prompt}
                      </div>
                    )}
                  </button>
                ))}
              </div>
              
              <button
                type="button"
                onClick={() => setCustomPrompt(true)}
                className="text-[#8b5cf6] hover:text-[#a78bfa] text-sm transition-colors"
              >
                + Write custom prompt
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                {...register('systemPrompt')}
                placeholder="Enter your custom system prompt..."
                className="w-full h-24 px-3 py-2 bg-[#2d2d2d] border border-[#3f3f46] rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] focus:border-transparent resize-none"
              />
              <button
                type="button"
                onClick={() => setCustomPrompt(false)}
                className="text-[#8b5cf6] hover:text-[#a78bfa] text-sm transition-colors"
              >
                ← Back to templates
              </button>
            </div>
          )}
        </div>

        {/* Optional Title */}
        <Input
          label="Conversation Title (Optional)"
          placeholder="Enter a title for this conversation..."
          {...register('title')}
          error={errors.title?.message}
        />

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button type="submit">
            Start Conversation
          </Button>
        </div>
      </form>
    </Modal>
  );
} 