/**
 * Conversations Context Provider
 * Manages conversations state globally to avoid multiple API calls
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from '@/lib/api';
import type { 
  ConversationListItem, 
  ConversationCreate, 
  ConversationUpdate, 
  ConversationResponse, 
  BranchRequest,
  MessageEditRequest,
  MessageRetryRequest,
  MessageEditResponse,
  MessageRetryResponse
} from '@/types/api';

interface ConversationsContextType {
  conversations: ConversationListItem[]
  loading: boolean
  error: string | null
  createConversation: (data: ConversationCreate) => Promise<ConversationResponse | null>
  updateConversation: (id: string, data: ConversationUpdate) => Promise<ConversationResponse | null>
  deleteConversation: (id: string) => Promise<boolean>
  branchConversation: (conversationId: string, messageId: string) => Promise<ConversationResponse | null>
  editMessage: (conversationId: string, messageId: string, newContent: string) => Promise<ConversationResponse | null>
  retryMessage: (conversationId: string, messageId: string, model?: string) => Promise<ConversationResponse | null>
  refreshConversations: () => Promise<void>
  updateConversationTitle: (id: string, title: string) => void
}

const ConversationsContext = createContext<ConversationsContextType | undefined>(undefined);

export function ConversationsProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiClient.get<ConversationListItem[]>('/conversations/')
      setConversations(response)
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to fetch conversations'
      setError(errorMessage)
      console.error('Error fetching conversations:', err)
    } finally {
      setLoading(false)
      setInitialized(true)
    }
  }, [])

  const createConversation = useCallback(async (data: ConversationCreate): Promise<ConversationResponse | null> => {
    try {
      setError(null)
      
      const newConversation = await apiClient.post<ConversationResponse>('/conversations/', data)
      
      // Convert to ConversationListItem format and add to the beginning of the list
      const listItem: ConversationListItem = {
        ...newConversation,
        message_count: 0,
        last_message_preview: undefined,
        last_message_at: undefined
      }
      setConversations(prev => [listItem, ...prev])
      
      return newConversation
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to create conversation'
      setError(errorMessage)
      console.error('Error creating conversation:', err)
      return null
    }
  }, [])

  const updateConversation = useCallback(async (
    id: string, 
    data: ConversationUpdate
  ): Promise<ConversationResponse | null> => {
    try {
      setError(null)
      
      const updatedConversation = await apiClient.patch<ConversationResponse>(`/conversations/${id}`, data)
      
      // Update in the list (merge with existing list item data)
      setConversations(prev => 
        prev.map(conv => 
          conv.id === id ? { ...conv, ...updatedConversation } : conv
        )
      )
      
      return updatedConversation
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to update conversation'
      setError(errorMessage)
      console.error('Error updating conversation:', err)
      return null
    }
  }, [])

  const deleteConversation = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null)
      
      await apiClient.delete(`/conversations/${id}/`)
      
      // Remove from the list
      setConversations(prev => prev.filter(conv => conv.id !== id))
      
      return true
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to delete conversation'
      setError(errorMessage)
      console.error('Error deleting conversation:', err)
      return false
    }
  }, [])

  const branchConversation = useCallback(async (
    conversationId: string, 
    messageId: string
  ): Promise<ConversationResponse | null> => {
    try {
      setError(null)
      
      const branchData: BranchRequest = { message_id: messageId }
      const newConversation = await apiClient.post<ConversationResponse>(
        `/conversations/${conversationId}/branch`, 
        branchData
      )
      
      // Convert to ConversationListItem format and add to the beginning of the list
      const listItem: ConversationListItem = {
        ...newConversation,
        message_count: 0,
        last_message_preview: undefined,
        last_message_at: undefined
      }
      setConversations(prev => [listItem, ...prev])
      
      return newConversation
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to branch conversation'
      setError(errorMessage)
      console.error('Error branching conversation:', err)
      return null
    }
  }, [])

  const editMessage = useCallback(async (
    conversationId: string, 
    messageId: string, 
    newContent: string
  ): Promise<ConversationResponse | null> => {
    try {
      setError(null)
      
      const editData: MessageEditRequest = { new_content: newContent }
      const response = await apiClient.post<MessageEditResponse>(
        `/conversations/${conversationId}/messages/${messageId}/edit`, 
        editData
      )
      
      // Convert to ConversationListItem format and add to the beginning of the list
      const listItem: ConversationListItem = {
        ...response.new_conversation,
        message_count: 0,
        last_message_preview: undefined,
        last_message_at: undefined
      }
      setConversations(prev => [listItem, ...prev])
      
      return response.new_conversation
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to edit message'
      setError(errorMessage)
      console.error('Error editing message:', err)
      return null
    }
  }, [])

  const retryMessage = useCallback(async (
    conversationId: string, 
    messageId: string, 
    model?: string
  ): Promise<ConversationResponse | null> => {
    try {
      setError(null)
      
      const retryData: MessageRetryRequest = { model }
      const response = await apiClient.post<MessageRetryResponse>(
        `/conversations/${conversationId}/messages/${messageId}/retry`, 
        retryData
      )
      
      // Convert to ConversationListItem format and add to the beginning of the list
      const listItem: ConversationListItem = {
        ...response.new_conversation,
        message_count: 0,
        last_message_preview: undefined,
        last_message_at: undefined
      }
      setConversations(prev => [listItem, ...prev])
      
      return response.new_conversation
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to retry message'
      setError(errorMessage)
      console.error('Error retrying message:', err)
      return null
    }
  }, [])

  const refreshConversations = useCallback(async () => {
    await fetchConversations()
  }, [fetchConversations])

  // Helper function to update conversation title (for real-time updates)
  const updateConversationTitle = useCallback((id: string, title: string) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === id ? { ...conv, title } : conv
      )
    )
  }, [])

  // Load conversations on mount (only once)
  useEffect(() => {
    if (!initialized) {
      fetchConversations()
    }
  }, [fetchConversations, initialized])

  const value: ConversationsContextType = {
    conversations,
    loading,
    error,
    createConversation,
    updateConversation,
    deleteConversation,
    branchConversation,
    editMessage,
    retryMessage,
    refreshConversations,
    updateConversationTitle,
  }

  return (
    <ConversationsContext.Provider value={value}>
      {children}
    </ConversationsContext.Provider>
  );
}

export function useConversations(): ConversationsContextType {
  const context = useContext(ConversationsContext);
  if (context === undefined) {
    throw new Error('useConversations must be used within a ConversationsProvider');
  }
  return context;
} 