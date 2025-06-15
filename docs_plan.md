# Document Attachments Implementation Plan

## Overview
Adding text-based document attachments (PDF, TXT, code files) to the chatbot with the following requirements:
- Document content hidden from chat UI
- AI can read document content
- Separate `attached_documents` table (not in message content)
- Document content appended to AI context during processing

## Current Architecture Analysis

### Backend
- **FastAPI** with clean layered architecture (API → Service → Repository)
- **Supabase** database with existing models: Message, Conversation, Profile
- **OpenRouter** for AI processing with streaming responses
- **Message flow**: MessageInput → API → MessageService → MessageRepository → DB

### Frontend
- **Next.js/React** with TypeScript
- **SSE streaming** for real-time AI responses
- **Components**: MessageInput, MessageList, MessageBubble, etc.

## Implementation Plan

### Phase 1: Database & Backend Foundation
**Duration**: 1-2 days

#### Step 1: Database Schema & Models
- Create `attached_documents` table:
  ```sql
  CREATE TABLE attached_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INTEGER NOT NULL,
    content_text TEXT NOT NULL, -- extracted text content
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```
- Add Pydantic schemas in `app/schemas/document.py`
- Create `DocumentRepository` in `app/infrastructure/repositories/supabase/`

#### Step 2: Document Upload API
- Add `app/api/documents.py` with endpoints:
  - `POST /{message_id}/documents` - upload document
  - `GET /{message_id}/documents` - list documents (metadata only)
- Add `DocumentService` in `app/services/document_service.py`
- Add text extraction utilities (PyPDF2 for PDF, basic text for TXT/code)

### Phase 2: AI Integration & Context Enhancement
**Duration**: 1-2 days

#### Step 1: Document Content Integration
- Modify `MessageService.get_conversation_context_for_ai()` to include document content
- Update `StreamingService` to append document content before sending to AI
- Document content format: `[Document: filename.pdf]\n{content}\n[End Document]\n`

#### Step 2: Message Repository Enhancement
- Update `get_conversation_messages()` to include document metadata
- Add `get_message_documents()` method
- Ensure document content is never returned in regular message queries

### Phase 3: Frontend Integration
**Duration**: 1-2 days  

#### Step 1: File Upload UI
- Enhance `MessageInput.tsx` with file upload button
- Add drag-and-drop functionality
- File validation (PDF, TXT, common code extensions)
- Upload progress indicator

#### Step 2: Document Display & Management
- Update `MessageBubble.tsx` to show document attachments
- Add document icons/badges (show filename, type, size)
- Add delete document functionality
- Update TypeScript types in `types/api.ts`

## Technical Specifications

### File Support
- **PDF**: Text extraction using PyPDF2
- **Text files**: .txt, .md, .csv
- **Code files**: .py, .js, .ts, .jsx, .tsx, .java, .cpp, .c, .go, .rs, .php
- **Size limit**: 10MB per file
- **Content limit**: 50,000 characters extracted text per document

### API Endpoints
```
POST /conversations/{conversation_id}/messages/{message_id}/documents
GET /conversations/{conversation_id}/messages/{message_id}/documents  
DELETE /conversations/{conversation_id}/messages/{message_id}/documents/{document_id}
```

### Database Design
```sql
-- Simple, focused schema
attached_documents (
  id UUID PRIMARY KEY,
  message_id UUID REFERENCES messages(id),
  filename VARCHAR(255),
  file_type VARCHAR(50), 
  file_size INTEGER,
  content_text TEXT, -- extracted content for AI
  created_at TIMESTAMP
)
```

### Frontend Components
- `DocumentUpload.tsx` - file upload component
- `DocumentList.tsx` - display attached documents  
- `DocumentBadge.tsx` - individual document display
- Enhanced `MessageInput.tsx` with upload integration

## Implementation Notes

### Security Considerations
- File type validation on both frontend and backend
- File size limits enforced
- Content sanitization for extracted text
- User ownership validation for all document operations

### Performance Optimizations
- Document content loaded only for AI processing
- Lazy loading of document metadata
- Efficient text extraction with memory limits
- Database indexes on message_id and created_at

### User Experience
- Clear visual indicators for attached documents
- Non-intrusive upload process
- Error handling for failed uploads/processing
- Loading states for file processing

## Dependencies to Add

### Backend
```toml
# Add to pyproject.toml
PyPDF2 = "^3.0.1"           # PDF text extraction
python-multipart = "^0.0.6" # File upload handling
```

### Frontend
```json
// Add to package.json
"react-dropzone": "^14.2.3"  // File drag-and-drop
```

## Testing Strategy
- Unit tests for document extraction utilities
- Integration tests for upload/download workflows  
- E2E tests for complete user flow
- Performance tests for large document processing

This plan provides a clean, focused implementation without overengineering while meeting all specified requirements. 