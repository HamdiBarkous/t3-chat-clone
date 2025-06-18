import { apiClient } from './api'

export interface StreamEvent {
  type: string
  data: unknown
}

export interface StreamingCallbacks {
  onUserMessage?: (data: unknown) => void
  onAssistantMessageStart?: (data: unknown) => void
  onContentChunk?: (data: unknown) => void
  onReasoningChunk?: (data: unknown) => void
  onAssistantMessageComplete?: (data: unknown) => void
  onModelSwitched?: (data: unknown) => void
  onTitleGenerationStarted?: (data: unknown) => void
  onTitleComplete?: (data: unknown) => void
  onToolCall?: (data: unknown) => void
  onToolResult?: (data: unknown) => void
  onError?: (data: unknown) => void
  onConnectionError?: (error: Error) => void
  onConnectionClose?: () => void
}

export class StreamingService {
  private callbacks: StreamingCallbacks = {}

  async startStream(
    conversationId: string,
    message: string,
    model?: string,
    callbacks: StreamingCallbacks = {},
    useTools?: boolean,
    enabledTools?: string[],
    reasoning?: boolean
  ): Promise<void> {
    this.callbacks = callbacks

    try {
      const response = await apiClient.createStreamingRequest(
        `/conversations/${conversationId}/messages/stream`,
        { 
          message_content: message, 
          model,
          use_tools: useTools,
          enabled_tools: enabledTools,
          reasoning: reasoning
        }
      )

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body available')

      await this._processStream(reader)
    } catch (error) {
      this.callbacks.onConnectionError?.(error as Error)
    }
  }

  async startStreamWithExistingMessage(
    conversationId: string,
    message: string,
    model?: string,
    existingMessageId?: string,
    callbacks: StreamingCallbacks = {},
    useTools?: boolean,
    enabledTools?: string[],
    reasoning?: boolean
  ): Promise<void> {
    this.callbacks = callbacks

    try {
      const response = await apiClient.createStreamingRequest(
        `/conversations/${conversationId}/messages/stream`,
        { 
          message_content: message, 
          model,
          existing_user_message_id: existingMessageId,
          use_tools: useTools,
          enabled_tools: enabledTools,
          reasoning: reasoning
        }
      )

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body available')

      await this._processStream(reader)
    } catch (error) {
      this.callbacks.onConnectionError?.(error as Error)
    }
  }

  private async _processStream(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<void> {
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          this.callbacks.onConnectionClose?.()
          break
        }

        buffer += decoder.decode(value, { stream: true })
        buffer = this._processEventBuffer(buffer)
      }
    } catch (error) {
      this.callbacks.onConnectionError?.(error as Error)
    } finally {
      reader.releaseLock()
    }
  }

  private _processEventBuffer(buffer: string): string {
    while (this._hasEventSeparator(buffer)) {
      const { eventBlock, remainingBuffer } = this._extractNextEvent(buffer)
      
      if (eventBlock.trim()) {
        const event = this._parseSSEEvent(eventBlock)
        if (event) this._handleStreamEvent(event)
      }
      
      buffer = remainingBuffer
    }
    
    return buffer
  }

  private _hasEventSeparator(buffer: string): boolean {
    return buffer.includes('\r\n\r\n') || buffer.includes('\n\n')
  }

  private _extractNextEvent(buffer: string): { eventBlock: string; remainingBuffer: string } {
    let eventEndIndex = buffer.indexOf('\r\n\r\n')
    let separatorLength = 4

    if (eventEndIndex === -1) {
      eventEndIndex = buffer.indexOf('\n\n')
      separatorLength = 2
    }

    return {
      eventBlock: buffer.slice(0, eventEndIndex),
      remainingBuffer: buffer.slice(eventEndIndex + separatorLength)
    }
  }

  private _parseSSEEvent(block: string): StreamEvent | null {
    // Standard SSE parsing
    const lines = block.split(/\r?\n/)
    let eventType = ''
    let eventData = ''

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.slice(7).trim()
      } else if (line.startsWith('data: ')) {
        eventData = line.slice(6).trim()
      }
    }

    if (eventType && eventData) {
      try {
        return { type: eventType, data: JSON.parse(eventData) }
      } catch (error) {
        console.warn('Failed to parse SSE event data:', eventData, error)
      }
    }
    
    return null
  }

  private _handleStreamEvent(event: StreamEvent): void {
    const handlers: Record<string, ((data: unknown) => void) | undefined> = {
      user_message: this.callbacks.onUserMessage,
      assistant_message_start: this.callbacks.onAssistantMessageStart,
      content_chunk: this.callbacks.onContentChunk,
      reasoning: this.callbacks.onReasoningChunk,
      assistant_message_complete: this.callbacks.onAssistantMessageComplete,
      model_switched: this.callbacks.onModelSwitched,
      title_generation_started: this.callbacks.onTitleGenerationStarted,
      title_complete: this.callbacks.onTitleComplete,
      tool_call: this.callbacks.onToolCall,
      tool_result: this.callbacks.onToolResult,
      error: this.callbacks.onError,
    }

    const handler = handlers[event.type]
    if (handler) {
      handler(event.data)
    } else {
      console.warn('Unknown stream event type:', event.type, event.data)
    }
  }

  stopStream(): void {
    // Implementation for stopping stream if needed
  }
}

export const streamingService = new StreamingService() 