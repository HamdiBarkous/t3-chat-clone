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
        use_transforms: bool = True,
        tools: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Send chat completion request to OpenRouter"""
        if not self.api_key:
            raise ValueError("OpenRouter API key not configured")

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
        }
        
        # Add transforms for automatic context management
        if use_transforms and settings.openrouter_use_transforms:
            payload["transforms"] = ["middle-out"]
        
        if max_tokens:
            payload["max_tokens"] = max_tokens
            
        if tools:
            payload["tools"] = tools

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
                raise ValueError(f"OpenRouter API error: {e.response.status_code} - {e.response.text}")
            except Exception as e:
                raise ValueError(f"OpenRouter request failed: {str(e)}")

    async def chat_completion_stream(
        self, 
        messages: List[Dict[str, Any]], 
        model: str,
        max_tokens: Optional[int] = None,
        temperature: float = 0.7,
        use_transforms: bool = True,
        tools: Optional[List[Dict[str, Any]]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Send streaming chat completion request to OpenRouter"""
        if not self.api_key:
            raise ValueError("OpenRouter API key not configured")

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "stream": True,
        }
        
        # Add transforms for automatic context management
        if use_transforms and settings.openrouter_use_transforms:
            payload["transforms"] = ["middle-out"]
        
        if max_tokens:
            payload["max_tokens"] = max_tokens
            
        if tools:
            payload["tools"] = tools

        async with httpx.AsyncClient() as client:
            try:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/chat/completions",
                    headers=self.headers,
                    json=payload,
                    timeout=60.0
                ) as response:
                    response.raise_for_status()
                    
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data = line[6:]  # Remove "data: " prefix
                            if data.strip() == "[DONE]":
                                break
                            try:
                                chunk = json.loads(data)
                                yield chunk
                            except json.JSONDecodeError:
                                continue
                                
            except httpx.HTTPStatusError as e:
                raise ValueError(f"OpenRouter streaming API error: {e.response.status_code} - {e.response.text}")
            except Exception as e:
                raise ValueError(f"OpenRouter streaming request failed: {str(e)}")

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