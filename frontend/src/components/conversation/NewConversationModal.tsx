/**
 * New Conversation Modal
 * Allows users to create a new conversation with model selection
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
  { id: 'openai/gpt-4o', name: 'GPT-4o', description: 'Most capable model' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and cost-effective' },
  { id: 'anthropic/claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Excellent reasoning' },
  { id: 'anthropic/claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fast responses' },
];

export function NewConversationModal({
  isOpen,
  onClose,
  onCreateConversation,
}: NewConversationModalProps) {
  const [selectedModel, setSelectedModel] = useState(availableModels[0].id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ConversationFormData>();

  const handleClose = () => {
    reset();
    setSelectedModel(availableModels[0].id);
    onClose();
  };

  const onSubmit = (data: ConversationFormData) => {
    onCreateConversation({
      model: selectedModel,
      systemPrompt: data.systemPrompt || undefined,
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

        {/* Optional Custom System Prompt */}
        <div>
          <label className="block text-sm font-medium text-white mb-3">
            System Prompt (Optional)
          </label>
          <textarea
            {...register('systemPrompt')}
            placeholder="Enter a custom system prompt to guide the AI's behavior..."
            className="w-full h-20 px-3 py-2 bg-[#2d2d2d] border border-[#3f3f46] rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] focus:border-transparent resize-none"
          />
          <p className="text-xs text-zinc-500 mt-1">
            Leave empty to use the default AI behavior
          </p>
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