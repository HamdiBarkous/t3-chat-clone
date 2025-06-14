import asyncio
import json
from typing import AsyncGenerator, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import ServerSentEvent
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
        openrouter_service: OpenRouterService,
        conversation_service: ConversationService
    ):
        self.message_service = message_service
        self.openrouter_service = openrouter_service
        self.conversation_service = conversation_service
    
    async def stream_chat_response(
        self,
        conversation_id: str,
        user_message: str,
        user_id: str,
        model: Optional[str] = None
    ) -> AsyncGenerator[ServerSentEvent, None]:
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
                # Get current conversation
                conversation = await self.conversation_service.get_conversation(conversation_uuid, user_uuid)
                if not conversation:
                    raise ValueError("Conversation not found")
                
                # Update model if different
                if model != conversation.current_model:
                    await self.conversation_service.update_conversation(
                        conversation_uuid,
                        user_uuid,
                        ConversationUpdate(current_model=model)
                    )
                    
                    # Send model switch event
                    yield ServerSentEvent(
                        data=json.dumps({
                            "conversation_id": conversation_id,
                            "previous_model": conversation.current_model,
                            "new_model": model
                        }),
                        event="model_switched"
                    )
            
            # Step 1: Create and send user message
            user_msg_create = MessageCreate(
                conversation_id=conversation_uuid,
                role=MessageRole.USER,
                content=user_message
            )
            
            user_message_obj = await self.message_service.create_message(
                message_create=user_msg_create,
                user_id=user_uuid
            )
            
            # Send user message event
            yield ServerSentEvent(
                data=json.dumps({
                    "id": str(user_message_obj.id),
                    "conversation_id": conversation_id,
                    "sequence_number": user_message_obj.sequence_number,
                    "role": "user",
                    "content": user_message,
                    "created_at": user_message_obj.created_at.isoformat()
                }),
                event="user_message"
            )
            
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
                status=MessageStatus.PENDING
            )
            assistant_message_id = assistant_message_obj.id
            
            # Send assistant message start event
            yield ServerSentEvent(
                data=json.dumps({
                    "id": str(assistant_message_obj.id),
                    "conversation_id": conversation_id,
                    "sequence_number": assistant_message_obj.sequence_number,
                    "role": "assistant",
                    "model_used": model,
                    "status": "streaming"
                }),
                event="assistant_message_start"
            )
            
            # Step 3: Update message status to streaming
            await self.message_service.update_message_status(
                message_id=assistant_message_id,
                status=MessageStatus.STREAMING
            )
            
            # Step 4: Stream AI response
            full_content = ""
            async for chunk in self.openrouter_service.stream_chat_completion(
                conversation_id=conversation_id,
                user_id=user_id,
                model=model
            ):
                if chunk:
                    full_content += chunk
                    # Send content chunk
                    yield ServerSentEvent(
                        data=json.dumps({
                            "message_id": str(assistant_message_id),
                            "chunk": chunk,
                            "full_content": full_content
                        }),
                        event="content_chunk"
                    )
            
            # Step 5: Update message with final content and mark as completed
            await self.message_service.update_message_content_and_status(
                message_id=assistant_message_id,
                content=full_content,
                status=MessageStatus.COMPLETED
            )
            
            # Send completion event
            yield ServerSentEvent(
                data=json.dumps({
                    "id": str(assistant_message_id),
                    "content": full_content,
                    "status": "completed",
                    "model_used": model
                }),
                event="assistant_message_complete"
            )
            
            # Step 6: Trigger title generation if this is the first exchange
            conversation_messages = await self.message_service.get_conversation_messages(
                conversation_id=conversation_uuid,
                user_id=user_uuid
            )
            
            if len(conversation_messages.messages) == 2:  # First user + first assistant message
                try:
                    # Generate title in background (don't wait for it)
                    asyncio.create_task(
                        self.openrouter_service.generate_conversation_title(
                            conversation_id=conversation_id,
                            user_id=user_id
                        )
                    )
                    yield ServerSentEvent(
                        data=json.dumps({
                            "conversation_id": conversation_id
                        }),
                        event="title_generation_started"
                    )
                except Exception as title_error:
                    logger.warning(f"Title generation failed: {title_error}")
            
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            
            # If we have an assistant message, mark it as failed
            if assistant_message_id:
                try:
                    await self.message_service.update_message_status(
                        message_id=assistant_message_id,
                        status=MessageStatus.FAILED
                    )
                except Exception as update_error:
                    logger.error(f"Failed to update message status: {update_error}")
            
            # Send error event
            yield ServerSentEvent(
                data=json.dumps({
                    "message": "An error occurred while processing your message",
                    "details": str(e) if logger.isEnabledFor(logging.DEBUG) else None
                }),
                event="error"
            ) 