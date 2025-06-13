# T3 Chat Backend - Project Description

## 🎯 Project Overview

A FastAPI-based chat application backend that enables users to have conversations with various AI models through OpenRouter. The system supports conversation management, real-time streaming responses, and flexible model switching.

## 🏗️ Architecture

### **Framework & Stack**
- **Backend**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (JWT)
- **AI Provider**: OpenRouter API
- **Streaming**: Server-Sent Events (SSE)
- **Package Manager**: UV (as per user preference)

### **Project Structure**
```
app/
├── core/                   # Configuration, settings
├── api/                    # API endpoints/routers
├── models/                 # SQLAlchemy database models
├── schemas/                # Pydantic request/response schemas
├── services/               # Business logic layer
├── infrastructure/         # External integrations (Supabase, OpenRouter)
├── dependencies/           # FastAPI dependency injection
└── middleware/             # Custom middleware
```

## 🗄️ Database Schema

### **Users Table**
```sql
- id (uuid, primary key)
- email (text, unique)
- name (text)
- preferred_model (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

### **Conversations Table**
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key to users)
- title (text, nullable - auto-generated after first AI response)
- current_model (text - tracks last used model)
- system_prompt (text, nullable - per-conversation system prompt)
- created_at (timestamp)
- updated_at (timestamp)
```

### **Messages Table**
```sql
- id (uuid, primary key)
- conversation_id (uuid, foreign key to conversations)
- sequence_number (integer, auto-increment per conversation)
- role (enum: 'user', 'assistant')
- content (text)
- model_used (text, nullable - which model generated assistant messages)
- status (enum: 'pending', 'streaming', 'completed', 'failed')
- created_at (timestamp)
```

## 🚀 Core Features

### **Authentication**
- Supabase JWT-based authentication
- Frontend handles login/signup, backend validates tokens
- User session management through Supabase

### **Conversation Management**
- Create new conversations with optional system prompts
- Continue existing conversations
- Auto-generated conversation titles using `gpt-4o-mini`
- System prompt modification (replaces context approach)
- Model switching mid-conversation with full history retention

### **Message System**
- Sequence-based message ordering (prevents race conditions)
- Real-time streaming responses via SSE
- Message status tracking (pending → streaming → completed)
- Support for both user and assistant message types

### **AI Integration**
- OpenRouter API integration for multiple model access
- Model switching preserves full conversation context
- System prompt changes replace entire context (clean approach)
- Streaming responses with chunk-by-chunk delivery

### **Title Generation**
- Automatic title generation after first complete exchange
- Uses cost-effective `gpt-4o-mini` model
- Triggers in background after AI responds to first message

## 📡 API Endpoints

### **Conversations**
```
GET    /api/v1/conversations           # List user's conversations (paginated)
POST   /api/v1/conversations           # Create new conversation
GET    /api/v1/conversations/{id}      # Get conversation with messages
PATCH  /api/v1/conversations/{id}      # Update system prompt/model
DELETE /api/v1/conversations/{id}      # Delete conversation
```

### **Messages**
```
POST   /api/v1/conversations/{id}/messages                    # Send message
GET    /api/v1/conversations/{id}/messages                    # Get message history
GET    /api/v1/conversations/{id}/messages/{msg_id}/stream    # SSE stream endpoint
```

### **Models & User**
```
GET    /api/v1/models                  # List available OpenRouter models
GET    /api/v1/user/profile            # Get user profile
PATCH  /api/v1/user/profile            # Update user preferences
```

## 🔄 Key Workflows

### **New Conversation Flow**
1. User creates conversation with optional system prompt and model
2. User sends first message → stored as pending
3. SSE connection established for streaming
4. AI response streamed and stored
5. Background title generation triggered
6. Conversation title updated

### **System Prompt Change Flow**
1. User updates conversation system prompt
2. Next OpenRouter call uses new system prompt with full message history
3. AI reinterprets entire conversation through new context lens

### **Model Switching Flow**
1. User sends message with different model specified
2. Full conversation history sent to new model
3. New model continues conversation with complete context
4. Conversation's current_model updated

## 📊 Data Management

### **Message Pagination**
- Sequence-based cursor pagination for reliable ordering
- Default 20 messages per page
- Support for loading older/newer messages with `before_sequence` and `after_sequence`

### **Conversation Listing**
- Recent conversations with last message preview
- Ordered by last activity
- Includes message count and last activity timestamp

## 🔧 Technical Decisions

### **Authentication**: Supabase Auth over pure JWT
- **Reason**: Integrated ecosystem, built-in user management, RLS support

### **Streaming**: SSE over WebSocket
- **Reason**: Simpler implementation, HTTP-based, auto-reconnection

### **Message Ordering**: Sequence numbers over timestamps
- **Reason**: Prevents race conditions, guaranteed ordering

### **System Prompts**: Context replacement over message appending
- **Reason**: Clean, predictable behavior, no conflicting instructions

### **Title Generation**: After first AI response with cheap model
- **Reason**: More context for better titles, cost-effective

## 🚫 Explicitly Out of Scope (Phase 1)

- Rate limiting and abuse prevention
- Advanced error handling/retry logic
- Conversation search functionality
- Conversation archiving
- Message editing/deletion
- File uploads/attachments
- Multi-user conversations
- Advanced analytics/usage tracking

## 🎯 Success Criteria

- ✅ Users can create and manage conversations
- ✅ Real-time streaming chat experience
- ✅ Seamless model switching with context preservation
- ✅ Auto-generated conversation titles
- ✅ Flexible system prompt management
- ✅ Reliable message ordering and pagination
- ✅ Secure authentication and authorization 