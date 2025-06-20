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

    def _determine_reasoning_capability(self, model: Dict[str, Any]) -> tuple[bool, bool]:
        """
        Determine reasoning capabilities based on actual model capabilities
        Returns: (reasoning_capable, reasoning_by_default)
        """
        model_id = model.get("id", "")
        
        # Models that reason by default (can't disable reasoning)
        if (
            "gemini-2.5-pro" in model_id or
            "deepseek-r1" in model_id or 
            "o4-mini" in model_id
        ):
            return True, True
        
        # Models that can toggle reasoning on/off
        elif (
            "claude-sonnet-4" in model_id or
            "gemini-2.5-flash" in model_id and "lite" not in model_id  # 2.5 flash but not lite
        ):
            return True, False
        
        # Models with no reasoning capabilities
        else:
            return False, False

    def _get_clean_model_name(self, model_id: str, api_name: str) -> str:
        """Get clean, user-friendly model name"""
        # Hardcoded clean model names for better UX
        name_mapping = {
            "google/gemini-2.5-flash-lite-preview-06-17": "Gemini 2.5 Flash Lite",
            "google/gemini-2.5-flash": "Gemini 2.5 Flash",
            "google/gemini-2.5-pro": "Gemini 2.5 Pro",
            "anthropic/claude-sonnet-4": "Claude Sonnet 4",
            "anthropic/claude-3.5-haiku": "Claude 3.5 Haiku",
            "openai/o4-mini": "O4 Mini",
            "openai/gpt-4.1": "GPT-4.1",
            "openai/gpt-4.1-mini": "GPT-4.1 Mini",
            "openai/gpt-4.1-nano": "GPT-4.1 Nano",
            "openai/gpt-4o": "GPT-4o",
            "openai/gpt-4o-mini": "GPT-4o Mini",
            "deepseek/deepseek-r1-0528": "DeepSeek R1",
            "deepseek/deepseek-chat-v3-0324": "DeepSeek Chat V3"
        }
        
        return name_mapping.get(model_id, api_name)

    async def get_available_models(self) -> List[Dict[str, Any]]:
        """Get available models from OpenRouter"""
        models = await openrouter_client.get_available_models()
        
        # Define allowed models
        allowed_models = {
            "google/gemini-2.5-flash-lite-preview-06-17",
            "google/gemini-2.5-flash",
            "google/gemini-2.5-pro",
            "anthropic/claude-sonnet-4",
            "anthropic/claude-3.5-haiku",
            "openai/o4-mini",
            "openai/gpt-4.1",
            "openai/gpt-4.1-mini",
            "openai/gpt-4.1-nano",
            "openai/gpt-4o",
            "openai/gpt-4o-mini",
            "deepseek/deepseek-r1-0528",
            "deepseek/deepseek-chat-v3-0324"
        }
        
        # Filter and format models for easier frontend consumption
        formatted_models = []
        for model in models:
            model_id = model.get("id")
            if model_id in allowed_models:
                # Dynamically determine reasoning capabilities
                reasoning_capable, reasoning_by_default = self._determine_reasoning_capability(model)
                
                # Get clean model name
                api_name = model.get("name", model_id)
                clean_name = self._get_clean_model_name(model_id, api_name)
                
                formatted_models.append({
                    "id": model_id,
                    "name": clean_name,
                    "context_length": model.get("context_length", 0),
                    "pricing": model.get("pricing", {}),
                    "top_provider": model.get("top_provider", {}),
                    "reasoning_capable": reasoning_capable,
                    "reasoning_by_default": reasoning_by_default,
                })
        
        return formatted_models

    @property
    def tool_service(self):
        """Lazy load tool service to avoid circular imports"""
        if self._tool_service is None:
            from app.services.tool_service import ToolService
            self._tool_service = ToolService()
        return self._tool_service

    async def get_user_tool_service(self, user_id: str) -> 'ToolService':
        """Get a user-specific tool service with their credentials"""
        from app.services.tool_service import ToolService
        from app.infrastructure.repositories.supabase.profile_repository import SupabaseProfileRepository
        from uuid import UUID
        
        profile_repo = SupabaseProfileRepository()
        return ToolService(user_id=UUID(user_id), profile_repo=profile_repo)

    async def stream_chat_completion(
        self,
        conversation_id: str,
        user_id: str,
        model: Optional[str] = None,
        use_tools: Optional[bool] = None,
        enabled_tools: Optional[List[str]] = None,
        reasoning: Optional[bool] = None
    ) -> AsyncGenerator[str, None]:
        """Stream chat completion with proper tool calling accumulation"""
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

        # Get user-specific tool service and tools if requested
        tools = None
        user_tool_service = None
        if use_tools and enabled_tools:
            user_tool_service = await self.get_user_tool_service(user_id)
            tools = await user_tool_service.get_openai_format_tools(enabled_tools)

        # Tool call accumulation (for streaming mode)
        accumulated_tool_calls = {}
        
        try:
            # Stream with or without tools
            async for chunk in openrouter_client.chat_completion_stream(
                messages=openrouter_messages,
                model=model_to_use,
                temperature=conversation.temperature or 1.0,
                top_p=conversation.top_p or 1.0,
                tools=tools,
                reasoning=reasoning
            ):
                if "choices" in chunk and len(chunk["choices"]) > 0:
                    choice = chunk["choices"][0]
                    delta = choice.get("delta", {})
                    finish_reason = choice.get("finish_reason")
                    
                    # Handle tool calls (if tools enabled) - accumulate chunks
                    if "tool_calls" in delta and delta["tool_calls"]:
                        for tool_call_delta in delta["tool_calls"]:
                            index = tool_call_delta.get("index", 0)
                            
                            # Initialize tool call accumulator if needed
                            if index not in accumulated_tool_calls:
                                accumulated_tool_calls[index] = {
                                    "id": "",
                                    "type": "function",
                                    "function": {
                                        "name": "",
                                        "arguments": ""
                                    }
                                }
                            
                            # Accumulate tool call data
                            if tool_call_delta.get("id"):
                                accumulated_tool_calls[index]["id"] += tool_call_delta["id"]
                            
                            if tool_call_delta.get("function"):
                                if tool_call_delta["function"].get("name"):
                                    accumulated_tool_calls[index]["function"]["name"] += tool_call_delta["function"]["name"]
                                if tool_call_delta["function"].get("arguments"):
                                    accumulated_tool_calls[index]["function"]["arguments"] += tool_call_delta["function"]["arguments"]
                        
                        # Send progress update for tool calls
                        yield f"data: {json.dumps({'type': 'tool_call_progress', 'data': {'accumulated_calls': len(accumulated_tool_calls)}})}\n\n"
                    
                    # Handle reasoning tokens (thinking)
                    elif "reasoning" in delta and delta["reasoning"]:
                        # Stream reasoning content as it comes
                        yield f"data: {json.dumps({'type': 'reasoning', 'data': delta['reasoning']})}\n\n"
                    
                    # Handle regular content (both tool and non-tool modes)
                    elif "content" in delta and delta["content"]:
                        # Always return JSON format for consistency
                        yield f"data: {json.dumps({'type': 'content', 'data': delta['content']})}\n\n"
                    
                    # When streaming finishes, execute any accumulated tool calls
                    if finish_reason and accumulated_tool_calls and user_tool_service:
                        # Start sequential tool calling loop
                        current_messages = openrouter_messages.copy()
                        
                        while accumulated_tool_calls:
                            # Execute all accumulated tool calls from this round
                            tool_messages = []
                            
                            for index, tool_call in accumulated_tool_calls.items():
                                try:
                                    tool_name = tool_call["function"]["name"]
                                    tool_args_str = tool_call["function"]["arguments"]
                                    
                                    # Validate tool call has complete data
                                    if not tool_name or not tool_args_str:
                                        yield f"data: {json.dumps({'type': 'tool_error', 'data': {'error': f'Incomplete tool call at index {index}', 'tool_call': tool_call}})}\n\n"
                                        continue
                                    
                                    # Parse arguments
                                    try:
                                        tool_args = json.loads(tool_args_str) if tool_args_str else {}
                                    except json.JSONDecodeError as e:
                                        yield f"data: {json.dumps({'type': 'tool_error', 'data': {'error': f'Invalid tool arguments JSON: {e}', 'arguments': tool_args_str}})}\n\n"
                                        continue
                                    
                                    # Notify about tool execution start
                                    yield f"data: {json.dumps({'type': 'tool_call', 'data': {'name': tool_name, 'arguments': tool_args, 'status': 'executing'}})}\n\n"
                                    
                                    # Execute tool with user-specific service
                                    tool_result = await user_tool_service.execute_tool_call(tool_name, tool_args)
                                    
                                    # Send tool result
                                    yield f"data: {json.dumps({'type': 'tool_result', 'data': {'name': tool_name, 'result': tool_result, 'status': 'completed'}})}\n\n"
                                    
                                    # Add tool call and result to conversation
                                    tool_messages.append({
                                        "role": "assistant",
                                        "content": None,
                                        "tool_calls": [tool_call]
                                    })
                                    tool_messages.append({
                                        "role": "tool", 
                                        "tool_call_id": tool_call["id"],
                                        "content": str(tool_result)
                                    })
                                    
                                except Exception as e:
                                    yield f"data: {json.dumps({'type': 'tool_error', 'data': {'error': str(e), 'tool_name': tool_call.get('function', {}).get('name', 'unknown')}})}\n\n"
                            
                            # Add tool results to conversation history
                            current_messages.extend(tool_messages)
                            
                            # Clear current tool calls and prepare for next round
                            accumulated_tool_calls = {}
                            
                            # Continue conversation to see if AI wants to call more tools
                            async for follow_up_chunk in openrouter_client.chat_completion_stream(
                                messages=current_messages,
                                model=model_to_use,
                                temperature=conversation.temperature or 1.0,
                                top_p=conversation.top_p or 1.0,
                                tools=tools,  # Keep tools available for potential next round
                                reasoning=reasoning
                            ):
                                if "choices" in follow_up_chunk and len(follow_up_chunk["choices"]) > 0:
                                    follow_up_choice = follow_up_chunk["choices"][0]
                                    follow_up_delta = follow_up_choice.get("delta", {})
                                    follow_up_finish_reason = follow_up_choice.get("finish_reason")
                                    
                                    # Handle new tool calls in follow-up
                                    if "tool_calls" in follow_up_delta and follow_up_delta["tool_calls"]:
                                        for tool_call_delta in follow_up_delta["tool_calls"]:
                                            index = tool_call_delta.get("index", 0)
                                            
                                            # Initialize tool call accumulator if needed
                                            if index not in accumulated_tool_calls:
                                                accumulated_tool_calls[index] = {
                                                    "id": "",
                                                    "type": "function",
                                                    "function": {
                                                        "name": "",
                                                        "arguments": ""
                                                    }
                                                }
                                            
                                            # Accumulate tool call data
                                            if tool_call_delta.get("id"):
                                                accumulated_tool_calls[index]["id"] += tool_call_delta["id"]
                                            
                                            if tool_call_delta.get("function"):
                                                if tool_call_delta["function"].get("name"):
                                                    accumulated_tool_calls[index]["function"]["name"] += tool_call_delta["function"]["name"]
                                                if tool_call_delta["function"].get("arguments"):
                                                    accumulated_tool_calls[index]["function"]["arguments"] += tool_call_delta["function"]["arguments"]
                                        
                                        # Send progress for follow-up tool calls
                                        yield f"data: {json.dumps({'type': 'tool_call_progress', 'data': {'accumulated_calls': len(accumulated_tool_calls)}})}\n\n"
                                    
                                    # Handle reasoning in follow-up
                                    elif "reasoning" in follow_up_delta and follow_up_delta["reasoning"]:
                                        yield f"data: {json.dumps({'type': 'reasoning', 'data': follow_up_delta['reasoning']})}\n\n"
                                    
                                    # Handle regular content in follow-up
                                    elif "content" in follow_up_delta and follow_up_delta["content"]:
                                        yield f"data: {json.dumps({'type': 'content', 'data': follow_up_delta['content']})}\n\n"
                                    
                                    # If follow-up finishes, either continue tool loop or exit
                                    if follow_up_finish_reason:
                                        if not accumulated_tool_calls:
                                            # No more tools to call, exit both loops
                                            return
                                        else:
                                            # More tools to call, continue outer loop
                                            break
                        
                        # End of tool calling loop, conversation is complete
                        return
                    
                    # If no tool calls and streaming finished, end here
                    if finish_reason:
                        return
        
        finally:
            # Clean up user tool service
            if user_tool_service:
                try:
                    await user_tool_service.cleanup()
                except Exception as e:
                    print(f"Error cleaning up user tool service: {e}")

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