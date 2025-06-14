from typing import List, Dict, Any, Optional, AsyncGenerator
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.infrastructure.openrouter import openrouter_client
from app.services.message_service import MessageService
from app.services.conversation_service import ConversationService
from app.models.message import MessageStatus


class OpenRouterService:
    def __init__(self, message_service: MessageService, conversation_service: ConversationService):
        self.message_service = message_service
        self.conversation_service = conversation_service

    async def get_available_models(self) -> List[Dict[str, Any]]:
        """Get available models from OpenRouter"""
        models = await openrouter_client.get_available_models()
        
        # Filter and format models for easier frontend consumption
        formatted_models = []
        for model in models:
            formatted_models.append({
                "id": model.get("id"),
                "name": model.get("name", model.get("id")),
                "description": model.get("description", ""),
                "context_length": model.get("context_length", 0),
                "pricing": model.get("pricing", {}),
                "top_provider": model.get("top_provider", {}),
            })
        
        return formatted_models

    async def stream_chat_completion(
        self,
        conversation_id: str,
        user_id: str,
        model: Optional[str] = None,
        db: AsyncSession = None
    ) -> AsyncGenerator[str, None]:
        """Stream chat completion for the streaming service"""
        conversation_uuid = UUID(conversation_id)
        user_uuid = UUID(user_id)
        
        # Get conversation to check if it exists and get current model
        conversation = await self.conversation_service.get_conversation(conversation_uuid, user_uuid, db)
        if not conversation:
            raise ValueError("Conversation not found")

        # Determine which model to use
        model_to_use = model or conversation.current_model

        # Get conversation context for AI
        context_messages = await self.message_service.get_conversation_context_for_ai(
            conversation_uuid, user_uuid, db
        )
        
        # Format messages for OpenRouter
        formatted_messages = []
        for msg in context_messages:
            formatted_messages.append({
                "role": msg.role.value,
                "content": msg.content
            })

        # Make streaming OpenRouter API call
        openrouter_messages = openrouter_client.format_messages_for_openrouter(
            formatted_messages, 
            conversation.system_prompt
        )

        async for chunk in openrouter_client.chat_completion_stream(
            messages=openrouter_messages,
            model=model_to_use
        ):
            if "choices" in chunk and len(chunk["choices"]) > 0:
                delta = chunk["choices"][0].get("delta", {})
                if "content" in delta:
                    yield delta["content"]

    async def generate_conversation_title(
        self, 
        conversation_id: str, 
        user_id: str, 
        db: AsyncSession
    ) -> Optional[str]:
        """Generate a title for the conversation using AI"""
        conversation_uuid = UUID(conversation_id)
        user_uuid = UUID(user_id)
        
        try:
            # Get the first user message and first AI response
            context_messages = await self.message_service.get_conversation_context_for_ai(
                conversation_uuid, user_uuid, db
            )
            
            if len(context_messages) < 2:
                return None

            user_msg = context_messages[0]
            ai_msg = context_messages[1]

            # Create title generation prompt
            title_prompt = f"""Generate a short, descriptive title (max 50 characters) for this conversation:

User: {user_msg.content}
Assistant: {ai_msg.content}

Return only the title, nothing else."""

            title_messages = openrouter_client.format_messages_for_openrouter([
                {"role": "user", "content": title_prompt}
            ])

            response = await openrouter_client.chat_completion(
                messages=title_messages,
                model=settings.title_generation_model,
                max_tokens=50
            )

            title = response["choices"][0]["message"]["content"].strip()
            # Remove quotes if present
            title = title.strip('"\'')
            
            # Update conversation title
            await self.conversation_service.update_conversation_title(
                conversation_uuid, user_uuid, title, db
            )
            
            return title[:50]  # Ensure max length

        except Exception as e:
            print(f"Failed to generate title: {e}")
            return None

    # Legacy methods for backward compatibility
    async def send_chat_message(
        self, 
        conversation_id: UUID, 
        user_id: UUID, 
        user_message_content: str,
        model_override: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send a chat message and get AI response (legacy method)"""
        # Get conversation to check if it exists and get current model
        conversation = await self.conversation_service.get_conversation(conversation_id, user_id)
        if not conversation:
            raise ValueError("Conversation not found")

        # Determine which model to use
        model_to_use = model_override or conversation.current_model

        # Update conversation's current model if overridden
        if model_override and model_override != conversation.current_model:
            await self.conversation_service.update_conversation_model(conversation_id, user_id, model_override)

        # Create user message
        from app.schemas.message import MessageCreate
        user_message_data = MessageCreate(content=user_message_content, model=model_override)
        user_message = await self.message_service.create_user_message(conversation_id, user_id, user_message_data)

        try:
            # Get conversation context for AI
            context_messages = await self.message_service.get_conversation_context_for_ai(conversation_id, user_id)
            
            # Format messages for OpenRouter
            formatted_messages = []
            for msg in context_messages:
                formatted_messages.append({
                    "role": msg.role.value,
                    "content": msg.content
                })

            # Make OpenRouter API call
            openrouter_messages = openrouter_client.format_messages_for_openrouter(
                formatted_messages, 
                conversation.system_prompt
            )

            response = await openrouter_client.chat_completion(
                messages=openrouter_messages,
                model=model_to_use
            )

            # Extract AI response
            ai_content = response["choices"][0]["message"]["content"]
            
            # Create assistant message
            assistant_message = await self.message_service.create_assistant_message(
                conversation_id, user_id, ai_content, model_to_use
            )

            # Update user message status to completed
            await self.message_service.update_message_status(user_message.id, MessageStatus.COMPLETED)

            return {
                "user_message": user_message,
                "assistant_message": assistant_message,
                "model_used": model_to_use
            }

        except Exception as e:
            # Mark user message as failed
            await self.message_service.update_message_status(user_message.id, MessageStatus.FAILED)
            raise ValueError(f"Failed to get AI response: {str(e)}")

    async def stream_chat_response(
        self, 
        conversation_id: UUID, 
        user_id: UUID, 
        user_message_content: str,
        model_override: Optional[str] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream AI response for real-time chat experience"""
        # Get conversation to check if it exists and get current model
        conversation = await self.conversation_service.get_conversation(conversation_id, user_id)
        if not conversation:
            raise ValueError("Conversation not found")

        # Determine which model to use
        model_to_use = model_override or conversation.current_model

        # Update conversation's current model if overridden
        if model_override and model_override != conversation.current_model:
            await self.conversation_service.update_conversation_model(conversation_id, user_id, model_override)

        # Create user message
        from app.schemas.message import MessageCreate
        user_message_data = MessageCreate(content=user_message_content, model=model_override)
        user_message = await self.message_service.create_user_message(conversation_id, user_id, user_message_data)

        # Create placeholder assistant message
        assistant_message = await self.message_service.create_assistant_message(
            conversation_id, user_id, "", model_to_use
        )
        
        # Update status to streaming
        await self.message_service.update_message_status(assistant_message.id, MessageStatus.STREAMING)

        try:
            # Get conversation context for AI
            context_messages = await self.message_service.get_conversation_context_for_ai(conversation_id, user_id)
            
            # Format messages for OpenRouter (exclude the placeholder assistant message)
            formatted_messages = []
            for msg in context_messages[:-1]:  # Exclude last message (placeholder)
                formatted_messages.append({
                    "role": msg.role.value,
                    "content": msg.content
                })

            # Make streaming OpenRouter API call
            openrouter_messages = openrouter_client.format_messages_for_openrouter(
                formatted_messages, 
                conversation.system_prompt
            )

            full_response = ""
            async for chunk in openrouter_client.chat_completion_stream(
                messages=openrouter_messages,
                model=model_to_use
            ):
                if "choices" in chunk and len(chunk["choices"]) > 0:
                    delta = chunk["choices"][0].get("delta", {})
                    if "content" in delta:
                        content = delta["content"]
                        full_response += content
                        
                        yield {
                            "type": "content",
                            "content": content,
                            "message_id": str(assistant_message.id)
                        }

            # Update assistant message with full response
            await self.message_service.update_message_content(
                assistant_message.id, full_response, MessageStatus.COMPLETED, model_to_use
            )

            # Mark user message as completed
            await self.message_service.update_message_status(user_message.id, MessageStatus.COMPLETED)

            yield {
                "type": "done",
                "message_id": str(assistant_message.id),
                "user_message_id": str(user_message.id)
            }

        except Exception as e:
            # Mark messages as failed
            await self.message_service.update_message_status(user_message.id, MessageStatus.FAILED)
            await self.message_service.update_message_status(assistant_message.id, MessageStatus.FAILED)
            
            yield {
                "type": "error",
                "error": str(e),
                "message_id": str(assistant_message.id)
            } 