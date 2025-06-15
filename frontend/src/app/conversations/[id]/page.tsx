/**
 * Individual Conversation Page
 * Handles specific conversation routes like /conversations/[id]
 */

'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { NewConversationModal } from '@/components/conversation/NewConversationModal';
import { useConversations } from '@/contexts/ConversationsContext';
import { useState, useMemo, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import type { ConversationResponse } from '@/types/api';

interface ConversationPageProps {
  params: Promise<{
    id: string;
  }>;
}

function ConversationPage({ params }: ConversationPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const conversationId = resolvedParams.id;
  const [isNewConversationModalOpen, setIsNewConversationModalOpen] = useState(false);
  
  // Use real conversations hook
  const { conversations, loading, createConversation } = useConversations();
  
  // Get selected conversation and convert to ConversationResponse format
  const selectedConversation = useMemo((): ConversationResponse | undefined => {
    const listItem = conversations.find(conv => conv.id === conversationId);
    if (!listItem) return undefined;
    
    // Convert ConversationListItem to ConversationResponse
    return {
      id: listItem.id,
      user_id: '', // Will be populated when needed
      title: listItem.title,
      current_model: listItem.current_model,
      system_prompt: undefined, // Will be fetched when needed
      created_at: listItem.created_at,
      updated_at: listItem.updated_at
    };
  }, [conversations, conversationId]);

  // Redirect to home if conversation not found after conversations are loaded
  useEffect(() => {
    if (!loading && conversations.length > 0 && !selectedConversation) {
      router.push('/');
    }
  }, [loading, conversations, selectedConversation, router]);

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
        router.push(`/conversations/${newConversation.id}`);
        setIsNewConversationModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleConversationSelect = (selectedConversationId: string) => {
    router.push(`/conversations/${selectedConversationId}`);
  };

  // Show loading state while conversations are loading
  if (loading) {
    return (
      <AuthGuard>
        <ChatLayout
          onNewChat={handleNewChat}
          selectedConversationId={conversationId}
          onConversationSelect={handleConversationSelect}
        >
          <div className="flex-1 flex items-center justify-center">
            <div className="text-zinc-400">Loading conversation...</div>
          </div>
        </ChatLayout>
      </AuthGuard>
    );
  }

  // If no conversations exist after loading, show empty state
  if (!loading && conversations.length === 0) {
    return (
      <AuthGuard>
        <ChatLayout
          onNewChat={handleNewChat}
          selectedConversationId={undefined}
          onConversationSelect={handleConversationSelect}
        >
          <div className="flex-1 flex items-center justify-center">
            <div className="text-zinc-400">No conversations found</div>
          </div>
        </ChatLayout>
      </AuthGuard>
    );
  }

  return (
    <ChatLayout
      onNewChat={handleNewChat}
      selectedConversationId={conversationId}
      onConversationSelect={handleConversationSelect}
    >
      {selectedConversation ? (
        <ChatInterface 
          conversationId={conversationId}
          conversation={selectedConversation}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-zinc-400">Conversation not found</div>
        </div>
      )}

      <NewConversationModal
        isOpen={isNewConversationModalOpen}
        onClose={() => setIsNewConversationModalOpen(false)}
        onCreateConversation={handleCreateConversation}
      />
    </ChatLayout>
  );
}

export default function ConversationPageWithAuth({ params }: ConversationPageProps) {
  return (
    <AuthGuard>
      <ConversationPage params={params} />
    </AuthGuard>
  );
} 