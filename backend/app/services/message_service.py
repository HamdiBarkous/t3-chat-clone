from typing import Optional, List, TYPE_CHECKING
from uuid import UUID
import logging

from app.types import MessageRole, MessageStatus
from app.schemas.message import MessageCreate, MessageResponse, MessageListResponse, MessageHistoryQuery

if TYPE_CHECKING:
    from app.services.document_service import DocumentService

logger = logging.getLogger(__name__)


class MessageService:
    def __init__(self, message_repository, document_service: Optional["DocumentService"] = None):
        self.message_repository = message_repository
        self.document_service = document_service

    async def create_message(
        self, 
        message_create: MessageCreate,
        user_id: UUID,
        status: MessageStatus = MessageStatus.COMPLETED
    ) -> MessageResponse:
        """Create a new message with optimized DB operations"""
        try:
            # Use the simplified message creation
            message = await self.message_repository.create_message_simple(
                conversation_id=message_create.conversation_id,
                user_id=user_id,
                role=message_create.role,
                content=message_create.content,
                model_used=message_create.model_used,
                status=status
            )
            
            # Convert to response model
            return MessageResponse(
                id=message.id,
                conversation_id=message.conversation_id,
                role=message.role,
                content=message.content,
                model_used=message.model_used,
                status=message.status,
                created_at=message.created_at
            )
            
        except Exception as e:
            logger.error(f"Error creating message: {e}")
            raise ValueError(f"Failed to create message: {str(e)}")

    async def create_user_message(
        self, 
        conversation_id: UUID, 
        user_id: UUID, 
        message_data: MessageCreate
    ) -> MessageResponse:
        """Create a user message"""
        message = await self.message_repository.create_message(
            message_create=message_data,
            user_id=user_id,
            status=MessageStatus.COMPLETED
        )
        return MessageResponse.model_validate(message)

    async def create_assistant_message(
        self, 
        conversation_id: UUID, 
        user_id: UUID, 
        content: str, 
        model_used: str
    ) -> MessageResponse:
        """Create an assistant message"""
        message_data = MessageCreate(
            conversation_id=conversation_id,
            role=MessageRole.ASSISTANT,
            content=content,
            model_used=model_used
        )
        message = await self.message_repository.create_message(
            message_create=message_data,
            user_id=user_id,
            status=MessageStatus.COMPLETED
        )
        return MessageResponse.model_validate(message)

    async def get_message(self, message_id: UUID, user_id: UUID) -> Optional[MessageResponse]:
        """Get message by ID"""
        message = await self.message_repository.get_message_by_id(message_id, user_id)
        if message:
            return MessageResponse.model_validate(message)
        return None

    async def get_conversation_messages(
        self, 
        conversation_id: UUID, 
        user_id: UUID,
        query: MessageHistoryQuery
    ) -> MessageListResponse:
        """OPTIMIZED: Get messages with batch document loading"""
        try:
            messages, total_count, has_more = await self.message_repository.get_conversation_messages(
                conversation_id=conversation_id,
                user_id=user_id,
                limit=query.limit,
                before_timestamp=query.before_timestamp,
                after_timestamp=query.after_timestamp
            )
            
            # Convert to response models
            message_responses = []
            for message in messages:
                message_response = MessageResponse(
                    id=message.id,
                    conversation_id=message.conversation_id,
                    role=message.role,
                    content=message.content,
                    model_used=message.model_used,
                    status=message.status,
                    created_at=message.created_at
                )
                message_responses.append(message_response)
            
            # OPTIMIZED: Batch load documents for all messages at once
            if self.document_service and message_responses:
                try:
                    message_ids = [msg.id for msg in message_responses]
                    # Get all documents for all messages in a single query
                    all_documents = await self.document_service.get_documents_for_messages_batch(
                        message_ids, user_id
                    )
                    
                    # Group documents by message_id
                    docs_by_message = {}
                    for doc in all_documents:
                        if doc.message_id not in docs_by_message:
                            docs_by_message[doc.message_id] = []
                        docs_by_message[doc.message_id].append(doc)
                    
                    # Assign documents to messages
                    for message_response in message_responses:
                        message_response.documents = docs_by_message.get(message_response.id, [])
                        
                except Exception as e:
                    logger.warning(f"Failed to batch load documents: {e}")
                    # Set empty documents for all messages instead of failing
                    for message_response in message_responses:
                        message_response.documents = []
            
            # Calculate next cursor for pagination
            next_cursor = None
            if has_more and message_responses:
                next_cursor = message_responses[-1].created_at.isoformat()
            
            return MessageListResponse(
                messages=message_responses,
                total_count=total_count,
                has_more=has_more,
                next_cursor=next_cursor
            )
            
        except Exception as e:
            logger.error(f"Error getting conversation messages: {e}")
            raise ValueError(f"Failed to get conversation messages: {str(e)}")

    async def get_message_by_id(
        self, 
        message_id: UUID, 
        user_id: UUID
    ) -> Optional[MessageResponse]:
        """Get a specific message by ID with document metadata"""
        try:
            message = await self.message_repository.get_message_by_id(message_id, user_id)
            
            if not message:
                return None
                
            message_response = MessageResponse(
                id=message.id,
                conversation_id=message.conversation_id,
                role=message.role,
                content=message.content,
                model_used=message.model_used,
                status=message.status,
                created_at=message.created_at
            )
            
            # Add document metadata if document service is available
            if self.document_service:
                try:
                    docs_result = await self.document_service.get_message_documents(
                        message.id, user_id
                    )
                    message_response.documents = docs_result.documents
                except Exception as e:
                    logger.warning(f"Failed to get documents for message {message.id}: {e}")
                    message_response.documents = []
            
            return message_response
            
        except Exception as e:
            logger.error(f"Error getting message {message_id}: {e}")
            raise ValueError(f"Failed to get message: {str(e)}")

    async def update_message_status(
        self, 
        message_id: UUID, 
        status: MessageStatus
    ) -> Optional[MessageResponse]:
        """Update message status"""
        try:
            message = await self.message_repository.update_message_status(message_id, status)
            
            if not message:
                return None
                
            return MessageResponse(
                id=message.id,
                conversation_id=message.conversation_id,
                role=message.role,
                content=message.content,
                model_used=message.model_used,
                status=message.status,
                created_at=message.created_at
            )
            
        except Exception as e:
            logger.error(f"Error updating message status: {e}")
            raise ValueError(f"Failed to update message status: {str(e)}")

    async def update_message_content_and_status(
        self,
        message_id: UUID,
        content: str,
        status: MessageStatus
    ) -> Optional[MessageResponse]:
        """Update message content and status"""
        message = await self.message_repository.update_message_content_and_status(
            message_id=message_id,
            content=content,
            status=status
        )
        return MessageResponse.model_validate(message) if message else None

    async def get_conversation_context_for_ai(
        self, 
        conversation_id: UUID, 
        user_id: UUID,
        include_documents: bool = True
    ) -> List[MessageResponse]:
        """Get all messages for AI context with document content appended"""
        try:
            # Get all messages
            messages = await self.message_repository.get_conversation_context(
                conversation_id=conversation_id,
                user_id=user_id
            )
            
            message_responses = [MessageResponse.model_validate(msg) for msg in messages]
            
            # If document service is available and we want to include documents
            if include_documents and self.document_service:
                # Get all documents for this conversation
                documents = await self.document_service.get_conversation_documents_for_ai(
                    conversation_id, user_id
                )
                
                if documents:
                    # Group documents by message_id for efficient processing
                    docs_by_message = {}
                    for doc in documents:
                        if doc.message_id not in docs_by_message:
                            docs_by_message[doc.message_id] = []
                        docs_by_message[doc.message_id].append(doc)
                    
                    # Append document content to respective messages
                    for message in message_responses:
                        if message.id in docs_by_message:
                            message_docs = docs_by_message[message.id]
                            
                            # Separate images from text documents
                            images = [doc for doc in message_docs if doc.is_image]
                            text_docs = [doc for doc in message_docs if not doc.is_image]
                            
                            if images or text_docs:
                                # Handle vision messages (images + text)
                                if images:
                                    # Format as vision-compatible content array
                                    content_parts = [{"type": "text", "text": message.content}]
                                    
                                    # Add images to content
                                    for img in images:
                                        content_parts.append({
                                            "type": "image_url",
                                            "image_url": {"url": f"data:image/{img.file_type};base64,{img.image_base64}"}
                                        })
                                    
                                    # Add text documents if any
                                    if text_docs:
                                        doc_content_parts = []
                                        for doc in text_docs:
                                            doc_content_parts.append(
                                                f"[Document: {doc.filename}]\n{doc.content_text}\n[End Document]"
                                            )
                                        # Append to the text part
                                        content_parts[0]["text"] += "\n\n" + "\n\n".join(doc_content_parts)
                                    
                                    # Set content as array for vision processing
                                    message.content = content_parts
                                
                                elif text_docs:
                                    # Text-only documents (existing behavior)
                                    doc_content_parts = []
                                    for doc in text_docs:
                                        doc_content_parts.append(
                                            f"[Document: {doc.filename}]\n{doc.content_text}\n[End Document]"
                                        )
                                    
                                    if doc_content_parts:
                                        # Append document content to message content
                                        enhanced_content = message.content + "\n\n" + "\n\n".join(doc_content_parts)
                                        message.content = enhanced_content
            
            return message_responses
            
        except Exception as e:
            logger.error(f"Error getting conversation context for AI: {e}")
            # Fallback to messages without documents to avoid breaking AI
            messages = await self.message_repository.get_conversation_context(
                conversation_id=conversation_id,
                user_id=user_id
            )
            return [MessageResponse.model_validate(msg) for msg in messages]

    async def get_first_message(
        self, 
        conversation_id: UUID
    ) -> Optional[MessageResponse]:
        """Get first message (for title generation)"""
        message = await self.message_repository.get_first_message_in_conversation(
            conversation_id=conversation_id
        )
        if message:
            return MessageResponse.model_validate(message)
        return None

    async def get_conversation_context(
        self, 
        conversation_id: UUID, 
        user_id: UUID
    ) -> List[MessageResponse]:
        """Get conversation context for AI processing"""
        try:
            messages = await self.message_repository.get_conversation_context(conversation_id, user_id)
            
            # Convert to response models
            return [
                MessageResponse(
                    id=message.id,
                    conversation_id=message.conversation_id,
                    role=message.role,
                    content=message.content,
                    model_used=message.model_used,
                    status=message.status,
                    created_at=message.created_at
                )
                for message in messages
            ]
            
        except Exception as e:
            logger.error(f"Error getting conversation context: {e}")
            raise ValueError(f"Failed to get conversation context: {str(e)}")

    async def create_ai_response(
        self,
        conversation_id: UUID,
        user_id: UUID,
        content: str,
        model_used: str
    ) -> MessageResponse:
        """Create an AI assistant response message"""
        try:
            message = await self.message_repository.create_message_simple(
                conversation_id=conversation_id,
                user_id=user_id,
                role=MessageRole.ASSISTANT,
                content=content,
                model_used=model_used,
                status=MessageStatus.COMPLETED
            )
            
            return MessageResponse(
                id=message.id,
                conversation_id=message.conversation_id,
                role=message.role,
                content=message.content,
                model_used=message.model_used,
                status=message.status,
                created_at=message.created_at
            )
            
        except Exception as e:
            logger.error(f"Error creating AI response: {e}")
            raise ValueError(f"Failed to create AI response: {str(e)}") 