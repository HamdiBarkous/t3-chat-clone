# T3 Chat Frontend - Implementation Plan

## 🎯 Overview
This plan outlines the implementation of a Next.js frontend that clones the T3.chat interface, connecting to our FastAPI backend for real-time AI chat functionality.

## 🏗️ **Architecture & Setup**

### **Framework & Stack**
- **Frontend**: Next.js 15+ with App Router ✅
- **Styling**: Tailwind CSS with custom color system ✅
- **Language**: TypeScript ✅
- **Authentication**: Supabase Auth (client-side) 🔄
- **State Management**: React Context + Custom hooks
- **HTTP Client**: Fetch API with custom wrappers
- **Real-time**: Server-Sent Events (SSE) for streaming

### **Custom Color System** ✅
- **Primary Theme**: Purple/violet accents (#8b5cf6, #7c3aed)
- **Dark Mode**: Optimized for dark interface (#1a1a1a backgrounds)
- **Utility Classes**: Pre-configured in `globals.css` and `colors.ts`
- **Consistent Palette**: Matches exact T3.chat visual style

---

## **Phase 1: Authentication & Setup** 🔄 **NEXT**

### **Step 1.1: Supabase Auth Setup**
- Configure Supabase client with environment variables
- Implement auth context provider
- Create login/signup forms with T3.chat styling
- Add auth middleware for protected routes

### **Step 1.2: API Integration Foundation**
- Create base API client with interceptors
- Implement auth token management
- Add error handling and retry logic
- Set up TypeScript types from backend schemas

---

## **Phase 2: Core Layout & Navigation**

### **Step 2.1: Main Layout Structure**
- Implement sidebar navigation (conversation list)
- Create main chat area layout
- Add responsive design for mobile/desktop
- Implement sidebar toggle functionality

### **Step 2.2: Conversation Management UI**
- Create "New Chat" button and modal
- Implement conversation list with titles and previews
- Add conversation selection and highlighting
- Create conversation settings (model, system prompt)

---

## **Phase 3: Chat Interface**

### **Step 3.1: Message Display**
- Create message components (user/assistant bubbles)
- Implement message list with proper scrolling
- Add message status indicators (pending, streaming, completed)
- Implement sequence-based message ordering

### **Step 3.2: Message Input System**
- Create message input component with auto-resize
- Add model selector dropdown in input area
- Implement send button with loading states
- Add keyboard shortcuts (Enter to send, Shift+Enter for newline)

---

## **Phase 4: Real-time Streaming**

### **Step 4.1: SSE Integration**
- Implement Server-Sent Events client
- Create streaming message component
- Add real-time message updates
- Handle connection errors and reconnection

### **Step 4.2: Message Flow**
- Connect message sending with streaming responses
- Implement typing indicators and loading states
- Add error handling for failed messages
- Create message retry functionality

---

## **Phase 5: Advanced Features**

### **Step 5.1: Model Management**
- Fetch and display available models from backend
- Implement model switching interface
- Add model information tooltips
- Create model preference settings

### **Step 5.2: System Prompts**
- Add system prompt editor in conversation settings
- Implement prompt templates and presets
- Create prompt management interface
- Add prompt preview functionality

---

## **Phase 6: User Experience Polish**

### **Step 6.1: Enhanced UI/UX**
- Add smooth animations and transitions
- Implement dark mode optimization
- Create loading skeletons for better UX
- Add toast notifications for user feedback

### **Step 6.2: Responsive & Accessibility**
- Optimize for mobile devices
- Add keyboard navigation support
- Implement proper ARIA labels
- Test with screen readers

---

## 🗂️ **Component Structure**

```
src/
├── components/
│   ├── ui/                          # Base UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   └── Dropdown.tsx
│   ├── auth/                        # Authentication components
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   └── AuthGuard.tsx
│   ├── chat/                        # Chat-specific components
│   │   ├── ChatLayout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── ConversationList.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── MessageInput.tsx
│   │   └── StreamingMessage.tsx
│   ├── conversation/                # Conversation management
│   │   ├── NewConversationModal.tsx
│   │   ├── ConversationSettings.tsx
│   │   └── SystemPromptEditor.tsx
│   └── models/                      # Model management
│       ├── ModelSelector.tsx
│       └── ModelInfo.tsx
├── hooks/                           # Custom React hooks
│   ├── useAuth.ts
│   ├── useConversations.ts
│   ├── useMessages.ts
│   ├── useStreaming.ts
│   └── useModels.ts
├── lib/                            # Utilities and configurations
│   ├── api.ts                      # API client
│   ├── auth.ts                     # Auth utilities
│   ├── streaming.ts                # SSE utilities
│   ├── colors.ts                   # Color system ✅
│   └── utils.ts                    # General utilities
├── types/                          # TypeScript definitions
│   ├── api.ts                      # API response types
│   ├── auth.ts                     # Auth types
│   └── conversation.ts             # Conversation types
└── contexts/                       # React contexts
    ├── AuthContext.tsx
    ├── ConversationContext.tsx
    └── ThemeContext.tsx
```

---

## 📡 **Backend API Integration**

### **Base URL**: `/api/v1`

### **Authentication**
- **Frontend handles**: Login, signup, token refresh
- **Backend validates**: JWT tokens from Supabase
- **Flow**: Supabase Auth → JWT → Backend validation

### **API Endpoints to Integrate**

#### **Conversations**
```typescript
GET    /conversations              // List user conversations
POST   /conversations              // Create new conversation
GET    /conversations/{id}         // Get conversation details
PATCH  /conversations/{id}         // Update conversation
DELETE /conversations/{id}         // Delete conversation
PATCH  /conversations/{id}/system-prompt  // Update system prompt
PATCH  /conversations/{id}/model   // Update model
```

#### **Messages**
```typescript
POST   /conversations/{id}/messages           // Send message
GET    /conversations/{id}/messages           // Get message history
POST   /conversations/{id}/messages/stream    // Stream chat response (SSE)
```

#### **Models & User**
```typescript
GET    /models                     // Available AI models
GET    /user/profile               // User profile
PATCH  /user/profile               // Update profile
```

---

## 🔄 **Key Data Flows**

### **Authentication Flow**
1. User signs in via Supabase Auth
2. Frontend receives JWT token
3. Token included in all API requests
4. Backend validates token with Supabase

### **New Conversation Flow**
1. User clicks "New Chat"
2. Create conversation via API
3. Update conversation list
4. Navigate to new conversation

### **Message Sending Flow**
1. User types message and hits send
2. POST to `/conversations/{id}/messages`
3. Immediately start SSE stream
4. Display streaming response in real-time
5. Update message list when complete

### **Model Switching Flow**
1. User selects different model
2. Update conversation model via API
3. Next message uses new model
4. UI reflects model change

---

## 🎨 **UI/UX Specifications**

### **Color Scheme** ✅
- **Background**: `#1a1a1a` (main), `#171717` (sidebar)
- **Purple Accents**: `#8b5cf6` (primary), `#7c3aed` (hover)
- **Text**: White primary, zinc variants for secondary
- **Borders**: `#3f3f46` for subtle separation

### **Typography**
- **Font**: System fonts (Arial, Helvetica, sans-serif)
- **Sizes**: Responsive scale (text-sm to text-xl)
- **Weight**: Regular for body, semibold for headings

### **Animations**
- **Smooth transitions**: 200ms ease-in-out
- **Hover effects**: Subtle color changes
- **Loading states**: Skeleton loaders and spinners
- **Message appearance**: Slide-in animations

---

## 🔧 **Technical Implementation Notes**

### **State Management Strategy**
- **Global State**: Auth, current conversation, user preferences
- **Local State**: Form inputs, UI toggles, temporary data
- **Server State**: React Query for caching and synchronization

### **Real-time Considerations**
- **SSE Connection**: Auto-reconnect on failure
- **Message Status**: Track pending, streaming, completed states
- **Error Handling**: Graceful degradation when streaming fails

### **Performance Optimizations**
- **Virtual scrolling**: For long conversation histories
- **Lazy loading**: Load conversations on demand
- **Debounced input**: Prevent excessive API calls
- **Memoization**: Optimize re-renders with React.memo

---

## 🚀 **Phase Completion Criteria**

### **Phase 1**: ✅ Auth working, can connect to backend
### **Phase 2**: ✅ Navigation and conversation management
### **Phase 3**: ✅ Basic chat interface with message display
### **Phase 4**: ✅ Real-time streaming responses
### **Phase 5**: ✅ Model switching and system prompts
### **Phase 6**: ✅ Polished, responsive, accessible interface

---

## 📦 **Dependencies to Add**

```json
{
  "@supabase/supabase-js": "^2.x",           // Supabase client
  "react-query": "^3.x",                     // Server state management
  "react-hook-form": "^7.x",                 // Form handling
  "zod": "^3.x",                            // Schema validation
  "date-fns": "^2.x",                       // Date utilities
  "class-variance-authority": "^0.x",        // CSS utility variants
  "clsx": "^2.x",                           // CSS class utilities
  "lucide-react": "^0.x"                    // Icons
}
```

---

## ⏱️ **Estimated Timeline**

- **Phase 1**: Auth & Setup (1-2 days)
- **Phase 2**: Layout & Navigation (1-2 days)
- **Phase 3**: Chat Interface (2-3 days)
- **Phase 4**: Real-time Streaming (2-3 days)
- **Phase 5**: Advanced Features (2-3 days)
- **Phase 6**: Polish & Optimization (1-2 days)

**Total**: ~9-15 days for complete T3.chat clone

---

## ✅ **Success Criteria**

- ✅ Pixel-perfect match to T3.chat interface
- ✅ Seamless real-time chat experience
- ✅ Responsive design (mobile + desktop)
- ✅ Fast, smooth interactions
- ✅ Robust error handling
- ✅ Accessible to all users
- ✅ Production-ready code quality 