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

  // Check if this is a branched conversation
  const isBranchedConversation = conversation?.title?.startsWith('Branch from ');

  const handleSendMessage = async (content: string, files?: File[]) => {
    if ((!content.trim() && (!files || files.length === 0)) || isStreaming) return;
    
    try {
      await sendMessage(content.trim(), currentModel, files);
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
      {/* Branched Conversation Indicator */}
      {isBranchedConversation && (
        <div className="border-b border-[#8b5cf6]/20 bg-[#8b5cf6]/10 p-3">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 text-sm text-[#8b5cf6]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>This conversation was {conversation?.title}</span>
            </div>
          </div>
        </div>
      )}

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