import { useState, useEffect, useCallback, useRef } from 'react'
import { apiClient, ApiError, supabase } from '@/lib/api'
import { streamingService, StreamingCallbacks } from '@/lib/streaming'
import type { Message, MessageListResponse, MessageResponse } from '@/types/api'
import { MessageStatus } from '@/types/api'
import { useConversations } from '@/contexts/ConversationsContext'
import type { ToolCall } from '@/components/chat/ToolExecution'

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
  sendMessage: (content: string, model?: string, files?: File[], useTools?: boolean, enabledTools?: string[], reasoning?: any) => Promise<void>
  generateAIResponse: (model?: string) => Promise<void>
  loadMessages: () => Promise<void>
  isStreaming: boolean
  streamingMessageId: string | null
  toolExecutions: ToolCall[]
  streamingContent: string // Direct access to streaming content for optimization
  streamingReasoning: string // Direct access to streaming reasoning content
  reasoningStartTime: number | null // When current reasoning started
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
  const [toolExecutions, setToolExecutions] = useState<ToolCall[]>([])
  
  // Optimized streaming state management
  const [streamingContent, setStreamingContent] = useState<string>('')
  const [streamingReasoning, setStreamingReasoning] = useState<string>('')
  const streamingContentRef = useRef<string>('')
  const streamingReasoningRef = useRef<string>('')
  const batchUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Reasoning timing tracking
  const reasoningStartTimeRef = useRef<number | null>(null)
  
  // Get conversation hook for title updates
  const { updateConversationTitle } = useConversations()

  // Simplified batched content update function
  const updateStreamingContent = useCallback(() => {
    if (batchUpdateTimeoutRef.current) {
      clearTimeout(batchUpdateTimeoutRef.current)
    }
    
    batchUpdateTimeoutRef.current = setTimeout(() => {
      setStreamingContent(streamingContentRef.current)
      setStreamingReasoning(streamingReasoningRef.current)
    }, 50) // 20fps update rate for smooth streaming
  }, [])

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

  const sendMessage = useCallback(async (content: string, model?: string, files?: File[], useTools?: boolean, enabledTools?: string[], reasoning?: any) => {
    if (!conversationId || isStreaming) return

    try {
      setError(null)
      setIsStreaming(true)
      
      // Reset streaming state
      setStreamingContent('')
      setStreamingReasoning('')
      streamingContentRef.current = ''
      streamingReasoningRef.current = ''

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
          console.log('Documents uploaded successfully:', uploadedDocs)
          
          // Update the user message with document metadata - ensure proper state update
          setMessages(prev => {
            const updatedMessages = prev.map(msg => 
              msg.id === userMessageId
                ? { 
                    ...msg, 
                    documents: uploadedDocs,
                    // Force re-render by updating timestamp slightly
                    timestamp: msg.timestamp + 1
                  }
                : msg
            )
            console.log('Documents attached to message successfully')
            return updatedMessages
          })
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
          setStreamingContent('')
          setStreamingReasoning('')
          streamingContentRef.current = ''
          streamingReasoningRef.current = ''
          reasoningStartTimeRef.current = null // Reset reasoning timer
          
          setMessages(prev => {
            const now = Date.now()
            const lastMessageTime = prev.length > 0 ? Math.max(...prev.map(m => m.timestamp)) : now
            const timestamp = Math.max(now, lastMessageTime + 1)
            
            const assistantMessage: Message = {
              id: 'streaming-temp',
              conversation_id: conversationId!,
              role: 'assistant',
              content: '', // Keep empty - use streamingContent for display
              reasoning: '', // Initialize reasoning field
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
          
          // Accumulate content and trigger batched update
          streamingContentRef.current += chunkData.chunk
          updateStreamingContent()
        },

        onReasoningChunk: (data: unknown) => {
          const reasoningData = data as { chunk: string; content_type: string }
          
          // Start timing if this is the first reasoning chunk
          if (reasoningStartTimeRef.current === null) {
            reasoningStartTimeRef.current = Date.now()
          }
          
          // Accumulate reasoning content and trigger batched update
          streamingReasoningRef.current += reasoningData.chunk
          updateStreamingContent()
        },

        onAssistantMessageComplete: (data: unknown) => {
          const completeData = data as AssistantMessageCompleteData
          
          // Clear any pending batch updates
          if (batchUpdateTimeoutRef.current) {
            clearTimeout(batchUpdateTimeoutRef.current)
            batchUpdateTimeoutRef.current = null
          }
          
          // Final update with complete content - update the actual message with reasoning
          setMessages(prev => 
            prev.map(msg => 
              msg.id === 'streaming-temp'
                ? {
                    ...msg,
                    id: completeData.id,
                    content: completeData.content, // Use final content from server
                    reasoning: streamingReasoningRef.current || '', // Store final reasoning content
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
          setStreamingContent('')
          setStreamingReasoning('')
          streamingContentRef.current = ''
          streamingReasoningRef.current = ''
          reasoningStartTimeRef.current = null
        },

        onError: (data: unknown) => {
          const errorData = data as ErrorData
          setError(errorData.message || 'An error occurred while sending the message')
          
          // Clean up streaming state
          if (batchUpdateTimeoutRef.current) {
            clearTimeout(batchUpdateTimeoutRef.current)
            batchUpdateTimeoutRef.current = null
          }
          
          // Remove streaming message on error
          setMessages(prev => prev.filter(msg => msg.id !== 'streaming-temp'))
          
          setIsStreaming(false)
          setStreamingMessageId(null)
          setStreamingContent('')
          setStreamingReasoning('')
          streamingContentRef.current = ''
          streamingReasoningRef.current = ''
        },

        onConnectionError: (error) => {
          setError('Connection error: ' + error.message)
          setIsStreaming(false)
          setStreamingMessageId(null)
          setStreamingContent('')
          setStreamingReasoning('')
          streamingContentRef.current = ''
          streamingReasoningRef.current = ''
          
          // Clean up streaming state
          if (batchUpdateTimeoutRef.current) {
            clearTimeout(batchUpdateTimeoutRef.current)
            batchUpdateTimeoutRef.current = null
          }
          
          // Remove streaming message on connection error
          setMessages(prev => prev.filter(msg => msg.id !== 'streaming-temp'))
        },

        onConnectionClose: () => {
          setIsStreaming(false)
          setStreamingMessageId(null)
          setStreamingContent('')
          setStreamingReasoning('')
          streamingContentRef.current = ''
          streamingReasoningRef.current = ''
          
          // Clean up streaming state
          if (batchUpdateTimeoutRef.current) {
            clearTimeout(batchUpdateTimeoutRef.current)
            batchUpdateTimeoutRef.current = null
          }
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
        },

        onToolCall: (data: unknown) => {
          const toolData = data as { name: string; arguments: Record<string, any>; status: string }
          
          // Add new tool execution
          const newTool: ToolCall = {
            id: `${toolData.name}-${Date.now()}`,
            name: toolData.name,
            arguments: toolData.arguments,
            status: 'executing',
            startTime: Date.now()
          }
          
          setToolExecutions(prev => [...prev, newTool])
        },

        onToolResult: (data: unknown) => {
          const resultData = data as { name: string; result: string; status: string }
          
          // Update the corresponding tool with result
          setToolExecutions(prev => 
            prev.map(tool => 
              tool.name === resultData.name && tool.status === 'executing'
                ? {
                    ...tool,
                    status: 'completed' as const,
                    result: resultData.result,
                    endTime: Date.now()
                  }
                : tool
            )
          )
        }
      }

      // Start streaming for AI response only (user message already created)
      await streamingService.startStreamWithExistingMessage(conversationId, content, model, userMessageId || undefined, streamCallbacks, useTools, enabledTools, reasoning)

    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to send message'
      setError(errorMessage)
      setIsStreaming(false)
      setStreamingMessageId(null)
      setStreamingContent('')
      setStreamingReasoning('')
      streamingContentRef.current = ''
      streamingReasoningRef.current = ''
      console.error('Error sending message:', err)
    }
  }, [conversationId, isStreaming, updateConversationTitle, updateStreamingContent])

  // Generate AI response for existing conversation (used for retry functionality)
  const generateAIResponse = useCallback(async (model?: string) => {
    if (!conversationId || isStreaming) return

    try {
      setError(null)
      setIsStreaming(true)
      
      // Reset streaming state
      setStreamingContent('')
      setStreamingReasoning('')
      streamingContentRef.current = ''
      streamingReasoningRef.current = ''

      // Get the last user message to use as context
      const lastUserMessage = messages.filter(msg => msg.role === 'user').slice(-1)[0]
      if (!lastUserMessage) {
        setError('No user message found to generate response for')
        setIsStreaming(false)
        return
      }

      const streamCallbacks: StreamingCallbacks = {
        onUserMessage: async () => {
          // Skip - we don't need to create a new user message
        },

        onAssistantMessageStart: () => {
          // Create temporary streaming message
          setStreamingMessageId('streaming-temp')
          setStreamingContent('')
          setStreamingReasoning('')
          streamingContentRef.current = ''
          streamingReasoningRef.current = ''
          
          setMessages(prev => {
            const now = Date.now()
            const lastMessageTime = prev.length > 0 ? Math.max(...prev.map(m => m.timestamp)) : now
            const timestamp = Math.max(now, lastMessageTime + 1)
            
            const assistantMessage: Message = {
              id: 'streaming-temp',
              conversation_id: conversationId!,
              role: 'assistant',
              content: '', // Keep empty - use streamingContent for display
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
          
          // Accumulate content and trigger batched update
          streamingContentRef.current += chunkData.chunk
          updateStreamingContent()
        },

        onReasoningChunk: (data: unknown) => {
          const reasoningData = data as { chunk: string; content_type: string }
          
          // Accumulate reasoning content and trigger batched update
          streamingReasoningRef.current += reasoningData.chunk
          updateStreamingContent()
        },

        onAssistantMessageComplete: (data: unknown) => {
          const completeData = data as AssistantMessageCompleteData
          
          // Clear any pending batch updates
          if (batchUpdateTimeoutRef.current) {
            clearTimeout(batchUpdateTimeoutRef.current)
            batchUpdateTimeoutRef.current = null
          }
          
          setMessages(prev => 
            prev.map(msg => 
              msg.id === 'streaming-temp'
                ? {
                    ...msg,
                    id: completeData.id,
                    content: completeData.content, // Use final content from server
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
          setStreamingContent('')
          setStreamingReasoning('')
          streamingContentRef.current = ''
          streamingReasoningRef.current = ''
        },

        onError: (data: unknown) => {
          const errorData = data as ErrorData
          setError(errorData.message || 'An error occurred while generating response')
          
          // Clean up streaming state
          if (batchUpdateTimeoutRef.current) {
            clearTimeout(batchUpdateTimeoutRef.current)
            batchUpdateTimeoutRef.current = null
          }
          
          setMessages(prev => prev.filter(msg => msg.id !== 'streaming-temp'))
          setIsStreaming(false)
          setStreamingMessageId(null)
          setStreamingContent('')
          setStreamingReasoning('')
          streamingContentRef.current = ''
          streamingReasoningRef.current = ''
        },

        onConnectionError: (error) => {
          setError('Connection error: ' + error.message)
          setIsStreaming(false)
          setStreamingMessageId(null)
          setStreamingContent('')
          setStreamingReasoning('')
          streamingContentRef.current = ''
          streamingReasoningRef.current = ''
          
          // Clean up streaming state
          if (batchUpdateTimeoutRef.current) {
            clearTimeout(batchUpdateTimeoutRef.current)
            batchUpdateTimeoutRef.current = null
          }
          
          setMessages(prev => prev.filter(msg => msg.id !== 'streaming-temp'))
        },

        onConnectionClose: () => {
          setIsStreaming(false)
          setStreamingMessageId(null)
          setStreamingContent('')
          setStreamingReasoning('')
          streamingContentRef.current = ''
          streamingReasoningRef.current = ''
          
          // Clean up streaming state
          if (batchUpdateTimeoutRef.current) {
            clearTimeout(batchUpdateTimeoutRef.current)
            batchUpdateTimeoutRef.current = null
          }
        },

        onTitleGenerationStarted: () => {
          console.log('Title generation started for conversation:', conversationId)
        },

        onTitleComplete: (data: unknown) => {
          const titleData = data as { conversation_id: string; title: string }
          console.log('Title generated:', titleData.title)
          
          if (conversationId) {
            updateConversationTitle(conversationId, titleData.title)
          }
        },

        onToolCall: (data: unknown) => {
          const toolData = data as { name: string; arguments: Record<string, any>; status: string }
          
          const newTool: ToolCall = {
            id: `${toolData.name}-${Date.now()}`,
            name: toolData.name,
            arguments: toolData.arguments,
            status: 'executing',
            startTime: Date.now()
          }
          
          setToolExecutions(prev => [...prev, newTool])
        },

        onToolResult: (data: unknown) => {
          const resultData = data as { name: string; result: string; status: string }
          
          setToolExecutions(prev => 
            prev.map(tool => 
              tool.name === resultData.name && tool.status === 'executing'
                ? {
                    ...tool,
                    status: 'completed' as const,
                    result: resultData.result,
                    endTime: Date.now()
                  }
                : tool
            )
          )
        }
      }

      // Generate AI response using the last user message
      await streamingService.startStreamWithExistingMessage(
        conversationId, 
        lastUserMessage.content, 
        model, 
        lastUserMessage.id, 
        streamCallbacks
      )

    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to generate AI response'
      setError(errorMessage)
      setIsStreaming(false)
      setStreamingMessageId(null)
      setStreamingContent('')
      setStreamingReasoning('')
      streamingContentRef.current = ''
      streamingReasoningRef.current = ''
      console.error('Error generating AI response:', err)
    }
  }, [conversationId, isStreaming, messages, updateConversationTitle, updateStreamingContent])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (batchUpdateTimeoutRef.current) {
        clearTimeout(batchUpdateTimeoutRef.current)
      }
    }
  }, [])

  // Reset conversation state when conversationId changes
  useEffect(() => {
    if (conversationId) {
      loadMessages()
    }
  }, [conversationId, loadMessages])

  return {
    messages,
    loading,
    error,
    sendMessage,
    generateAIResponse,
    loadMessages,
    isStreaming,
    streamingMessageId,
    toolExecutions,
    streamingContent, // Expose streaming content for optimized components
    streamingReasoning, // Expose streaming reasoning content
    reasoningStartTime: reasoningStartTimeRef.current,
  }
} 