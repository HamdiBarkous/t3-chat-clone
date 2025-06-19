/**
 * Conversations Context Provider
 * Manages conversations state globally to avoid multiple API calls
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { 
  ConversationListItem, 
  ConversationCreate, 
  ConversationUpdate, 
  ConversationResponse, 
  BranchRequest,
  MessageEditRequest,
  MessageRetryRequest,
  MessageEditResponse,
  MessageRetryResponse,
  CustomizationUpdate
} from '@/types/api';

interface ConversationsContextType {
  conversations: ConversationListItem[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  error: string | null
  createConversation: (data: ConversationCreate) => Promise<ConversationResponse | null>
  getConversation: (id: string) => Promise<ConversationResponse | null>
  updateConversation: (id: string, data: ConversationUpdate) => Promise<ConversationResponse | null>
  updateConversationCustomization: (id: string, data: CustomizationUpdate) => Promise<ConversationResponse | null>
  deleteConversation: (id: string) => Promise<boolean>
  branchConversation: (conversationId: string, messageId: string) => Promise<ConversationResponse | null>
  editMessage: (conversationId: string, messageId: string, newContent: string) => Promise<ConversationResponse | null>
  retryMessage: (conversationId: string, messageId: string, model?: string) => Promise<ConversationResponse | null>
  refreshConversations: () => Promise<void>
  loadMoreConversations: () => Promise<void>
  updateConversationTitle: (id: string, title: string) => void
}

const ConversationsContext = createContext<ConversationsContextType | undefined>(undefined);

const CONVERSATIONS_PER_PAGE = 20;

export function ConversationsProvider({ children }: { children: React.ReactNode }) {
  const { user, initialized: authInitialized } = useAuth()
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  const fetchConversations = useCallback(async (offset: number = 0, append: boolean = false) => {
    try {
      if (offset === 0) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      setError(null)
      
      const response = await apiClient.get<ConversationListItem[]>(
        `/conversations/?limit=${CONVERSATIONS_PER_PAGE}&offset=${offset}`
      )
      
      if (append) {
        setConversations(prev => [...prev, ...response])
      } else {
        setConversations(response)
      }
      
      // Check if we have more conversations to load
      setHasMore(response.length === CONVERSATIONS_PER_PAGE)
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to fetch conversations'
      setError(errorMessage)
      console.error('Error fetching conversations:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
      setInitialized(true)
    }
  }, [])

  const loadMoreConversations = useCallback(async () => {
    if (loadingMore || !hasMore) return
    
    const currentOffset = conversations.length
    await fetchConversations(currentOffset, true)
  }, [loadingMore, hasMore, conversations.length, fetchConversations])

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

  const getConversation = useCallback(async (id: string): Promise<ConversationResponse | null> => {
    try {
      setError(null)
      
      const conversation = await apiClient.get<ConversationResponse>(`/conversations/${id}`)
      return conversation
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to fetch conversation'
      setError(errorMessage)
      console.error('Error fetching conversation:', err)
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

  const updateConversationCustomization = useCallback(async (
    id: string, 
    data: CustomizationUpdate
  ): Promise<ConversationResponse | null> => {
    try {
      setError(null)
      
      const updatedConversation = await apiClient.patch<ConversationResponse>(`/conversations/${id}/customization`, data)
      
      // Update in the list (merge with existing list item data)
      setConversations(prev => 
        prev.map(conv => 
          conv.id === id ? { ...conv, ...updatedConversation } : conv
        )
      )
      
      return updatedConversation
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to update conversation customization'
      setError(errorMessage)
      console.error('Error updating conversation customization:', err)
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
    setHasMore(true)
    await fetchConversations(0, false)
  }, [fetchConversations])

  // Helper function to update conversation title (for real-time updates)
  const updateConversationTitle = useCallback((id: string, title: string) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === id ? { ...conv, title } : conv
      )
    )
  }, [])

  // Load conversations when user is authenticated
  useEffect(() => {
    if (authInitialized && user && !initialized) {
      // User is authenticated, load conversations
      fetchConversations(0, false)
    } else if (authInitialized && !user) {
      // User is not authenticated, stop loading and reset state
      setConversations([])
      setLoading(false)
      setError(null)
      setHasMore(true)
      setInitialized(true)
    }
  }, [fetchConversations, initialized, authInitialized, user])

  // Reset initialized flag when user changes (to allow re-loading)
  useEffect(() => {
    if (authInitialized) {
      setInitialized(false)
    }
  }, [authInitialized, user])

  const value: ConversationsContextType = {
    conversations,
    loading,
    loadingMore,
    hasMore,
    error,
    createConversation,
    getConversation,
    updateConversation,
    updateConversationCustomization,
    deleteConversation,
    branchConversation,
    editMessage,
    retryMessage,
    refreshConversations,
    loadMoreConversations,
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