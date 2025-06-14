import { useState, useEffect, useCallback, useRef } from 'react'
import { apiClient, ApiError } from '@/lib/api'
import { streamingService, StreamingCallbacks } from '@/lib/streaming'
import type { Message, MessageListResponse, MessageResponse } from '@/types/api'
import { MessageStatus } from '@/types/api'

// Streaming event data interfaces
interface UserMessageData {
  id: string
  conversation_id: string
  sequence_number: number
  role: string
  content: string
  created_at: string
}

interface AssistantMessageStartData {
  id: string
  conversation_id: string
  sequence_number: number
  role: string
  model_used?: string
  status: string
}

interface ContentChunkData {
  message_id: string
  chunk: string
  full_content: string
}

interface AssistantMessageCompleteData {
  id: string
  content: string
  status: string
  model_used?: string
}

interface ErrorData {
  message: string
  details?: string
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

// Helper function to convert MessageResponse to Message
function convertToMessage(msgResponse: MessageResponse): Message {
  return {
    ...msgResponse,
    sequence: msgResponse.sequence_number, // Add sequence alias
    role: msgResponse.role === 'user' ? 'user' : 'assistant' // Convert enum to string literal
  }
}

export function useMessages(conversationId: string | null): UseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)

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
    sequence_number: data.sequence_number,
    sequence: data.sequence_number,
    role: 'user',
    content: data.content,
    status: MessageStatus.COMPLETED,
    created_at: data.created_at,
    model_used: undefined
  })

  const createAssistantMessage = (data: AssistantMessageStartData): Message => ({
    id: data.id,
    conversation_id: conversationId!,
    sequence_number: data.sequence_number,
    sequence: data.sequence_number,
    role: 'assistant',
    content: '',
    status: MessageStatus.STREAMING,
    created_at: new Date().toISOString(),
    model_used: data.model_used
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

        onAssistantMessageStart: (data: unknown) => {
          const assistantMessage = createAssistantMessage(data as AssistantMessageStartData)
          setStreamingMessageId(assistantMessage.id)
          setMessages(prev => [...prev, assistantMessage])
        },

        onContentChunk: (data: unknown) => {
          const chunkData = data as ContentChunkData
          setMessages(prev => 
            prev.map(msg => 
              msg.id === chunkData.message_id 
                ? { ...msg, content: chunkData.full_content }
                : msg
            )
          )
        },

        onAssistantMessageComplete: (data: unknown) => {
          const completeData = data as AssistantMessageCompleteData
          setMessages(prev => 
            prev.map(msg => 
              msg.id === completeData.id 
                ? { ...msg, content: completeData.content, status: MessageStatus.COMPLETED }
                : msg
            )
          )
          setIsStreaming(false)
          setStreamingMessageId(null)
        },

        onError: (data: unknown) => {
          const errorData = data as ErrorData
          setError(errorData.message || 'An error occurred while sending the message')
          
          if (streamingMessageId) {
            setMessages(prev => 
              prev.map(msg => 
                msg.id === streamingMessageId 
                  ? { ...msg, status: MessageStatus.FAILED }
                  : msg
              )
            )
          }
          
          setIsStreaming(false)
          setStreamingMessageId(null)
        },

        onConnectionError: (error) => {
          setError('Connection error: ' + error.message)
          setIsStreaming(false)
          setStreamingMessageId(null)
        },

        onConnectionClose: () => {
          setIsStreaming(false)
          setStreamingMessageId(null)
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
  }, [conversationId, isStreaming, streamingMessageId])

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      loadMessages()
    } else {
      setMessages([])
    }
  }, [conversationId, loadMessages])

  // Cleanup streaming on unmount
  useEffect(() => {
    return () => {
      streamingService.stopStream()
    }
  }, [])

  return {
    messages,
    loading,
    error,
    sendMessage,
    loadMessages,
    isStreaming,
    streamingMessageId,
  }
} 