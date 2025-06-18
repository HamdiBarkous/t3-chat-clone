/**
 * Home Page - Protected Chat Interface
 * Shows empty state or redirects to first conversation
 */

'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { EmptyState } from '@/components/chat/EmptyState';
import { CustomizationSidebar } from '@/components/chat/CustomizationSidebar';
import { NewConversationModal } from '@/components/conversation/NewConversationModal';
import { useConversations } from '@/contexts/ConversationsContext';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

function HomePage() {
  const router = useRouter();
  const [isNewConversationModalOpen, setIsNewConversationModalOpen] = useState(false);
  
  // Customization state
  const [showCustomization, setShowCustomization] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(1);
  const [topP, setTopP] = useState(1);
  const [isApplying, setIsApplying] = useState(false);
  
  // For home page, original values are always defaults since there's no existing conversation
  const originalSystemPrompt = '';
  const originalTemperature = 1;
  const originalTopP = 1;
  
  // Use real conversations hook
  const { loading, createConversation } = useConversations();

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
        temperature: temperature,
        top_p: topP,
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

  const handleCustomizationToggle = () => {
    setShowCustomization(!showCustomization);
  };

  // Function to apply customization settings (for new conversations)
  const handleApplyCustomization = () => {
    // For the home page, changes are applied when creating a new conversation
    console.log('Customization settings will be applied to new conversations');
  };

  // Function to reset customization to defaults
  const handleResetCustomization = () => {
    setSystemPrompt('');
    setTemperature(1);
    setTopP(1);
  };

  // Show loading state while conversations are loading
  if (loading) {
    return (
      <ChatLayout
        onNewChat={handleNewChat}
        selectedConversationId={undefined}
        onConversationSelect={handleConversationSelect}
        showCustomization={showCustomization}
        onCustomizationToggle={handleCustomizationToggle}
      >
        <div className="flex-1 flex items-center justify-center">
          <div className="text-text-muted">Loading conversations...</div>
        </div>
      </ChatLayout>
    );
  }

  return (
    <ChatLayout
      onNewChat={handleNewChat}
      selectedConversationId={undefined}
      onConversationSelect={handleConversationSelect}
      showCustomization={showCustomization}
      onCustomizationToggle={handleCustomizationToggle}
    >
      <EmptyState onNewChat={handleNewChat} />

      <NewConversationModal
        isOpen={isNewConversationModalOpen}
        onClose={() => setIsNewConversationModalOpen(false)}
        onCreateConversation={handleCreateConversation}
      />

      {/* Customization Sidebar */}
      <CustomizationSidebar
        isOpen={showCustomization}
        onClose={() => setShowCustomization(false)}
        systemPrompt={systemPrompt}
        temperature={temperature}
        topP={topP}
        onSystemPromptChange={setSystemPrompt}
        onTemperatureChange={setTemperature}
        onTopPChange={setTopP}
        onApply={handleApplyCustomization}
        onReset={handleResetCustomization}
        originalSystemPrompt={originalSystemPrompt}
        originalTemperature={originalTemperature}
        originalTopP={originalTopP}
        isApplying={isApplying}
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
