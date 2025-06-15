import { useState, useEffect, useCallback } from 'react'
import { apiClient, ApiError, supabase } from '@/lib/api'
import { streamingService, StreamingCallbacks } from '@/lib/streaming'
import type { Message, MessageListResponse, MessageResponse } from '@/types/api'
import { MessageStatus } from '@/types/api'
import { useConversations } from '@/contexts/ConversationsContext'

// Updated streaming event data interfaces for optimized backend

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
  sendMessage: (content: string, model?: string, files?: File[]) => Promise<void>
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



  const sendMessage = useCallback(async (content: string, model?: string, files?: File[]) => {
    if (!conversationId || isStreaming) return

    try {
      setError(null)
      setIsStreaming(true)

      // Step 1: Create user message first (non-streaming endpoint)
      let userMessageId: string | null = null
      
      try {
        const response = await fetch(`http://localhost:8000/api/v1/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: content,
            model: model
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to create message')
        }

        const messageData = await response.json()
        userMessageId = messageData.id
        
        // Add user message to UI immediately
        const userMessage: Message = {
          id: messageData.id,
          conversation_id: conversationId,
          role: 'user',
          content: content,
          status: MessageStatus.COMPLETED,
          created_at: messageData.created_at,
          model_used: messageData.model_used,
          timestamp: new Date(messageData.created_at).getTime()
        }
        setMessages(prev => [...prev, userMessage])

      } catch (error) {
        console.error('Failed to create user message:', error)
        setError('Failed to send message')
        setIsStreaming(false)
        return
      }

      // Step 2: Upload documents if any (BEFORE starting AI stream)
      if (files && files.length > 0 && userMessageId) {
        try {
          const uploadPromises = files.map(async (file) => {
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch(`http://localhost:8000/api/v1/messages/${userMessageId}/documents`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
              },
              body: formData,
            })

            if (!response.ok) {
              throw new Error(`Failed to upload ${file.name}`)
            }

            return response.json()
          })

          const uploadedDocs = await Promise.all(uploadPromises)
          
          // Update the user message with document metadata
          setMessages(prev => 
            prev.map(msg => 
              msg.id === userMessageId
                ? { ...msg, documents: uploadedDocs }
                : msg
            )
          )
        } catch (error) {
          console.error('File upload failed:', error)
          setError('Some files failed to upload, but your message was sent.')
          // Continue with AI processing even if file upload fails
        }
      }

      // Step 3: Now start AI streaming (documents are already uploaded)
      const streamCallbacks: StreamingCallbacks = {
        onUserMessage: async () => {
          // User message already created and displayed, skip this
        },

        onAssistantMessageStart: () => {
          // Create temporary streaming message with timestamp based on current state
          setStreamingMessageId('streaming-temp')
          setMessages(prev => {
            const now = Date.now()
            const lastMessageTime = prev.length > 0 ? Math.max(...prev.map(m => m.timestamp)) : now
            const timestamp = Math.max(now, lastMessageTime + 1)
            
            const assistantMessage: Message = {
              id: 'streaming-temp',
              conversation_id: conversationId!,
              role: 'assistant',
              content: '',
              status: MessageStatus.COMPLETED,
              created_at: new Date(timestamp).toISOString(),
              model_used: undefined,
              timestamp: timestamp
            }
            
            return [...prev, assistantMessage]
          })
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

      // Start streaming for AI response only (user message already created)
      await streamingService.startStreamWithExistingMessage(conversationId, content, model, userMessageId || undefined, streamCallbacks)

    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to send message'
      setError(errorMessage)
      setIsStreaming(false)
      setStreamingMessageId(null)
      console.error('Error sending message:', err)
    }
  }, [conversationId, isStreaming, updateConversationTitle])

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