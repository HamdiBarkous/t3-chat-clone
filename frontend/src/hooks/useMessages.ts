import { useState, useEffect, useCallback } from 'react'
import { apiClient, ApiError } from '@/lib/api'
import { streamingService, StreamingCallbacks } from '@/lib/streaming'
import type { Message, MessageListResponse, MessageResponse } from '@/types/api'
import { MessageStatus } from '@/types/api'
import { useConversations } from '@/contexts/ConversationsContext'

// Updated streaming event data interfaces for optimized backend
interface UserMessageData {
  id: string
  conversation_id: string
  role: string
  content: string
  created_at: string
  model_used?: string
}

// Removed unused interface AssistantMessageStartData

interface ContentChunkData {
  chunk: string
  content_length: number
}

interface AssistantMessageCompleteData {
  id: string
  content: string
  status: string
  model_used?: string
  created_at: string
}

interface ErrorData {
  message: string
  error_type?: string
}

interface UseMessagesReturn {
  messages: Message[]
  loading: boolean
  error: string | null
  sendMessage: (content: string, model?: string) => Promise<void>
  loadMessages: () => Promise<void>
  isStreaming: boolean
  streamingMessageId: string | null
}

// Helper function to convert MessageResponse to Message with timestamp
function convertToMessage(msgResponse: MessageResponse): Message {
  return {
    ...msgResponse,
    role: msgResponse.role === 'user' ? 'user' : 'assistant',
    timestamp: new Date(msgResponse.created_at).getTime()
  }
}

export function useMessages(conversationId: string | null): UseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  
  // Get conversation hook for title updates
  const { updateConversationTitle } = useConversations()

  const loadMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([])
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const response = await apiClient.get<MessageListResponse>(
        `/conversations/${conversationId}/messages?limit=100`
      )
      
      const messages: Message[] = response.messages.map(convertToMessage)
      setMessages(messages)
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load messages'
      setError(errorMessage)
      console.error('Error loading messages:', err)
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  const createUserMessage = (data: UserMessageData): Message => ({
    id: data.id,
    conversation_id: conversationId!,
    role: 'user',
    content: data.content,
    status: MessageStatus.COMPLETED,
    created_at: data.created_at,
    model_used: data.model_used,
    timestamp: new Date(data.created_at).getTime()
  })

  const createStreamingAssistantMessage = (): Message => ({
    id: 'streaming-temp', // Temporary ID until we get the real one
    conversation_id: conversationId!,
    role: 'assistant',
    content: '',
    status: MessageStatus.COMPLETED, // No more STREAMING status
    created_at: new Date().toISOString(),
    model_used: undefined,
    timestamp: Date.now()
  })

  const sendMessage = useCallback(async (content: string, model?: string) => {
    if (!conversationId || isStreaming) return

    try {
      setError(null)
      setIsStreaming(true)

      const streamCallbacks: StreamingCallbacks = {
        onUserMessage: (data: unknown) => {
          const userMessage = createUserMessage(data as UserMessageData)
          setMessages(prev => [...prev, userMessage])
        },

        onAssistantMessageStart: () => {
          // Create temporary streaming message
          const assistantMessage = createStreamingAssistantMessage()
          setStreamingMessageId(assistantMessage.id)
          setMessages(prev => [...prev, assistantMessage])
        },

        onContentChunk: (data: unknown) => {
          const chunkData = data as ContentChunkData
          
          // Update the streaming message with new content using functional update to avoid closure issues
          setMessages(prev => 
            prev.map(msg => 
              msg.id === 'streaming-temp'
                ? { ...msg, content: msg.content + chunkData.chunk }
                : msg
            )
          )
        },

        onAssistantMessageComplete: (data: unknown) => {
          const completeData = data as AssistantMessageCompleteData
          
          // Replace temporary message with real one
          setMessages(prev => 
            prev.map(msg => 
              msg.id === 'streaming-temp'
                ? {
                    ...msg,
                    id: completeData.id,
                    content: completeData.content,
                    status: MessageStatus.COMPLETED,
                    created_at: completeData.created_at,
                    model_used: completeData.model_used,
                    timestamp: new Date(completeData.created_at).getTime()
                  }
                : msg
            )
          )
          
          setIsStreaming(false)
          setStreamingMessageId(null)
        },

        onError: (data: unknown) => {
          const errorData = data as ErrorData
          setError(errorData.message || 'An error occurred while sending the message')
          
          // Remove streaming message on error
          setMessages(prev => prev.filter(msg => msg.id !== 'streaming-temp'))
          
          setIsStreaming(false)
          setStreamingMessageId(null)
        },

        onConnectionError: (error) => {
          setError('Connection error: ' + error.message)
          setIsStreaming(false)
          setStreamingMessageId(null)
          
          // Remove streaming message on connection error
          setMessages(prev => prev.filter(msg => msg.id !== 'streaming-temp'))
        },

        onConnectionClose: () => {
          setIsStreaming(false)
          setStreamingMessageId(null)
        },

        onTitleGenerationStarted: () => {
          console.log('Title generation started for conversation:', conversationId)
        },

        onTitleComplete: (data: unknown) => {
          const titleData = data as { conversation_id: string; title: string }
          console.log('Title generated:', titleData.title)
          
          // Update conversation title in the conversations list
          if (conversationId) {
            updateConversationTitle(conversationId, titleData.title)
          }
        }
      }

      await streamingService.startStream(conversationId, content, model, streamCallbacks)

    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to send message'
      setError(errorMessage)
      setIsStreaming(false)
      setStreamingMessageId(null)
      console.error('Error sending message:', err)
    }
  }, [conversationId, isStreaming, createUserMessage, createStreamingAssistantMessage, updateConversationTitle])

  // Load messages when conversation changes
  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  return {
    messages,
    loading,
    error,
    sendMessage,
    loadMessages,
    isStreaming,
    streamingMessageId
  }
} 