/**
 * Home Page - Protected Chat Interface
 */

'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { EmptyState } from '@/components/chat/EmptyState';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { NewConversationModal } from '@/components/conversation/NewConversationModal';
import { useConversations } from '@/hooks/useConversations';
import { useState, useMemo } from 'react';
import type { ConversationResponse } from '@/types/api';

function HomePage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(undefined);
  const [isNewConversationModalOpen, setIsNewConversationModalOpen] = useState(false);
  
  // Use real conversations hook
  const { conversations, createConversation } = useConversations();
  
  // Get selected conversation and convert to ConversationResponse format
  const selectedConversation = useMemo((): ConversationResponse | undefined => {
    const listItem = conversations.find(conv => conv.id === selectedConversationId);
    if (!listItem) return undefined;
    
    // Convert ConversationListItem to ConversationResponse
    // Note: user_id and system_prompt are not available in list items
    return {
      id: listItem.id,
      user_id: '', // Will be populated when needed
      title: listItem.title,
      current_model: listItem.current_model,
      system_prompt: undefined, // Will be fetched when needed
      created_at: listItem.created_at,
      updated_at: listItem.updated_at
    };
  }, [conversations, selectedConversationId]);

  const handleNewChat = () => {
    setIsNewConversationModalOpen(true);
  };

  const handleCreateConversation = async (data: { model: string; systemPrompt?: string; title?: string }) => {
    try {
      const newConversation = await createConversation({
        title: data.title,
        current_model: data.model,
        system_prompt: data.systemPrompt,
      });
      
      if (newConversation) {
        setSelectedConversationId(newConversation.id);
        setIsNewConversationModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversationId(conversationId);
  };

  return (
    <ChatLayout
      onNewChat={handleNewChat}
      selectedConversationId={selectedConversationId}
      onConversationSelect={handleConversationSelect}
    >
      {selectedConversationId && selectedConversation ? (
        <ChatInterface 
          conversationId={selectedConversationId}
          conversation={selectedConversation}
        />
      ) : (
        <EmptyState onNewChat={handleNewChat} />
      )}

      <NewConversationModal
        isOpen={isNewConversationModalOpen}
        onClose={() => setIsNewConversationModalOpen(false)}
        onCreateConversation={handleCreateConversation}
      />
    </ChatLayout>
  );
}

export default function Home() {
  return (
    <AuthGuard>
      <HomePage />
    </AuthGuard>
  );
}
