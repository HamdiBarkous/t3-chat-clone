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
    """Minimal database overhead streaming service"""
    
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
        """Ultra-lightweight streaming with minimal DB operations"""
        conversation_uuid = UUID(conversation_id)
        user_uuid = UUID(user_id)
        
        try:
            # STEP 1: Create user message immediately (single DB write)
            user_msg = await self._create_user_message_only(conversation_uuid, user_uuid, user_message, model)
            
            yield self._create_sse_event("user_message", {
                "id": str(user_msg.id),
                "conversation_id": conversation_id,
                "role": "user",
                "content": user_message,
                "created_at": user_msg.created_at.isoformat(),
                "model_used": model
            })
            
            # STEP 2: Start streaming AI response immediately (no assistant message in DB yet)
            yield self._create_sse_event("assistant_message_start", {
                "conversation_id": conversation_id,
                "role": "assistant",
                "model_used": model,
                "status": "streaming"
            })
            
            # STEP 3: Stream content and collect it
            full_content = ""
            async for chunk in self.openrouter_service.stream_chat_completion(conversation_id, user_id, model):
                if chunk:
                    full_content += chunk
                    yield self._create_sse_event("content_chunk", {
                        "chunk": chunk,
                        "content_length": len(full_content)
                    })
            
            # STEP 4: Only NOW create the assistant message with final content (single DB write)
            assistant_msg = await self._create_assistant_message_final(
                conversation_uuid, user_uuid, full_content, model
            )
            
            yield self._create_sse_event("assistant_message_complete", {
                "id": str(assistant_msg.id),
                "content": full_content,
                "status": "completed",
                "model_used": model,
                "created_at": assistant_msg.created_at.isoformat()
            })
            
            # STEP 5: Background tasks (no waiting)
            asyncio.create_task(
                self._handle_background_tasks(conversation_uuid, user_uuid, conversation_id, model)
            )
            
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield self._create_sse_event("error", {
                "message": "An error occurred while processing your message",
                "error_type": type(e).__name__
            })
    
    async def _create_user_message_only(
        self, 
        conversation_uuid: UUID, 
        user_uuid: UUID, 
        content: str,
        model: Optional[str]
    ):
        """Create only the user message - no assistant placeholder"""
        return await self.message_service.message_repo.create_message_simple(
            conversation_id=conversation_uuid,
            user_id=user_uuid,
            role=MessageRole.USER,
            content=content,
            model_used=model,
            status=MessageStatus.COMPLETED
        )
    
    async def _create_assistant_message_final(
        self, 
        conversation_uuid: UUID, 
        user_uuid: UUID, 
        content: str,
        model: Optional[str]
    ):
        """Create assistant message with final content - no placeholder, no updates"""
        return await self.message_service.message_repo.create_message_simple(
            conversation_id=conversation_uuid,
            user_id=user_uuid,
            role=MessageRole.ASSISTANT,
            content=content,
            model_used=model,
            status=MessageStatus.COMPLETED
        )
    
    async def _handle_background_tasks(
        self, 
        conversation_uuid: UUID, 
        user_uuid: UUID, 
        conversation_id: str,
        model: Optional[str]
    ):
        """All non-critical operations run in background"""
        tasks = []
        
        # Model switching
        if model:
            tasks.append(self._update_conversation_model_background(conversation_uuid, user_uuid, model))
        
        # Title generation for first exchange
        tasks.append(self._maybe_generate_title_background(conversation_uuid, user_uuid, conversation_id))
        
        if tasks:
            try:
                await asyncio.gather(*tasks, return_exceptions=True)
            except Exception as e:
                logger.warning(f"Background task failed: {e}")
    
    async def _update_conversation_model_background(self, conversation_uuid: UUID, user_uuid: UUID, model: str):
        """Update conversation model in background"""
        try:
            conversation = await self.conversation_service.get_conversation(conversation_uuid, user_uuid)
            if conversation and model != conversation.current_model:
                await self.conversation_service.update_conversation(
                    conversation_uuid, user_uuid, ConversationUpdate(current_model=model)
                )
        except Exception as e:
            logger.warning(f"Model update failed: {e}")
    
    async def _maybe_generate_title_background(self, conversation_uuid: UUID, user_uuid: UUID, conversation_id: str):
        """Generate title in background if needed"""
        try:
            # Quick check if this might be first exchange
            messages = await self.message_service.get_conversation_messages(conversation_uuid, user_uuid)
            if len(messages.messages) == 2:  # User + assistant message
                await self.openrouter_service.generate_conversation_title(conversation_id, str(user_uuid))
        except Exception as e:
            logger.warning(f"Title generation failed: {e}")
    
    def _create_sse_event(self, event_type: str, data: Dict[str, Any]) -> ServerSentEvent:
        """Create SSE event"""
        return ServerSentEvent(data=json.dumps(data), event=event_type) 