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
        isLoading={isStreaming}
        isLoadingConversation={loading && messages.length === 0}
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