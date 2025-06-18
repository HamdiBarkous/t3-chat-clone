/**
 * Chat Interface Component
 * Main chat view with message list and input for a specific conversation
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
  
  // Use real-time hooks
  const { 
    messages, 
    loading, 
    error, 
    sendMessage,
    generateAIResponse,
    isStreaming,
    streamingMessageId,
    toolExecutions,
    streamingContent
  } = useMessages(conversationId);
  
  const { updateConversation } = useConversations();

  // Auto-generate AI response if requested (for retry functionality)
  useEffect(() => {
    const shouldAutoGenerate = searchParams.get('autoGenerateResponse') === 'true';
    if (shouldAutoGenerate && !loading && messages.length > 0 && !isStreaming) {
      // Find the conversation's current model or use the model from the conversation
      const modelToUse = conversation?.current_model || currentModel;
      generateAIResponse(modelToUse);
      
      // Clean up the URL parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('autoGenerateResponse');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams, loading, messages, isStreaming, generateAIResponse, conversation?.current_model, currentModel]);

  // Check if this is a branched conversation
  const isBranchedConversation = conversation?.title?.startsWith('Branch from ');

  const handleSendMessage = async (content: string, files?: File[], useTools?: boolean, enabledTools?: string[]) => {
    if ((!content.trim() && (!files || files.length === 0)) || isStreaming) return;
    
    try {
      await sendMessage(content.trim(), currentModel, files, useTools, enabledTools);
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
        <div className="border-b border-primary/20 bg-primary/10 p-3">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 text-sm text-primary">
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
        <div className="border-b border-destructive/20 bg-destructive/10 p-3">
          <div className="max-w-4xl mx-auto">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}

      {/* Message List */}
      <MessageList 
        messages={messages}
        streamingMessageId={streamingMessageId || undefined}
        isLoading={isStreaming}
        isLoadingConversation={loading && messages.length === 0}
        toolExecutions={toolExecutions}
        streamingContent={streamingContent}
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