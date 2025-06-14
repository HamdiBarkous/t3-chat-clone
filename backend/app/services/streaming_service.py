import asyncio
import json
from typing import AsyncGenerator, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.message_service import MessageService
from app.services.openrouter_service import OpenRouterService
from app.services.conversation_service import ConversationService
from app.schemas.message import MessageCreate
from app.schemas.conversation import ConversationUpdate
from app.models.message import MessageRole, MessageStatus
import logging

logger = logging.getLogger(__name__)


class StreamingService:
    """Service for handling real-time message streaming via SSE"""
    
    def __init__(
        self,
        message_service: MessageService,
        openrouter_service: OpenRouterService
    ):
        self.message_service = message_service
        self.openrouter_service = openrouter_service
    
    async def stream_chat_response(
        self,
        conversation_id: str,
        user_message: str,
        user_id: str,
        model: Optional[str] = None,
        db: AsyncSession = None
    ) -> AsyncGenerator[str, None]:
        """
        Stream a complete chat response including user message creation,
        AI response streaming, and status updates. Supports model switching.
        """
        assistant_message_id = None
        conversation_uuid = UUID(conversation_id)
        user_uuid = UUID(user_id)
        
        try:
            # Handle model switching if specified
            if model:
                # Get conversation service for model updates
                from app.infrastructure.repositories.conversation_repository import ConversationRepository
                conversation_service = ConversationService(ConversationRepository(db))
                
                # Get current conversation
                conversation = await conversation_service.get_conversation(conversation_uuid, user_uuid, db)
                if not conversation:
                    raise ValueError("Conversation not found")
                
                # Update model if different
                if model != conversation.current_model:
                    await conversation_service.update_conversation(
                        conversation_uuid,
                        user_uuid,
                        ConversationUpdate(current_model=model)
                    )
                    
                    # Send model switch event
                    yield self._format_sse_event("model_switched", {
                        "conversation_id": conversation_id,
                        "previous_model": conversation.current_model,
                        "new_model": model
                    })
            
            # Step 1: Create and send user message
            user_msg_create = MessageCreate(
                conversation_id=conversation_uuid,
                role=MessageRole.USER,
                content=user_message
            )
            
            user_message_obj = await self.message_service.create_message(
                message_create=user_msg_create,
                user_id=user_uuid,
                db=db
            )
            
            # Send user message event
            yield self._format_sse_event("user_message", {
                "id": str(user_message_obj.id),
                "conversation_id": conversation_id,
                "sequence_number": user_message_obj.sequence_number,
                "role": "user",
                "content": user_message,
                "created_at": user_message_obj.created_at.isoformat()
            })
            
            # Step 2: Create pending assistant message
            assistant_msg_create = MessageCreate(
                conversation_id=conversation_uuid,
                role=MessageRole.ASSISTANT,
                content="",  # Will be filled during streaming
                model_used=model
            )
            
            assistant_message_obj = await self.message_service.create_message(
                message_create=assistant_msg_create,
                user_id=user_uuid,
                db=db,
                status=MessageStatus.PENDING
            )
            assistant_message_id = assistant_message_obj.id
            
            # Send assistant message start event
            yield self._format_sse_event("assistant_message_start", {
                "id": str(assistant_message_obj.id),
                "conversation_id": conversation_id,
                "sequence_number": assistant_message_obj.sequence_number,
                "role": "assistant",
                "model_used": model,
                "status": "streaming"
            })
            
            # Step 3: Update message status to streaming
            await self.message_service.update_message_status(
                message_id=assistant_message_id,
                status=MessageStatus.STREAMING,
                db=db
            )
            
            # Step 4: Stream AI response
            full_content = ""
            async for chunk in self.openrouter_service.stream_chat_completion(
                conversation_id=conversation_id,
                user_id=user_id,
                model=model,
                db=db
            ):
                if chunk:
                    full_content += chunk
                    # Send content chunk
                    yield self._format_sse_event("content_chunk", {
                        "message_id": str(assistant_message_id),
                        "chunk": chunk,
                        "full_content": full_content
                    })
            
            # Step 5: Update message with final content and mark as completed
            await self.message_service.update_message_content_and_status(
                message_id=assistant_message_id,
                content=full_content,
                status=MessageStatus.COMPLETED,
                db=db
            )
            
            # Send completion event
            yield self._format_sse_event("assistant_message_complete", {
                "id": str(assistant_message_id),
                "content": full_content,
                "status": "completed",
                "model_used": model
            })
            
            # Step 6: Trigger title generation if this is the first exchange
            conversation_messages = await self.message_service.get_conversation_messages(
                conversation_id=conversation_uuid,
                user_id=user_uuid,
                db=db
            )
            
            if len(conversation_messages.messages) == 2:  # First user + first assistant message
                try:
                    # Generate title in background (don't wait for it)
                    asyncio.create_task(
                        self.openrouter_service.generate_conversation_title(
                            conversation_id=conversation_id,
                            user_id=user_id,
                            db=db
                        )
                    )
                    yield self._format_sse_event("title_generation_started", {
                        "conversation_id": conversation_id
                    })
                except Exception as title_error:
                    logger.warning(f"Title generation failed: {title_error}")
            
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            
            # If we have an assistant message, mark it as failed
            if assistant_message_id:
                try:
                    await self.message_service.update_message_status(
                        message_id=assistant_message_id,
                        status=MessageStatus.FAILED,
                        db=db
                    )
                except Exception as update_error:
                    logger.error(f"Failed to update message status: {update_error}")
            
            # Send error event
            yield self._format_sse_event("error", {
                "message": "An error occurred while processing your message",
                "details": str(e) if logger.isEnabledFor(logging.DEBUG) else None
            })
    
    def _format_sse_event(self, event_type: str, data: dict) -> str:
        """Format data as Server-Sent Event"""
        return f"event: {event_type}\ndata: {json.dumps(data)}\n\n" 