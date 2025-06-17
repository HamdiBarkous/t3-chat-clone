#!/usr/bin/env python3
"""
Test OpenRouter service layer to isolate the issue
"""
import asyncio
import sys
import os
from uuid import UUID

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.services.openrouter_service import OpenRouterService
from app.services.message_service import MessageService
from app.services.conversation_service import ConversationService
from app.infrastructure.repositories.supabase.message_repository import SupabaseMessageRepository
from app.infrastructure.repositories.supabase.conversation_repository import SupabaseConversationRepository
from app.infrastructure.repositories.supabase.document_repository import DocumentRepository


async def test_openrouter_service():
    """Test OpenRouter service streaming"""
    print("🚀 Testing OpenRouter Service Streaming")
    print("=" * 50)
    
    try:
        # Setup services
        conversation_repo = SupabaseConversationRepository()
        message_repo = SupabaseMessageRepository()
        
        conversation_service = ConversationService(conversation_repo)
        message_service = MessageService(message_repo)
        
        openrouter_service = OpenRouterService(message_service, conversation_service)
        
        # Use an existing conversation ID from the API test
        conversation_id = "22015330-e88c-4fb0-91a6-5bab12ddfc50"
        user_id = "cf06ad43-66b4-4701-b57e-79196f9f843c"
        
        print(f"📤 Testing streaming for conversation: {conversation_id}")
        print(f"👤 User ID: {user_id}")
        
        chunk_count = 0
        response_text = ""
        
        print("\n🔄 Starting stream...")
        
        async for chunk in openrouter_service.stream_chat_completion(
            conversation_id=conversation_id,
            user_id=user_id,
            model="openai/gpt-4o",
            use_tools=False,
            enabled_tools=None
        ):
            chunk_count += 1
            print(f"📦 Chunk {chunk_count}: {chunk[:200]}...")  # Truncate for readability
            response_text += chunk
            
            # Prevent infinite loop
            if chunk_count > 20:
                print("⚠️ Breaking after 20 chunks to prevent hanging")
                break
        
        print(f"\n🎉 Streaming completed!")
        print(f"📊 Total chunks: {chunk_count}")
        print(f"📝 Response length: {len(response_text)} characters")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_openrouter_service()) 