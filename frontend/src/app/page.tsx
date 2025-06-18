/**
 * Home Page - Protected Chat Interface
 * Shows empty state or redirects to first conversation
 */

'use client';

import React, { useState } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { EmptyState } from '@/components/chat/EmptyState';
import { CustomizationSidebar } from '@/components/chat/CustomizationSidebar';
import { MessageInput } from '@/components/chat/MessageInput';
import { useConversations } from '@/contexts/ConversationsContext';
import { useSupabaseMCP } from '@/hooks/useProfile';
import { useRouter } from 'next/navigation';

function HomePage() {
  const router = useRouter();
  
  // Customization state
  const [showCustomization, setShowCustomization] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(1);
  const [topP, setTopP] = useState(1);
  const [isApplying, setIsApplying] = useState(false);
  
  // Supabase MCP state
  const { config: supabaseMCPConfig, updateConfig: updateSupabaseMCPConfig } = useSupabaseMCP();
  const [supabaseAccessToken, setSupabaseAccessToken] = useState('');
  const [supabaseProjectRef, setSupabaseProjectRef] = useState('');
  const [supabaseReadOnly, setSupabaseReadOnly] = useState(true);
  
  // Update local state when config changes
  React.useEffect(() => {
    setSupabaseAccessToken(supabaseMCPConfig.supabase_access_token);
    setSupabaseProjectRef(supabaseMCPConfig.supabase_project_ref);
    setSupabaseReadOnly(supabaseMCPConfig.supabase_read_only);
  }, [supabaseMCPConfig]);
  
  // For home page, original values are always defaults since there's no existing conversation
  const originalSystemPrompt = '';
  const originalTemperature = 1;
  const originalTopP = 1;
  const originalSupabaseAccessToken = supabaseMCPConfig.supabase_access_token;
  const originalSupabaseProjectRef = supabaseMCPConfig.supabase_project_ref;
  const originalSupabaseReadOnly = supabaseMCPConfig.supabase_read_only;
  
  // Message input state
  const [currentModel, setCurrentModel] = useState('openai/gpt-4o');
  
  // Use real conversations hook
  const { loading, createConversation } = useConversations();

  // No auto-redirect - let users choose their conversation

  const handleNewChat = async () => {
    try {
      // Create conversation with default settings + customization values
      const newConversation = await createConversation({
        current_model: currentModel,
        system_prompt: systemPrompt || 'You are a helpful assistant',
        temperature: temperature,
        top_p: topP,
      });
      
      if (newConversation) {
        router.push(`/conversations/${newConversation.id}`);
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  // Handle sending a message from the home page
  const handleSendMessage = async (content: string, files?: File[], enabledTools?: string[], reasoning?: boolean) => {
    try {
      // Create conversation with the first message
      const newConversation = await createConversation({
        current_model: currentModel,
        system_prompt: systemPrompt || 'You are a helpful assistant',
        temperature: temperature,
        top_p: topP,
      });
      
      if (newConversation) {
        // Navigate to the new conversation and let the initial message be handled there
        // We'll pass the message data via URL parameters (for the content) and sessionStorage (for files)
        if (files && files.length > 0) {
          // Store files in sessionStorage temporarily since we can't pass File objects in URL
          sessionStorage.setItem('pendingFiles', JSON.stringify({
            fileNames: files.map(f => f.name),
            // Note: We can't store actual File objects, so files will need to be re-uploaded
          }));
        }
        
        const searchParams = new URLSearchParams();
        searchParams.set('initialMessage', content);
        if (enabledTools && enabledTools.length > 0) {
          searchParams.set('enabledTools', enabledTools.join(','));
        }
        if (reasoning) {
          searchParams.set('reasoning', 'true');
        }
        
        router.push(`/conversations/${newConversation.id}?${searchParams.toString()}`);
      }
    } catch (error) {
      console.error('Failed to create conversation and send message:', error);
    }
  };

  const handleConversationSelect = (conversationId: string) => {
    router.push(`/conversations/${conversationId}`);
  };

  const handleCustomizationToggle = () => {
    setShowCustomization(!showCustomization);
  };

  // Function to apply customization settings (for new conversations)
  const handleApplyCustomization = async () => {
    setIsApplying(true);
    try {
      // Save Supabase MCP configuration
      await updateSupabaseMCPConfig({
        supabase_access_token: supabaseAccessToken,
        supabase_project_ref: supabaseProjectRef,
        supabase_read_only: supabaseReadOnly
      });
      console.log('Customization settings will be applied to new conversations');
    } catch (error) {
      console.error('Failed to save customization settings:', error);
    } finally {
      setIsApplying(false);
    }
  };

  // Function to reset customization to defaults
  const handleResetCustomization = () => {
    setSystemPrompt('');
    setTemperature(1);
    setTopP(1);
    setSupabaseAccessToken('');
    setSupabaseProjectRef('');
    setSupabaseReadOnly(true);
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
      {/* Main content area with empty state and message input */}
      <div className="flex-1 flex flex-col">
        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center">
          <EmptyState onNewChat={handleNewChat} />
        </div>
        
        {/* Message Input at bottom */}
        <MessageInput
          onSendMessage={handleSendMessage}
          currentModel={currentModel}
          onModelChange={setCurrentModel}
          onShowCustomization={handleCustomizationToggle}
          disabled={false}
        />
      </div>

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
        supabaseAccessToken={supabaseAccessToken}
        supabaseProjectRef={supabaseProjectRef}
        supabaseReadOnly={supabaseReadOnly}
        onSupabaseAccessTokenChange={setSupabaseAccessToken}
        onSupabaseProjectRefChange={setSupabaseProjectRef}
        onSupabaseReadOnlyChange={setSupabaseReadOnly}
        originalSupabaseAccessToken={originalSupabaseAccessToken}
        originalSupabaseProjectRef={originalSupabaseProjectRef}
        originalSupabaseReadOnly={originalSupabaseReadOnly}
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
