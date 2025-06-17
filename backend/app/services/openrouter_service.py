from typing import List, Dict, Any, Optional, AsyncGenerator
from uuid import UUID
import json

from app.core.config import settings
from app.infrastructure.openrouter import openrouter_client
from app.services.message_service import MessageService
from app.services.conversation_service import ConversationService


class OpenRouterService:
    def __init__(self, message_service: MessageService, conversation_service: ConversationService):
        self.message_service = message_service
        self.conversation_service = conversation_service
        # Lazy import to avoid circular dependency
        self._tool_service = None

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

    @property
    def tool_service(self):
        """Lazy load tool service to avoid circular imports"""
        if self._tool_service is None:
            from app.services.tool_service import ToolService
            self._tool_service = ToolService()
        return self._tool_service

    async def stream_chat_completion(
        self,
        conversation_id: str,
        user_id: str,
        model: Optional[str] = None,
        use_tools: Optional[bool] = None,
        enabled_tools: Optional[List[str]] = None
    ) -> AsyncGenerator[str, None]:
        """Stream chat completion with optional tool calling support"""
        conversation_uuid = UUID(conversation_id)
        user_uuid = UUID(user_id)
        
        # Get conversation for context
        conversation = await self.conversation_service.get_conversation(conversation_uuid, user_uuid)
        if not conversation:
            raise ValueError("Conversation not found")

        # Determine which model to use
        model_to_use = model or conversation.current_model

        # Get conversation context
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

        # Make OpenRouter API call
        openrouter_messages = openrouter_client.format_messages_for_openrouter(
            formatted_messages, 
            conversation.system_prompt
        )

        # Get tools if requested
        tools = None
        if use_tools and enabled_tools:
            tools = await self.tool_service.get_openai_format_tools(enabled_tools)

        # Stream with or without tools
        async for chunk in openrouter_client.chat_completion_stream(
            messages=openrouter_messages,
            model=model_to_use,
            tools=tools
        ):
            if "choices" in chunk and len(chunk["choices"]) > 0:
                choice = chunk["choices"][0]
                delta = choice.get("delta", {})
                
                # Handle tool calls (if tools enabled)
                if "tool_calls" in delta and delta["tool_calls"]:
                    yield f"data: {json.dumps({'type': 'tool_call', 'data': delta['tool_calls']})}\n\n"
                    
                    # Execute tool and continue conversation
                    for tool_call in delta["tool_calls"]:
                        if tool_call.get("function"):
                            tool_name = tool_call["function"]["name"]
                            tool_args = json.loads(tool_call["function"]["arguments"]) if tool_call["function"]["arguments"] else {}
                            
                            # Execute tool
                            tool_result = await self.tool_service.execute_tool_call(tool_name, tool_args)
                            yield f"data: {json.dumps({'type': 'tool_result', 'data': {'name': tool_name, 'result': tool_result}})}\n\n"
                
                # Handle regular content (both tool and non-tool modes)
                elif "content" in delta and delta["content"]:
                    if use_tools:
                        # Tool mode: return structured format
                        yield f"data: {json.dumps({'type': 'content', 'data': delta['content']})}\n\n"
                    else:
                        # Regular mode: return plain text
                        yield delta["content"]

    async def generate_conversation_title(
        self, 
        conversation_id: str, 
        user_id: str
    ) -> Optional[str]:
        """Generate a title for the conversation using AI - simplified"""
        conversation_uuid = UUID(conversation_id)
        user_uuid = UUID(user_id)
        
        try:
            # Get first two messages WITHOUT documents (to avoid token limit issues)
            context_messages = await self.message_service.get_conversation_context_for_ai(
                conversation_uuid, user_uuid, include_documents=False
            )
            
            if len(context_messages) < 2:
                return None

            user_msg = context_messages[0]
            ai_msg = context_messages[1]

            # Extract just text content for title generation
            user_content = user_msg.content
            ai_content = ai_msg.content
            
            # If content is a list (vision message), extract only the text part
            if isinstance(user_content, list):
                user_content = " ".join([
                    part.get("text", "") for part in user_content 
                    if isinstance(part, dict) and part.get("type") == "text"
                ])
            if isinstance(ai_content, list):
                ai_content = " ".join([
                    part.get("text", "") for part in ai_content 
                    if isinstance(part, dict) and part.get("type") == "text"
                ])

            # Create title generation prompt with text-only content
            title_prompt = f"""Generate a short, descriptive title (max 50 characters) for this conversation:

User: {user_content}
Assistant: {ai_content}

Return only the title, nothing else."""

            # Log the prompt length for debugging
            print(f"Title generation prompt length: {len(title_prompt)} characters")

            title_messages = openrouter_client.format_messages_for_openrouter([
                {"role": "user", "content": title_prompt}
            ])

            response = await openrouter_client.chat_completion(
                messages=title_messages,
                model=settings.title_generation_model,
                max_tokens=50,
                use_transforms=False  # Don't use transforms for title generation (already optimized)
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