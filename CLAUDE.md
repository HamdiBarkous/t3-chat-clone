# CLAUDE.md


This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

T3 Chat is a full-stack AI chat application with:
- **Backend**: Python FastAPI with Supabase database and OpenRouter API integration
- **Frontend**: Next.js React TypeScript with real-time messaging and file upload
- **AI Integration**: Multiple LLM providers via OpenRouter with tool/function calling
- **MCP Support**: Model Context Protocol clients for external integrations (Firecrawl, Tavily, Supabase)

### Backend Architecture (Python FastAPI)

The backend follows a clean architecture pattern:
- `app/api/`: API route handlers (conversations, messages, documents, tools, user, health)
- `app/services/`: Business logic (streaming, OpenRouter, conversation, message, profile services)
- `app/infrastructure/`: External integrations (Supabase, OpenRouter, MCP clients)
- `app/schemas/`: Pydantic models for validation
- `app/mcp_clients/`: MCP client implementations for tool integrations

Key services:
- **StreamingService**: Handles real-time SSE chat responses with minimal DB overhead
- **OpenRouterService**: Manages LLM API calls with tool execution and reasoning support
- **MessageService**: CRUD operations for chat messages with file attachments
- **ToolService**: Executes MCP tools (web search, document analysis, database operations)

### Frontend Architecture (Next.js)

React components organized by feature:
- `components/chat/`: Core chat interface (ChatInterface, MessageList, MessageInput)
- `components/auth/`: Authentication forms and guards
- `components/ui/`: Reusable UI components
- `contexts/`: React contexts for state management (Auth, Conversations, Theme)
- `hooks/`: Custom hooks for API integration and real-time updates

## Development Commands

### Backend (Python/uv)
```bash
cd backend
uv sync                    # Install dependencies
uv run main.py            # Run development server (localhost:8000)
uv run pytest tests/     # Run tests
```

### Frontend (Next.js)
```bash
cd frontend
npm install               # Install dependencies
npm run dev              # Run development server with Turbopack (localhost:3000)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
```

## Environment Configuration

Backend requires these environment variables:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `OPENROUTER_API_KEY`
- `FIRECRAWL_API_KEY`, `TAVILY_API_KEY` (optional MCP tools)

## Key Technical Features

- **Real-time Streaming**: SSE-based chat with tool execution progress
- **File Upload**: PDF/image processing with text extraction
- **Model Context Protocol**: Extensible tool system for external APIs
- **Multi-model Support**: Dynamic model switching per conversation
- **Reasoning Mode**: Extended thinking capabilities for complex queries
- **Conversation Branching**: Fork conversations at any message
- **Authentication**: Supabase Auth with JWT tokens
- **Responsive Design**: Mobile-first UI with dark/light themes

## Database Schema

Supabase PostgreSQL with:
- `conversations`: Chat sessions with model/title metadata
- `messages`: Individual messages with role, content, files, reasoning
- `profiles`: User profile information
- Row Level Security (RLS) policies for user data isolation

## Testing

Backend tests focus on:
- OpenRouter service integration
- Streaming service functionality  
- Tool execution and MCP clients
- Complete agent workflows

Use `uv run pytest tests/test_specific_file.py` for targeted testing.

## Development Rules

### Backend (Python)
- **Always use uv**: Use `uv run` for executing Python scripts and `uv add` for adding new modules
- **Never start servers**: Backend and frontend servers are already running - do not start them
- **Use uv not naked python**: Always use `uv run` instead of directly invoking Python

### Frontend (Next.js/React)
- **Use shadcn/ui**: All UI components should use shadcn/ui components and patterns
- **Use CSS variables**: Always use colors from `globals.css` - never hardcode colors in components
- **Never start servers**: Backend and frontend servers are already running - do not start them
