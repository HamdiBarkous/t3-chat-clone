/**
 * Home Page - Protected Chat Interface
 */

'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { EmptyState } from '@/components/chat/EmptyState';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { NewConversationModal } from '@/components/conversation/NewConversationModal';
import { useState } from 'react';

function HomePage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(undefined);
  const [isNewConversationModalOpen, setIsNewConversationModalOpen] = useState(false);

  const handleNewChat = () => {
    setIsNewConversationModalOpen(true);
  };

  const handleCreateConversation = (data: { model: string; systemPrompt?: string; title?: string }) => {
    // TODO: Implement conversation creation via API
    console.log('Creating conversation:', data);
    setIsNewConversationModalOpen(false);
    // For now, we'll simulate creating a conversation
    setSelectedConversationId('new-conversation-id');
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
      {selectedConversationId ? (
        <ChatInterface 
          conversationId={selectedConversationId}
          conversation={selectedConversationId === '1' ? {
            id: '1',
            user_id: 'mock-user-id',
            title: 'Simple Neural Network in Python',
            current_model: 'gpt-4o',
            created_at: '2024-06-14T10:30:00Z',
            updated_at: '2024-06-14T11:45:00Z',
          } : undefined}
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
