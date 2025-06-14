import asyncio
import json
from typing import AsyncGenerator, Optional, Dict, Any
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
        """Stream a complete chat response with user message creation and AI response streaming"""
        conversation_uuid = UUID(conversation_id)
        user_uuid = UUID(user_id)
        assistant_message_id = None
        
        try:
            # Handle model switching if needed
            async for event in self._handle_model_switch(conversation_uuid, user_uuid, conversation_id, model):
                yield event
            
            # Create and send user message
            user_msg = await self._create_user_message(conversation_uuid, user_uuid, user_message)
            yield self._create_sse_event("user_message", {
                "id": str(user_msg.id),
                "conversation_id": conversation_id,
                "sequence_number": user_msg.sequence_number,
                "role": "user",
                "content": user_message,
                "created_at": user_msg.created_at.isoformat()
            })
            
            # Create assistant message and start streaming
            assistant_msg = await self._create_assistant_message(conversation_uuid, user_uuid, model)
            assistant_message_id = assistant_msg.id
            
            yield self._create_sse_event("assistant_message_start", {
                "id": str(assistant_msg.id),
                "conversation_id": conversation_id,
                "sequence_number": assistant_msg.sequence_number,
                "role": "assistant",
                "model_used": model,
                "status": "streaming"
            })
            
            # Stream AI response
            full_content = ""
            async for chunk in self.openrouter_service.stream_chat_completion(conversation_id, user_id, model):
                if chunk:
                    full_content += chunk
                    yield self._create_sse_event("content_chunk", {
                        "message_id": str(assistant_message_id),
                        "chunk": chunk,
                        "full_content": full_content
                    })
            
            # Complete the message
            await self._complete_assistant_message(assistant_message_id, full_content)
            yield self._create_sse_event("assistant_message_complete", {
                "id": str(assistant_message_id),
                "content": full_content,
                "status": "completed",
                "model_used": model
            })
            
            # Trigger title generation for first exchange
            await self._maybe_generate_title(conversation_uuid, user_uuid, conversation_id)
            
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            if assistant_message_id:
                await self._fail_message(assistant_message_id)
            yield self._create_sse_event("error", {
                "message": "An error occurred while processing your message"
            })
    
    async def _handle_model_switch(
        self, 
        conversation_uuid: UUID, 
        user_uuid: UUID, 
        conversation_id: str, 
        model: Optional[str]
    ) -> AsyncGenerator[ServerSentEvent, None]:
        """Handle model switching if needed"""
        if not model:
            return
            
        conversation = await self.conversation_service.get_conversation(conversation_uuid, user_uuid)
        if not conversation:
            raise ValueError("Conversation not found")
        
        if model != conversation.current_model:
            await self.conversation_service.update_conversation(
                conversation_uuid, user_uuid, ConversationUpdate(current_model=model)
            )
            yield self._create_sse_event("model_switched", {
                "conversation_id": conversation_id,
                "previous_model": conversation.current_model,
                "new_model": model
            })
    
    async def _create_user_message(self, conversation_uuid: UUID, user_uuid: UUID, content: str):
        """Create a user message"""
        return await self.message_service.create_message(
            MessageCreate(conversation_id=conversation_uuid, role=MessageRole.USER, content=content),
            user_uuid
        )
    
    async def _create_assistant_message(self, conversation_uuid: UUID, user_uuid: UUID, model: Optional[str]):
        """Create a pending assistant message"""
        assistant_msg = await self.message_service.create_message(
            MessageCreate(conversation_id=conversation_uuid, role=MessageRole.ASSISTANT, content="", model_used=model),
            user_uuid,
            status=MessageStatus.PENDING
        )
        await self.message_service.update_message_status(assistant_msg.id, MessageStatus.STREAMING)
        return assistant_msg
    
    async def _complete_assistant_message(self, message_id: UUID, content: str):
        """Complete an assistant message with final content"""
        await self.message_service.update_message_content_and_status(
            message_id, content, MessageStatus.COMPLETED
        )
    
    async def _fail_message(self, message_id: UUID):
        """Mark a message as failed"""
        try:
            await self.message_service.update_message_status(message_id, MessageStatus.FAILED)
        except Exception as e:
            logger.error(f"Failed to update message status: {e}")
    
    async def _maybe_generate_title(self, conversation_uuid: UUID, user_uuid: UUID, conversation_id: str):
        """Generate title if this is the first exchange"""
        messages = await self.message_service.get_conversation_messages(conversation_uuid, user_uuid)
        if len(messages.messages) == 2:  # First user + first assistant message
            try:
                asyncio.create_task(
                    self.openrouter_service.generate_conversation_title(conversation_id, str(user_uuid))
                )
            except Exception as e:
                logger.warning(f"Title generation failed: {e}")
    
    def _create_sse_event(self, event_type: str, data: Dict[str, Any]) -> ServerSentEvent:
        """Create a properly formatted SSE event"""
        return ServerSentEvent(data=json.dumps(data), event=event_type) 