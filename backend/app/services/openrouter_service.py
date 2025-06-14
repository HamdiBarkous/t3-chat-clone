from typing import List, Dict, Any, Optional, AsyncGenerator
from uuid import UUID

from app.core.config import settings
from app.infrastructure.openrouter import openrouter_client
from app.services.message_service import MessageService
from app.services.conversation_service import ConversationService


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
        model: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """Stream chat completion for the streaming service"""
        conversation_uuid = UUID(conversation_id)
        user_uuid = UUID(user_id)
        
        # Get conversation to check if it exists and get current model
        conversation = await self.conversation_service.get_conversation(conversation_uuid, user_uuid)
        if not conversation:
            raise ValueError("Conversation not found")

        # Determine which model to use
        model_to_use = model or conversation.current_model

        # Get conversation context for AI
        context_messages = await self.message_service.get_conversation_context_for_ai(
            conversation_uuid, user_uuid
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
        user_id: str
    ) -> Optional[str]:
        """Generate a title for the conversation using AI"""
        conversation_uuid = UUID(conversation_id)
        user_uuid = UUID(user_id)
        
        try:
            # Get the first user message and first AI response
            context_messages = await self.message_service.get_conversation_context_for_ai(
                conversation_uuid, user_uuid
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
                conversation_uuid, user_uuid, title
            )
            
            return title[:50]  # Ensure max length

        except Exception as e:
            print(f"Failed to generate title: {e}")
            return None 