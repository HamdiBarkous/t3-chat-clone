/**
 * Individual Conversation Page
 * Handles specific conversation routes like /conversations/[id]
 */

'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { CustomizationSidebar } from '@/components/chat/CustomizationSidebar';
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

  
  // Customization state
  const [showCustomization, setShowCustomization] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(1);
  const [topP, setTopP] = useState(1);
  const [conversationDetails, setConversationDetails] = useState<ConversationResponse | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  
  // Use real conversations hook
  const { conversations, loading, createConversation, getConversation, updateConversationCustomization } = useConversations();
  
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

  // Load conversation details when conversation ID changes
  useEffect(() => {
    const loadConversationDetails = async () => {
      if (conversationId && !loading) {
        const details = await getConversation(conversationId);
        if (details) {
          setConversationDetails(details);
          // Initialize customization state with loaded values
          setSystemPrompt(details.system_prompt || '');
          setTemperature(details.temperature || 1);
          setTopP(details.top_p || 1);
        }
      }
    };

    loadConversationDetails();
  }, [conversationId, loading, getConversation]);

  // Function to apply customization settings
  const handleApplyCustomization = async () => {
    if (!conversationId || isApplying) return;

    setIsApplying(true);
    try {
      const customizationData: any = {};
      
      // Only include changed values
      if (systemPrompt !== (conversationDetails?.system_prompt || '')) {
        customizationData.system_prompt = systemPrompt;
      }
      if (temperature !== (conversationDetails?.temperature || 1)) {
        customizationData.temperature = temperature;
      }
      if (topP !== (conversationDetails?.top_p || 1)) {
        customizationData.top_p = topP;
      }

      // Only make API call if there are changes
      if (Object.keys(customizationData).length > 0) {
        const updatedConversation = await updateConversationCustomization(conversationId, customizationData);
        if (updatedConversation) {
          setConversationDetails(updatedConversation);
          console.log('Customization settings applied successfully');
        }
      }
    } finally {
      setIsApplying(false);
    }
  };

  // Function to reset customization to defaults
  const handleResetCustomization = () => {
    setSystemPrompt('');
    setTemperature(1);
    setTopP(1);
  };

  // Redirect to home if conversation not found after conversations are loaded
  useEffect(() => {
    if (!loading && conversations.length > 0 && !selectedConversation) {
      router.push('/');
    }
  }, [loading, conversations, selectedConversation, router]);

  const handleNewChat = async () => {
    try {
      // Create conversation with default settings
      const newConversation = await createConversation({
        current_model: 'openai/gpt-4o',
        system_prompt: 'You are a helpful assistant',
      });
      
      if (newConversation) {
        router.push(`/conversations/${newConversation.id}`);
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleConversationSelect = (selectedConversationId: string) => {
    router.push(`/conversations/${selectedConversationId}`);
  };

  const handleCustomizationToggle = () => {
    setShowCustomization(!showCustomization);
  };

  // Show loading state while conversations are loading
  if (loading) {
    return (
      <AuthGuard>
        <ChatLayout
          onNewChat={handleNewChat}
          selectedConversationId={conversationId}
          onConversationSelect={handleConversationSelect}
          showCustomization={showCustomization}
          onCustomizationToggle={handleCustomizationToggle}
        >
          <div className="flex-1 flex items-center justify-center">
            <div className="text-text-muted">Loading conversation...</div>
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
          showCustomization={showCustomization}
          onCustomizationToggle={handleCustomizationToggle}
        >
          <div className="flex-1 flex items-center justify-center">
            <div className="text-text-muted">No conversations found</div>
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
      showCustomization={showCustomization}
      onCustomizationToggle={handleCustomizationToggle}
    >
      {selectedConversation ? (
        <ChatInterface 
          conversationId={conversationId}
          conversation={selectedConversation}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-text-muted">Conversation not found</div>
        </div>
      )}

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
        originalSystemPrompt={conversationDetails?.system_prompt || ''}
        originalTemperature={conversationDetails?.temperature || 1}
        originalTopP={conversationDetails?.top_p || 1}
        isApplying={isApplying}
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