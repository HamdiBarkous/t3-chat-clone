/**
 * Conversations Context Provider
 * Manages conversations state globally to avoid multiple API calls
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from '@/lib/api';
import type { ConversationListItem, ConversationCreate, ConversationUpdate, ConversationResponse } from '@/types/api';

interface ConversationsContextType {
  conversations: ConversationListItem[]
  loading: boolean
  error: string | null
  createConversation: (data: ConversationCreate) => Promise<ConversationResponse | null>
  updateConversation: (id: string, data: ConversationUpdate) => Promise<ConversationResponse | null>
  deleteConversation: (id: string) => Promise<boolean>
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