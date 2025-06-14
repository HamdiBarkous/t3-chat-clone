/**
 * Home Page - Protected Chat Interface
 */

'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { EmptyState } from '@/components/chat/EmptyState';
import { NewConversationModal } from '@/components/conversation/NewConversationModal';
import { useState } from 'react';

function ChatInterface() {
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
        <div className="flex-1 p-8">
          <div className="text-center text-white">
            Selected conversation: {selectedConversationId}
            <br />
            <span className="text-zinc-400 text-sm">
              Chat interface will be implemented in Phase 3
            </span>
          </div>
        </div>
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
      <ChatInterface />
    </AuthGuard>
  );
}
