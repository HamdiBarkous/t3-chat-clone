/**
 * Chat Interface Component
 * Main chat view with message list and input for a specific conversation
 */

'use client';

import React, { useState } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useMessages } from '@/hooks/useMessages';
import { useConversations } from '@/contexts/ConversationsContext';
import type { Conversation } from '@/types/api';

interface ChatInterfaceProps {
  conversationId: string;
  conversation?: Conversation;
}

export function ChatInterface({ conversationId, conversation }: ChatInterfaceProps) {
  const [currentModel, setCurrentModel] = useState(conversation?.current_model || 'openai/gpt-4o');
  
  // Use real-time hooks
  const { 
    messages, 
    loading, 
    error, 
    sendMessage, 
    isStreaming,
    streamingMessageId 
  } = useMessages(conversationId);
  
  const { updateConversation } = useConversations();

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isStreaming) return;
    
    try {
      await sendMessage(content.trim(), currentModel);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleModelChange = async (model: string) => {
    setCurrentModel(model);
    
    // Update conversation model in backend
    if (conversation) {
      try {
        await updateConversation(conversationId, { current_model: model });
      } catch (error) {
        console.error('Failed to update conversation model:', error);
      }
    }
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
            {isStreaming && (
              <>
                <span className="text-xs text-zinc-500">•</span>
                <span className="text-xs text-purple-400">Streaming...</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="border-b border-red-500/20 bg-red-500/10 p-3">
          <div className="max-w-4xl mx-auto">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Message List */}
      <MessageList 
        messages={messages}
        streamingMessageId={streamingMessageId || undefined}
        isLoading={loading}
      />

      {/* Message Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        disabled={isStreaming || loading}
        currentModel={currentModel}
        onModelChange={handleModelChange}
      />
    </div>
  );
} 