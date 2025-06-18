#!/usr/bin/env python3
"""
Direct test of OpenRouter streaming to isolate the issue
"""
import asyncio
import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.infrastructure.openrouter import openrouter_client


async def test_openrouter_streaming():
    """Test OpenRouter streaming directly"""
    print("🚀 Testing OpenRouter Streaming Direct")
    print("=" * 50)
    
    try:
        messages = [
            {"role": "user", "content": "Say hello world"}
        ]
        
        print("📤 Sending request to OpenRouter...")
        print(f"Model: openai/gpt-4o")
        print(f"Message: {messages[0]['content']}")
        
        response_text = ""
        chunk_count = 0
        
        async for chunk in openrouter_client.chat_completion_stream(
            messages=messages,
            model="openai/gpt-4o",
            tools=None
        ):
            chunk_count += 1
            print(f"📦 Chunk {chunk_count}: {chunk}")
            
            if "choices" in chunk and len(chunk["choices"]) > 0:
                choice = chunk["choices"][0]
                delta = choice.get("delta", {})
                
                if "content" in delta and delta["content"]:
                    response_text += delta["content"]
                    print(f"✨ Content: {delta['content']}")
        
        print(f"\n🎉 Streaming completed!")
        print(f"📊 Total chunks: {chunk_count}")
        print(f"📝 Final response: {response_text}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_openrouter_streaming()) 