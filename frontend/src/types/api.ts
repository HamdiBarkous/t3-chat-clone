/**
 * TypeScript types matching the backend API schemas
 * Based on FastAPI backend schemas and models
 */

// Base types
export type UUID = string;

// Message types
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant'
}

export enum MessageStatus {
  PENDING = 'pending',
  STREAMING = 'streaming',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface MessageBase {
  content: string;
  role: MessageRole;
}

export interface MessageCreate {
  content: string;
  model?: string; // Optional model override
}

export interface MessageResponse extends MessageBase {
  id: UUID;
  conversation_id: UUID;
  sequence_number: number;
  model_used?: string;
  status: MessageStatus;
  created_at: string;
}

export interface MessageListResponse {
  messages: MessageResponse[];
  total_count: number;
  has_more: boolean;
  next_cursor?: number; // sequence_number for pagination
}

export interface MessageHistoryQuery {
  limit?: number; // default 20
  before_sequence?: number; // Get messages before this sequence
  after_sequence?: number; // Get messages after this sequence
}

// Conversation types
export interface ConversationBase {
  title?: string;
  current_model: string;
  system_prompt?: string;
}

export type ConversationCreate = ConversationBase;

export interface ConversationUpdate {
  title?: string;
  current_model?: string;
  system_prompt?: string;
}

export interface ConversationResponse extends ConversationBase {
  id: UUID;
  user_id: UUID;
  created_at: string;
  updated_at: string;
}

export interface ConversationListItem {
  id: UUID;
  title?: string;
  current_model: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message_preview?: string;
  last_message_at?: string;
}

// Profile types
export interface ProfileResponse {
  id: UUID;
  email: string;
  name: string;
  preferred_model?: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdate {
  name?: string;
  preferred_model?: string;
}

// Model types
export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt: number;
    completion: number;
  };
}

// API Response types
export interface APIResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// Request types for specific endpoints
export interface StreamChatRequest {
  message_content: string;
  model?: string;
}

export interface SystemPromptUpdate {
  system_prompt: string;
}

export interface ModelUpdate {
  model: string;
}

// SSE Event types
export interface SSEEvent {
  type: 'message' | 'error' | 'complete';
  data: unknown;
}

export interface StreamingMessageChunk {
  content: string;
  is_complete: boolean;
  message_id?: UUID;
}

// Simplified Message type for components (with consistent role type)
export interface Message {
  id: UUID;
  conversation_id: UUID;
  sequence_number: number;
  sequence: number; // alias for sequence_number for backward compatibility
  role: 'user' | 'assistant'; // simplified string literals for components
  content: string;
  model_used?: string;
  status: MessageStatus;
  created_at: string;
}

// Type alias for conversation compatibility
export type Conversation = ConversationResponse; 