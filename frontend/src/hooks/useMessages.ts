import { useState, useEffect, useCallback, useRef } from 'react'
import { apiClient, ApiError, getApiBaseUrlWithoutVersion } from '@/lib/api'
import { supabase } from '@/lib/supabase'
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
  sendMessage: (content: string, model?: string, files?: File[], useTools?: boolean, enabledTools?: string[], reasoning?: boolean) => Promise<void>
  generateAIResponse: (model?: string) => Promise<void>
  loadMessages: () => Promise<void>
  isStreaming: boolean
  streamingMessageId: string | null
  toolExecutions: ToolCall[]
  reasoningPhases: Array<{
    id: string;
    content: string;
    startTime: number;
    endTime?: number;
  }>
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
  
  // Streaming state
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingReasoning, setStreamingReasoning] = useState('')
  const [reasoningStartTime, setReasoningStartTime] = useState<number | null>(null)
  
  // Track individual reasoning phases for chronological ordering
  const [reasoningPhases, setReasoningPhases] = useState<Array<{
    id: string;
    content: string;
    startTime: number;
    endTime?: number;
  }>>([])
  
  // Refs for accumulating streaming data
  const streamingContentRef = useRef('')
  const streamingReasoningRef = useRef('')
  const batchUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Reasoning timing tracking
  const reasoningStartTimeRef = useRef<number | null>(null)
  const currentReasoningPhaseRef = useRef<string | null>(null)
  
  // Deduplication tracking
  const lastSentMessageRef = useRef<{ content: string; timestamp: number } | null>(null)
  
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
    }, 100) // Reduced to 10fps to prevent layout thrashing
  }, [])

  // Reset conversation state when conversationId changes
  useEffect(() => {
    if (conversationId) {
      setMessages([])
      setToolExecutions([])
      setReasoningPhases([])
      setError(null)
      setIsStreaming(false)
      setStreamingMessageId(null)
      setStreamingContent('')
      setStreamingReasoning('')
      setReasoningStartTime(null)
      streamingContentRef.current = ''
      streamingReasoningRef.current = ''
      reasoningStartTimeRef.current = null
      currentReasoningPhaseRef.current = null
    }
  }, [conversationId])

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

  const sendMessage = useCallback(async (content: string, model?: string, files?: File[], useTools?: boolean, enabledTools?: string[], reasoning?: boolean) => {
    if (!conversationId || isStreaming) return

    // Prevent duplicate messages within 1 second
    const now = Date.now();
    if (lastSentMessageRef.current && 
        lastSentMessageRef.current.content === content && 
        now - lastSentMessageRef.current.timestamp < 1000) {
      return;
    }
    
    lastSentMessageRef.current = { content, timestamp: now };

    try {
      setError(null)
      setIsStreaming(true)
      
      // Reset streaming state
      setStreamingContent('')
      setStreamingReasoning('')
      streamingContentRef.current = ''
      streamingReasoningRef.current = ''
      
      // Clear tool executions for new message to prevent persistence
      setToolExecutions([]);
      setReasoningPhases([]);
      currentReasoningPhaseRef.current = null;

      // Step 1: Create user message first (non-streaming endpoint)
      let userMessageId: string | null = null
      
      try {
        const response = await fetch(`${getApiBaseUrlWithoutVersion()}/api/v1/conversations/${conversationId}/messages`, {
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

            const response = await fetch(`${getApiBaseUrlWithoutVersion()}/api/v1/messages/${userMessageId}/documents`, {
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
          
          // Track reasoning start time for chronological ordering
          if (!reasoningStartTimeRef.current) {
            reasoningStartTimeRef.current = Date.now()
            setReasoningStartTime(reasoningStartTimeRef.current)
          }
          
          // Only create new reasoning phase if we don't have a current one
          // Reasoning is continuous until interrupted by tool execution
          if (!currentReasoningPhaseRef.current) {
            // Start new reasoning phase
            const newPhaseId = `reasoning-${Date.now()}`
            currentReasoningPhaseRef.current = newPhaseId
            
            setReasoningPhases(prev => [...prev, {
              id: newPhaseId,
              content: reasoningData.chunk,
              startTime: Date.now(),
            }])
          } else {
            // Continue current reasoning phase (append content)
            setReasoningPhases(prev => prev.map(phase => 
              phase.id === currentReasoningPhaseRef.current
                ? { ...phase, content: phase.content + reasoningData.chunk }
                : phase
            ))
          }
          
          // Continue accumulating for the main display
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
          // Title generation started
        },

        onTitleComplete: (data: unknown) => {
          const titleData = data as { title: string }
          
          if (conversationId) {
            updateConversationTitle(conversationId, titleData.title)
          }
        },

        onToolCall: (data: unknown) => {
          const toolData = data as { name: string; arguments: Record<string, unknown>; status: string }
          
          // End current reasoning phase when tool execution starts
          if (currentReasoningPhaseRef.current) {
            const currentTime = Date.now()
            setReasoningPhases(prev => prev.map(phase => 
              phase.id === currentReasoningPhaseRef.current && !phase.endTime
                ? { ...phase, endTime: currentTime }
                : phase
            ))
            currentReasoningPhaseRef.current = null
          }
          
          // Add new tool execution
          const newTool: ToolCall = {
            id: `${toolData.name}-${Date.now()}`,
            name: toolData.name,
            status: 'executing',
            startTime: Date.now(),
            arguments: toolData.arguments,
          }

          setToolExecutions(prev => {
            const updated = [...prev, newTool]
            return updated
          })
        },

        onToolResult: (data: unknown) => {
          const resultData = data as { name: string; result?: unknown; error?: string; }
          
          setToolExecutions(prev => {
            const updated = prev.map(tool => {
              if (tool.name === resultData.name && tool.status === 'executing') {
                return {
                  ...tool,
                  status: (resultData.error ? 'failed' : 'completed') as 'failed' | 'completed',
                  result: typeof resultData.result === 'string' ? resultData.result : resultData.result ? JSON.stringify(resultData.result) : undefined,
                  error: resultData.error,
                  endTime: Date.now()
                }
              }
              return tool
            })
            return updated
          })
        },
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
          
          // Track reasoning start time for chronological ordering
          if (!reasoningStartTimeRef.current) {
            reasoningStartTimeRef.current = Date.now()
            setReasoningStartTime(reasoningStartTimeRef.current)
          }
          
          // Only create new reasoning phase if we don't have a current one
          // Reasoning is continuous until interrupted by tool execution
          if (!currentReasoningPhaseRef.current) {
            // Start new reasoning phase
            const newPhaseId = `reasoning-${Date.now()}`
            currentReasoningPhaseRef.current = newPhaseId
            
            setReasoningPhases(prev => [...prev, {
              id: newPhaseId,
              content: reasoningData.chunk,
              startTime: Date.now(),
            }])
          } else {
            // Continue current reasoning phase (append content)
            setReasoningPhases(prev => prev.map(phase => 
              phase.id === currentReasoningPhaseRef.current
                ? { ...phase, content: phase.content + reasoningData.chunk }
                : phase
            ))
          }
          
          // Continue accumulating for the main display
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
          // Title generation started
        },

        onTitleComplete: (data: unknown) => {
          const titleData = data as { title: string }
          
          if (conversationId) {
            updateConversationTitle(conversationId, titleData.title)
          }
        },

        onToolCall: (data: unknown) => {
          const toolData = data as { name: string; arguments: Record<string, unknown>; status: string }
          
          // End current reasoning phase when tool execution starts
          if (currentReasoningPhaseRef.current) {
            const currentTime = Date.now()
            setReasoningPhases(prev => prev.map(phase => 
              phase.id === currentReasoningPhaseRef.current && !phase.endTime
                ? { ...phase, endTime: currentTime }
                : phase
            ))
            currentReasoningPhaseRef.current = null
          }
          
          // Add new tool execution
          const newTool: ToolCall = {
            id: `${toolData.name}-${Date.now()}`,
            name: toolData.name,
            status: 'executing',
            startTime: Date.now(),
            arguments: toolData.arguments,
          }

          setToolExecutions(prev => {
            const updated = [...prev, newTool]
            return updated
          })
        },

        onToolResult: (data: unknown) => {
          const resultData = data as { name: string; result?: unknown; error?: string; }
          
          setToolExecutions(prev => {
            const updated = prev.map(tool => {
              if (tool.name === resultData.name && tool.status === 'executing') {
                return {
                  ...tool,
                  status: (resultData.error ? 'failed' : 'completed') as 'failed' | 'completed',
                  result: typeof resultData.result === 'string' ? resultData.result : resultData.result ? JSON.stringify(resultData.result) : undefined,
                  error: resultData.error,
                  endTime: Date.now()
                }
              }
              return tool
            })
            return updated
          })
        },
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
      // Only load messages if we don't have any messages for this conversation yet
      // This prevents race conditions with initial message sending
      const hasMessages = messages.length > 0;
      if (!hasMessages && !isStreaming) {
        loadMessages()
      }
    }
  }, [conversationId, loadMessages, messages.length, isStreaming])

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
    reasoningPhases,
    streamingContent,
    streamingReasoning,
    reasoningStartTime: reasoningStartTimeRef.current,
  }
} 