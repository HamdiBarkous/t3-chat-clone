import json
import logging
from typing import AsyncGenerator, Optional
from uuid import UUID

from app.services.message_service import MessageService
from app.services.openrouter_service import OpenRouterService
from app.services.conversation_service import ConversationService
from app.types import MessageRole
from app.schemas.message import MessageCreate

logger = logging.getLogger(__name__)


class StreamingService:
    """Minimal database overhead streaming service with proper SSE format"""
    
    def __init__(
        self,
        message_service: MessageService,
        openrouter_service: OpenRouterService,
        conversation_service: ConversationService
    ):
        self.message_service = message_service
        self.openrouter_service = openrouter_service
        self.conversation_service = conversation_service
    
    def _format_sse_event(self, event_type: str, data: dict) -> str:
        """Format data as standard Server-Sent Event"""
        # Standard SSE format: event: type\ndata: json\n\n
        return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
    
    async def stream_chat_response(
        self,
        conversation_id: str,
        user_message: str,
        user_id: str,
        model: Optional[str] = None,
        existing_user_message_id: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """Ultra-fast streaming with minimal DB overhead and proper SSE format"""
        
        conversation_uuid = UUID(conversation_id)
        user_uuid = UUID(user_id)
        
        try:
            # Get conversation to check model
            conversation = await self.conversation_service.get_conversation(
                conversation_uuid, user_uuid
            )
            
            if not conversation:
                yield self._format_sse_event('error', {'message': 'Conversation not found'})
                return
            
            # Use provided model or conversation default
            selected_model = model or conversation.current_model
            
            # Handle user message - either use existing or create new
            user_message_obj = None
            
            if existing_user_message_id:
                # Use existing user message (for document upload flow)
                try:
                    user_message_obj = await self.message_service.get_message_by_id(
                        UUID(existing_user_message_id), user_uuid
                    )
                    
                    if not user_message_obj:
                        yield self._format_sse_event('error', {'message': 'Existing user message not found'})
                        return
                    
                    # Send user message confirmation with proper format
                    yield self._format_sse_event('user_message', {
                        'id': str(user_message_obj.id),
                        'conversation_id': str(conversation_uuid),
                        'role': 'user',
                        'content': user_message_obj.content,
                        'created_at': user_message_obj.created_at.isoformat(),
                        'model_used': user_message_obj.model_used or selected_model
                    })
                    
                except Exception as e:
                    logger.error(f"Failed to get existing user message: {e}")
                    yield self._format_sse_event('error', {'message': 'Failed to get existing user message'})
                    return
            else:
                # Create new user message (original flow)
                try:
                    message_create = MessageCreate(
                        conversation_id=conversation_uuid,
                        role=MessageRole.USER,
                        content=user_message,
                        model_used=selected_model
                    )
                    
                    user_message_obj = await self.message_service.create_message(
                        message_create=message_create,
                        user_id=user_uuid
                    )
                    
                    # Send user message confirmation with proper format
                    yield self._format_sse_event('user_message', {
                        'id': str(user_message_obj.id),
                        'conversation_id': str(conversation_uuid),
                        'role': 'user',
                        'content': user_message,
                        'created_at': user_message_obj.created_at.isoformat(),
                        'model_used': selected_model
                    })
                    
                except Exception as e:
                    logger.error(f"Failed to create user message: {e}")
                    yield self._format_sse_event('error', {'message': 'Failed to save user message'})
                    return
            
            # Send assistant message start event
            yield self._format_sse_event('assistant_message_start', {
                'conversation_id': str(conversation_uuid),
                'role': 'assistant',
                'model_used': selected_model,
                'status': 'completed'
            })
            
            # Stream AI response - collect content for final message
            ai_response_content = ""
            content_length = 0
            
            async for chunk in self.openrouter_service.stream_chat_completion_with_tools(
                conversation_id=conversation_id,
                user_id=user_id,
                model=selected_model
            ):
                # Handle tool-enabled streaming (returns JSON) vs regular streaming (returns text)
                try:
                    # Try to parse as JSON (tool-enabled format)
                    if chunk.startswith("data: "):
                        chunk_data = json.loads(chunk[6:])  # Remove "data: " prefix
                        
                        if chunk_data.get('type') == 'content':
                            # Regular content chunk
                            content = chunk_data.get('data', '')
                            ai_response_content += content
                            content_length += len(content)
                            
                            yield self._format_sse_event('content_chunk', {
                                'chunk': content,
                                'content_length': content_length
                            })
                            
                        elif chunk_data.get('type') == 'tool_call':
                            # Tool call event - pass through
                            yield self._format_sse_event('tool_call', chunk_data.get('data', {}))
                            
                        elif chunk_data.get('type') == 'tool_result':
                            # Tool result event - pass through  
                            yield self._format_sse_event('tool_result', chunk_data.get('data', {}))
                            
                except (json.JSONDecodeError, KeyError):
                    # Fallback: treat as plain text (regular streaming)
                    ai_response_content += chunk
                    content_length += len(chunk)
                    
                    yield self._format_sse_event('content_chunk', {
                        'chunk': chunk,
                        'content_length': content_length
                    })
            
            # Create AI response message
            ai_message_obj = None
            if ai_response_content.strip():
                try:
                    ai_message_obj = await self._create_ai_message_async(
                        conversation_uuid, user_uuid, ai_response_content, selected_model
                    )
                except Exception as e:
                    logger.error(f"Failed to create AI message: {e}")
                    yield self._format_sse_event('error', {'message': 'Failed to save AI response'})
                    return
            
            # Send completion event with final message data
            if ai_message_obj:
                yield self._format_sse_event('assistant_message_complete', {
                    'id': str(ai_message_obj.id),
                    'content': ai_response_content,
                    'status': 'completed',
                    'model_used': selected_model,
                    'created_at': ai_message_obj.created_at.isoformat()
                })
                
                # Check if we should generate a title (after first AI response)
                async for title_event in self._check_and_generate_title_stream(conversation_uuid, user_uuid, conversation_id, user_id):
                    yield title_event
            
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield self._format_sse_event('error', {'message': f'Streaming failed: {str(e)}'})
    
    async def _create_ai_message_async(
        self, 
        conversation_id: UUID, 
        user_id: UUID, 
        content: str, 
        model: str
    ) -> object:
        """Create AI response message asynchronously and return the message object"""
        try:
            message_create = MessageCreate(
                conversation_id=conversation_id,
                role=MessageRole.ASSISTANT,
                content=content,
                model_used=model
            )
            
            return await self.message_service.create_message(
                message_create=message_create,
                user_id=user_id
            )
        except Exception as e:
            logger.error(f"Error creating AI message: {e}")
            raise  # Re-raise to handle in calling function
    
    async def _check_and_generate_title_stream(
        self,
        conversation_uuid: UUID,
        user_uuid: UUID,
        conversation_id: str,
        user_id: str
    ):
        """Check if conversation needs a title and generate it, streaming the events"""
        try:
            # Get conversation to check if it already has a title
            conversation = await self.conversation_service.get_conversation(
                conversation_uuid, user_uuid
            )
            
            if not conversation or conversation.title:
                return  # Already has a title, skip
                
            # Check if we have exactly 2 messages (user + assistant)
            messages = await self.message_service.get_conversation_context_for_ai(
                conversation_uuid, user_uuid
            )
            
            if len(messages) == 2:
                # Send title generation started event
                yield self._format_sse_event('title_generation_started', {
                    'conversation_id': conversation_id
                })
                
                # Generate title
                try:
                    title = await self.openrouter_service.generate_conversation_title(
                        conversation_id=conversation_id,
                        user_id=user_id
                    )
                    
                    if title:
                        # Send title complete event
                        yield self._format_sse_event('title_complete', {
                            'conversation_id': conversation_id,
                            'title': title
                        })
                        logger.info(f"Generated title '{title}' for conversation {conversation_id}")
                    else:
                        yield self._format_sse_event('error', {'message': 'Could not generate title'})
                        
                except Exception as e:
                    logger.error(f"Failed to generate title for conversation {conversation_id}: {e}")
                    yield self._format_sse_event('error', {'message': f'Title generation failed: {str(e)}'})
                    
        except Exception as e:
            logger.error(f"Error in title generation check: {e}")
            # Don't raise - we don't want title generation to break the chat flow
    
    async def stream_title_generation(
        self,
        conversation_id: str,
        user_id: str
    ) -> AsyncGenerator[str, None]:
        """Stream title generation for a conversation"""
        
        try:
            yield self._format_sse_event('title_generation_started', {
                'conversation_id': conversation_id
            })
            
            # Use the OpenRouterService generate_conversation_title method
            title = await self.openrouter_service.generate_conversation_title(
                conversation_id=conversation_id,
                user_id=user_id
            )
            
            if title:
                yield self._format_sse_event('title_complete', {'title': title})
            else:
                yield self._format_sse_event('error', {'message': 'Could not generate title'})
            
        except Exception as e:
            logger.error(f"Title generation error: {e}")
            yield self._format_sse_event('error', {'message': f'Title generation failed: {str(e)}'}) 