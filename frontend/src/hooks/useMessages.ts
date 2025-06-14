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
  
  // Keep track of streaming content for real-time updates
  const streamingContentRef = useRef<string>('')

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
      
      // Convert MessageResponse to Message format
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

  const sendMessage = useCallback(async (content: string, model?: string) => {
    if (!conversationId || isStreaming) {
      return
    }

    try {
      setError(null)
      setIsStreaming(true)
      streamingContentRef.current = ''

      const streamCallbacks: StreamingCallbacks = {
        onUserMessage: (data: unknown) => {
          console.log('onUserMessage callback triggered with data:', data)
          const userMessageData = data as UserMessageData
          // Add user message to the list
          const userMessage: Message = {
            id: userMessageData.id,
            conversation_id: conversationId,
            sequence_number: userMessageData.sequence_number,
            sequence: userMessageData.sequence_number, // Add sequence alias
            role: 'user',
            content: userMessageData.content,
            status: MessageStatus.COMPLETED,
            created_at: userMessageData.created_at,
            model_used: undefined
          }
          
          console.log('Adding user message to state:', userMessage)
          setMessages(prev => {
            console.log('Previous messages:', prev.length)
            const newMessages = [...prev, userMessage]
            console.log('New messages:', newMessages.length)
            return newMessages
          })
        },

        onAssistantMessageStart: (data: unknown) => {
          const assistantStartData = data as AssistantMessageStartData
          // Add pending assistant message
          const assistantMessage: Message = {
            id: assistantStartData.id,
            conversation_id: conversationId,
            sequence_number: assistantStartData.sequence_number,
            sequence: assistantStartData.sequence_number, // Add sequence alias
            role: 'assistant',
            content: '',
            status: MessageStatus.STREAMING,
            created_at: new Date().toISOString(),
            model_used: assistantStartData.model_used
          }
          
          setStreamingMessageId(assistantStartData.id)
          setMessages(prev => [...prev, assistantMessage])
        },

        onContentChunk: (data: unknown) => {
          const chunkData = data as ContentChunkData
          // Update streaming message content
          streamingContentRef.current = chunkData.full_content
          
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
          // Mark message as completed
          setMessages(prev => 
            prev.map(msg => 
              msg.id === completeData.id 
                ? { 
                    ...msg, 
                    content: completeData.content,
                    status: MessageStatus.COMPLETED
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
          
          // Mark streaming message as failed if it exists
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

      // Start the streaming request
      await streamingService.startStream(
        conversationId,
        content,
        model,
        streamCallbacks
      )

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