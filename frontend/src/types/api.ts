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
  COMPLETED = 'completed',
  FAILED = 'failed'
  // Removed PENDING and STREAMING - not used in new optimized backend
}

// Document types
export interface DocumentResponse {
  id: UUID;
  message_id: UUID;
  filename: string;
  file_type: string;
  file_size: number;
  is_image: boolean;
  created_at: string;
  // Note: content_text and image_base64 are never included in API responses
}

export interface DocumentListResponse {
  documents: DocumentResponse[];
  total_count: number;
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
  // Removed sequence_number - using timestamps for ordering
  model_used?: string;
  status: MessageStatus;
  created_at: string;
  // Document metadata (never includes document content)
  documents?: DocumentResponse[];
}

export interface MessageListResponse {
  messages: MessageResponse[];
  total_count: number;
  has_more: boolean;
  next_cursor?: string; // timestamp for pagination
}

export interface MessageHistoryQuery {
  limit?: number; // default 20
  before_timestamp?: string; // Get messages before this timestamp
  after_timestamp?: string; // Get messages after this timestamp
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

export interface BranchRequest {
  message_id: UUID;
}

// Document upload types
export interface DocumentUploadRequest {
  message_id: UUID;
}

export interface DocumentValidationResult {
  valid: boolean;
  error?: string;
  filename?: string;
  file_type?: string;
  file_size?: number;
  estimated_processing_time?: number;
}

export interface SupportedFileTypes {
  documents: Record<string, string>;
  text_files: Record<string, string>;
  code_files: Record<string, string>;
  images: Record<string, string>;
  limits: {
    max_file_size: string;
    max_content_length: string;
    supported_count: number;
  };
}

// SSE Event types for new optimized streaming
export interface SSEEvent {
  type: 'user_message' | 'assistant_message_start' | 'content_chunk' | 'assistant_message_complete' | 'error';
  data: unknown;
}

export interface StreamingMessageChunk {
  chunk: string;
  content_length: number;
}

// Simplified Message type for components
export interface Message {
  id: UUID;
  conversation_id: UUID;
  role: 'user' | 'assistant'; // simplified string literals for components
  content: string;
  model_used?: string;
  status: MessageStatus;
  created_at: string;
  // Add computed property for sorting by timestamp
  timestamp: number; // computed from created_at for sorting
  // Document attachments (metadata only)
  documents?: DocumentResponse[];
}

// Type alias for conversation compatibility
export type Conversation = ConversationResponse;

// Message editing and retrying types
export interface MessageEditRequest {
  new_content: string;
}

export interface MessageRetryRequest {
  model?: string;
}

export interface MessageEditResponse {
  message: string;
  new_conversation: ConversationResponse;
}

export interface MessageRetryResponse {
  message: string;
  new_conversation: ConversationResponse;
} 