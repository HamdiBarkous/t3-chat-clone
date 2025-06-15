/**
 * Home Page - Protected Chat Interface
 * Shows empty state or redirects to first conversation
 */

'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { EmptyState } from '@/components/chat/EmptyState';
import { NewConversationModal } from '@/components/conversation/NewConversationModal';
import { useConversations } from '@/hooks/useConversations';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

function HomePage() {
  const router = useRouter();
  const [isNewConversationModalOpen, setIsNewConversationModalOpen] = useState(false);
  
  // Use real conversations hook
  const { conversations, loading, createConversation } = useConversations();

  // No auto-redirect - let users choose their conversation

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

  const handleConversationSelect = (conversationId: string) => {
    router.push(`/conversations/${conversationId}`);
  };

  // Show loading state while conversations are loading
  if (loading) {
    return (
      <ChatLayout
        onNewChat={handleNewChat}
        selectedConversationId={undefined}
        onConversationSelect={handleConversationSelect}
      >
        <div className="flex-1 flex items-center justify-center">
          <div className="text-zinc-400">Loading conversations...</div>
        </div>
      </ChatLayout>
    );
  }

  return (
    <ChatLayout
      onNewChat={handleNewChat}
      selectedConversationId={undefined}
      onConversationSelect={handleConversationSelect}
    >
      <EmptyState onNewChat={handleNewChat} />

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
