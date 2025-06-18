import httpx
from typing import List, Dict, Any, Optional, AsyncGenerator
from app.core.config import settings
import json


class OpenRouterClient:
    def __init__(self):
        self.base_url = settings.openrouter_base_url
        self.api_key = settings.openrouter_api_key
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://your-app.com",  # Required by OpenRouter
            "X-Title": settings.app_name,
        }

    async def get_available_models(self) -> List[Dict[str, Any]]:
        """Get list of available models from OpenRouter"""
        if not self.api_key:
            return []

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/models",
                    headers=self.headers,
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
                return data.get("data", [])
            except Exception as e:
                print(f"Error fetching models: {e}")
                return []

    async def chat_completion(
        self, 
        messages: List[Dict[str, Any]], 
        model: str,
        max_tokens: Optional[int] = None,
        temperature: float = 0.7,
        top_p: float = 1.0,
        use_transforms: bool = True,
        tools: Optional[List[Dict[str, Any]]] = None,
        reasoning: Optional[bool] = None
    ) -> Dict[str, Any]:
        """Send chat completion request to OpenRouter"""
        if not self.api_key:
            raise ValueError("OpenRouter API key not configured")

        # Set model-specific max_tokens to avoid credit issues
        if max_tokens is None:
            if "claude-sonnet-4" in model or "claude-opus-4" in model:
                max_tokens = 4000  # Lower limit for expensive models
            elif "claude" in model:
                max_tokens = 8000  # Moderate limit for other Claude models
            elif "gpt-4" in model:
                max_tokens = 4000  # Reasonable limit for GPT-4 models
            else:
                max_tokens = 8000  # Default for other models

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "top_p": top_p,
            "max_tokens": max_tokens,
        }
        
        # Add transforms for automatic context management
        if use_transforms and settings.openrouter_use_transforms:
            payload["transforms"] = ["middle-out"]
            
        if tools:
            payload["tools"] = tools
            
        if reasoning:
            payload["reasoning"] = {"effort": "high"}

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=self.headers,
                    json=payload,
                    timeout=60.0
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                # Provide user-friendly error messages for common issues
                if e.response.status_code == 402:
                    raise ValueError(f"Insufficient credits for {model}. This model requires more tokens than available.")
                elif e.response.status_code == 429:
                    raise ValueError(f"Rate limit exceeded for {model}. Please try again later.")
                elif e.response.status_code == 404:
                    raise ValueError(f"Model {model} not found or not available.")
                else:
                    raise ValueError(f"OpenRouter API error: {e.response.status_code} - {e.response.text}")
            except Exception as e:
                raise ValueError(f"OpenRouter request failed for {model}: {str(e)}")

    async def chat_completion_stream(
        self, 
        messages: List[Dict[str, Any]], 
        model: str,
        max_tokens: Optional[int] = None,
        temperature: float = 0.7,
        top_p: float = 1.0,
        use_transforms: bool = True,
        tools: Optional[List[Dict[str, Any]]] = None,
        reasoning: Optional[bool] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Send streaming chat completion request to OpenRouter"""
        if not self.api_key:
            raise ValueError("OpenRouter API key not configured")

        # Set model-specific max_tokens to avoid credit issues
        if max_tokens is None:
            if "claude-sonnet-4" in model or "claude-opus-4" in model:
                max_tokens = 4000  # Lower limit for expensive models
            elif "claude" in model:
                max_tokens = 8000  # Moderate limit for other Claude models
            elif "gpt-4" in model:
                max_tokens = 4000  # Reasonable limit for GPT-4 models
            else:
                max_tokens = 8000  # Default for other models

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "top_p": top_p,
            "stream": True,
            "max_tokens": max_tokens,
        }
        
        # Add transforms for automatic context management
        if use_transforms and settings.openrouter_use_transforms:
            payload["transforms"] = ["middle-out"]
            
        if tools:
            payload["tools"] = tools
            
        if reasoning:
            payload["reasoning"] = {"effort": "high"}

        async with httpx.AsyncClient(
            timeout=httpx.Timeout(60.0, connect=10.0),
            limits=httpx.Limits(max_connections=100, max_keepalive_connections=20)
        ) as client:
            try:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/chat/completions",
                    headers=self.headers,
                    json=payload
                ) as response:
                    response.raise_for_status()
                    
                    # Process the streaming response using text streaming to avoid buffering
                    buffer = ""
                    async for text_chunk in response.aiter_text(chunk_size=1):  # Process character by character for maximum responsiveness
                        buffer += text_chunk
                        
                        # Look for complete lines ending with \n
                        while '\n' in buffer:
                            line, buffer = buffer.split('\n', 1)
                            line = line.strip()
                            
                            if line.startswith("data: "):
                                data = line[6:]  # Remove "data: " prefix
                                if data.strip() == "[DONE]":
                                    return
                                try:
                                    chunk_data = json.loads(data)
                                    yield chunk_data
                                except json.JSONDecodeError:
                                    # Skip malformed JSON chunks
                                    continue
                            elif line.startswith("event: "):
                                # Handle SSE events if present
                                continue
                            elif line == "":
                                # Skip empty lines
                                continue
            except httpx.HTTPStatusError as e:
                error_detail = "Unknown error"
                try:
                    error_detail = await e.response.aread()
                    error_detail = error_detail.decode('utf-8')
                except Exception:
                    error_detail = f"HTTP {e.response.status_code}"
                
                # Provide user-friendly error messages for common issues
                if e.response.status_code == 402:
                    if "credits" in error_detail.lower():
                        raise ValueError(f"Insufficient credits for {model}. This model requires more tokens than available.")
                    else:
                        raise ValueError(f"Payment required for {model}. Please check your OpenRouter credits.")
                elif e.response.status_code == 429:
                    raise ValueError(f"Rate limit exceeded for {model}. Please try again later.")
                elif e.response.status_code == 404:
                    raise ValueError(f"Model {model} not found or not available.")
                else:
                    raise ValueError(f"OpenRouter streaming API error: {e.response.status_code} - {error_detail}")
            except httpx.TimeoutException:
                raise ValueError(f"OpenRouter streaming request timed out for {model}")
            except Exception as e:
                raise ValueError(f"OpenRouter streaming request failed for {model}: {str(e)}")

    def format_messages_for_openrouter(self, messages: List[Dict[str, Any]], system_prompt: Optional[str] = None) -> List[Dict[str, Any]]:
        """Format messages for OpenRouter API - handles both text and vision messages"""
        formatted_messages = []
        
        # Add system prompt if provided
        if system_prompt:
            formatted_messages.append({
                "role": "system",
                "content": system_prompt
            })
        
        # Add conversation messages
        for msg in messages:
            formatted_message = {
                "role": msg["role"],
                "content": msg["content"]  # Can be string or array for vision
            }
            formatted_messages.append(formatted_message)
        
        return formatted_messages


# Global OpenRouter client instance
openrouter_client = OpenRouterClient() 