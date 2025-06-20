/**
 * Chat Interface Component
 * Main chat view with message list and input for a specific conversation
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useMessages } from '@/hooks/useMessages';
import { useConversations } from '@/contexts/ConversationsContext';
import type { Conversation } from '@/types/api';

interface ChatInterfaceProps {
  conversationId: string;
  conversation?: Conversation;
  onShowCustomization?: () => void;
}

export function ChatInterface({ conversationId, conversation, onShowCustomization }: ChatInterfaceProps) {
  const [currentModel, setCurrentModel] = useState(conversation?.current_model || 'openai/gpt-4o');
  const [initialToolsState, setInitialToolsState] = useState<{
    enabledTools: string[];
    reasoning: boolean;
  } | null>(null);
  const initialMessageSentRef = useRef(false);
  const searchParams = useSearchParams();
  
  // Reset initial message flag and tools state when conversation changes
  useEffect(() => {
    initialMessageSentRef.current = false;
    setInitialToolsState(null);
  }, [conversationId]);
  
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
    streamingContent,
    streamingReasoning,
    reasoningStartTime,
    reasoningPhases
  } = useMessages(conversationId);
  
  const { updateConversation } = useConversations();

  // Check if this is a branched conversation
  const isBranchedConversation = conversation?.title?.startsWith('Branch from ');

  const handleSendMessage = useCallback(async (content: string, files?: File[], enabledTools?: string[], reasoning?: boolean) => {
    if ((!content.trim() && (!files || files.length === 0)) || isStreaming) return;
    
    const useTools = enabledTools && enabledTools.length > 0;
    
    try {
      await sendMessage(content.trim(), currentModel, files, useTools, enabledTools, reasoning);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [isStreaming, sendMessage, currentModel]);

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

  // Handle initial message from home page
  useEffect(() => {
    const initialMessage = searchParams.get('initialMessage');
    
    if (initialMessage && !loading && messages.length === 0 && !isStreaming && !initialMessageSentRef.current) {
      const enabledToolsParam = searchParams.get('enabledTools');
      const reasoningParam = searchParams.get('reasoning');
      
      const enabledTools = enabledToolsParam ? enabledToolsParam.split(',') : [];
      const reasoning = reasoningParam === 'true';
      const useTools = enabledTools && enabledTools.length > 0;
      
      // Store initial tools state to pass to MessageInput
      setInitialToolsState({
        enabledTools,
        reasoning
      });
      
      // Mark as sent immediately to prevent duplicates
      initialMessageSentRef.current = true;
      
      // Send the initial message directly without going through handleSendMessage callback
      sendMessage(initialMessage.trim(), currentModel, undefined, useTools, enabledTools, reasoning)
        .catch(error => {
          console.error('Failed to send initial message:', error);
        });
      
      // Clean up URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete('initialMessage');
      url.searchParams.delete('enabledTools');
      url.searchParams.delete('reasoning');
      window.history.replaceState({}, '', url.toString());
      
      // Clean up sessionStorage
      sessionStorage.removeItem('pendingFiles');
    }
   }, [searchParams, loading, messages, isStreaming, sendMessage, currentModel]);

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
    <div className="flex-1 flex flex-col h-full min-h-0">
      {/* Branched Conversation Indicator */}
      {isBranchedConversation && (
        <div className="border-b border-primary/20 bg-primary/10 p-3 flex-shrink-0">
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
        <div className="border-b border-destructive/20 bg-destructive/10 p-3 flex-shrink-0">
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
        reasoningPhases={reasoningPhases}
        streamingContent={streamingContent}
        streamingReasoning={streamingReasoning}
        reasoningStartTime={reasoningStartTime}
      />

      {/* Message Input */}
      <div className="flex-shrink-0">
        <MessageInput
          onSendMessage={handleSendMessage}
          disabled={isStreaming || loading}
          currentModel={currentModel}
          onModelChange={handleModelChange}
          onShowCustomization={onShowCustomization}
          initialEnabledTools={initialToolsState?.enabledTools}
          initialReasoning={initialToolsState?.reasoning}
        />
      </div>
    </div>
  );
} 