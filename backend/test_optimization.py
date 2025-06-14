#!/usr/bin/env python3
"""
Quick test script to verify Phase 1 optimizations work correctly
Run this after deploying the changes: poetry run python test_optimization.py
"""

import asyncio
import time
from uuid import UUID
from app.infrastructure.database import AsyncSessionLocal
from app.infrastructure.repositories.conversation_repository import ConversationRepository
from app.infrastructure.repositories.message_repository import MessageRepository

async def test_conversation_listing():
    """Test the optimized conversation listing"""
    print("🔍 Testing optimized conversation listing...")
    
    async with AsyncSessionLocal() as db:
        repo = ConversationRepository(db)
        
        # Time the operation
        start_time = time.time()
        
        try:
            # Replace with an actual user_id from your database
            conversations = await repo.list_by_user(
                user_id=UUID("cf06ad43-66b4-4701-b57e-79196f9f843c"),  # Replace with your user ID
                limit=10
            )
            
            end_time = time.time()
            duration_ms = (end_time - start_time) * 1000
            
            print(f"✅ Success! Found {len(conversations)} conversations")
            print(f"⚡ Execution time: {duration_ms:.2f}ms")
            
            # Show sample data
            for conv in conversations[:3]:
                print(f"   - {conv.title or 'Untitled'} ({conv.message_count} messages)")
                if conv.last_message_preview:
                    print(f"     Preview: {conv.last_message_preview[:50]}...")
            
            return duration_ms < 500  # Should be under 500ms
            
        except Exception as e:
            print(f"❌ Error: {e}")
            return False

async def test_message_loading():
    """Test the optimized message loading"""
    print("\n🔍 Testing optimized message loading...")
    
    async with AsyncSessionLocal() as db:
        repo = MessageRepository(db)
        
        start_time = time.time()
        
        try:
            # Replace with actual conversation_id and user_id from your database
            messages, total_count, has_more = await repo.get_conversation_messages(
                conversation_id=UUID("8610a848-99db-41f6-8085-5ad282edab3a"),  # Replace with your conversation ID
                user_id=UUID("cf06ad43-66b4-4701-b57e-79196f9f843c"),  # Replace with your user ID
                limit=20
            )
            
            end_time = time.time()
            duration_ms = (end_time - start_time) * 1000
            
            print(f"✅ Success! Found {len(messages)} messages (total: {total_count})")
            print(f"⚡ Execution time: {duration_ms:.2f}ms")
            
            return duration_ms < 300  # Should be under 300ms
            
        except Exception as e:
            print(f"❌ Error: {e}")
            return False

async def main():
    print("🚀 Testing Phase 1 Optimizations")
    print("=" * 50)
    
    # Test conversation listing
    conv_test_passed = await test_conversation_listing()
    
    # Test message loading  
    msg_test_passed = await test_message_loading()
    
    print("\n" + "=" * 50)
    print("📊 Test Results:")
    print(f"Conversation Listing: {'✅ PASS' if conv_test_passed else '❌ FAIL'}")
    print(f"Message Loading: {'✅ PASS' if msg_test_passed else '❌ FAIL'}")
    
    if conv_test_passed and msg_test_passed:
        print("\n🎉 All optimizations working correctly!")
        print("Your application should now be significantly faster.")
    else:
        print("\n⚠️  Some optimizations need adjustment.")
        print("Check the error messages above and verify your database setup.")

if __name__ == "__main__":
    asyncio.run(main()) 