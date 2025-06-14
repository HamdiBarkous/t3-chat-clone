/**
 * Chat Interface Component
 * Main chat view with message list and input for a specific conversation
 */

'use client';

import React, { useState, useEffect } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import type { Message, Conversation } from '@/types/api';
import { MessageStatus } from '@/types/api';

interface ChatInterfaceProps {
  conversationId: string;
  conversation?: Conversation;
}

// Mock messages for demonstration
const mockMessages: Message[] = [
  {
    id: '1',
    conversation_id: '1',
    role: 'user' as const,
    content: 'Hello! Can you help me understand how neural networks work?',
    sequence_number: 1,
    sequence: 1,
    status: MessageStatus.COMPLETED,
    created_at: '2024-06-14T10:30:00Z',
  },
  {
    id: '2',
    conversation_id: '1',
    role: 'assistant' as const,
    content: 'Hello! I\'d be happy to help you understand neural networks. \n\nNeural networks are computational models inspired by the human brain. They consist of interconnected nodes (neurons) organized in layers:\n\n1. **Input Layer**: Receives the initial data\n2. **Hidden Layers**: Process the information through weighted connections\n3. **Output Layer**: Produces the final result\n\nEach connection has a weight that determines how much influence one neuron has on another. During training, these weights are adjusted to minimize errors and improve accuracy.\n\nWould you like me to explain any specific aspect in more detail?',
    sequence_number: 2,
    sequence: 2,
    status: MessageStatus.COMPLETED,
    created_at: '2024-06-14T10:31:00Z',
  },
  {
    id: '3',
    conversation_id: '1',
    role: 'user' as const,
    content: 'That\'s really helpful! Can you show me a simple example in Python?',
    sequence_number: 3,
    sequence: 3,
    status: MessageStatus.COMPLETED,
    created_at: '2024-06-14T10:32:00Z',
  },
];

export function ChatInterface({ conversationId, conversation }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessageId] = useState<string>();
  const [currentModel, setCurrentModel] = useState(conversation?.current_model || 'gpt-4o');

  // Load messages for the conversation
  useEffect(() => {
    // TODO: Replace with actual API call
    if (conversationId === '1') {
      setMessages(mockMessages);
    } else {
      setMessages([]);
    }
  }, [conversationId]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Create user message
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      role: 'user' as const,
      content: content.trim(),
      sequence_number: messages.length + 1,
      sequence: messages.length + 1,
      status: MessageStatus.PENDING,
      created_at: new Date().toISOString(),
    };

    // Add user message to the list
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // TODO: Replace with actual API call
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update user message status
      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id 
          ? { ...msg, status: MessageStatus.COMPLETED }
          : msg
      ));

      // Simulate AI response
      const assistantMessage: Message = {
        id: `temp-ai-${Date.now()}`,
        conversation_id: conversationId,
        role: 'assistant' as const,
        content: 'This is a simulated response. In Phase 4, this will be replaced with real-time streaming from the AI model.',
        sequence_number: messages.length + 2,
        sequence: messages.length + 2,
        status: MessageStatus.COMPLETED,
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);

    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Update user message status to error
      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id 
          ? { ...msg, status: MessageStatus.FAILED }
          : msg
      ));
      setIsLoading(false);
    }
  };

  const handleModelChange = (model: string) => {
    setCurrentModel(model);
    // TODO: Update conversation model via API
    console.log('Model changed to:', model);
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="border-b border-[#3f3f46] p-4 bg-[#171717]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg font-semibold text-white">
            {conversation?.title || 'New Conversation'}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-zinc-400">
              Model: {currentModel}
            </span>
            <span className="text-xs text-zinc-500">•</span>
            <span className="text-xs text-zinc-400">
              {messages.length} messages
            </span>
          </div>
        </div>
      </div>

      {/* Message List */}
      <MessageList 
        messages={messages}
        streamingMessageId={streamingMessageId}
        isLoading={isLoading}
      />

      {/* Message Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        disabled={isLoading}
        currentModel={currentModel}
        onModelChange={handleModelChange}
      />
    </div>
  );
} 