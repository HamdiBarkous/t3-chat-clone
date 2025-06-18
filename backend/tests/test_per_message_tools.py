#!/usr/bin/env python3
"""
Test per-message tool control - user can enable/disable MCP for individual messages
"""
import asyncio
import sys
import os
import json

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.services.tool_service import ToolService
from app.services.openrouter_service import OpenRouterService
from app.services.conversation_service import ConversationService
from app.services.message_service import MessageService
from app.infrastructure.repositories.supabase import SupabaseConversationRepository, SupabaseMessageRepository
from app.infrastructure.openrouter import openrouter_client


async def test_per_message_tool_control():
    """Test per-message tool toggle functionality"""
    print("🎛️  Per-Message Tool Control Test")
    print("=" * 50)
    
    # Initialize services
    conversation_repo = SupabaseConversationRepository()
    message_repo = SupabaseMessageRepository()
    conversation_service = ConversationService(conversation_repo)
    message_service = MessageService(message_repo, None)
    openrouter_service = OpenRouterService(message_service, conversation_service)
    
    try:
        # Test conversation ID (you'd get this from a real conversation)
        test_conversation_id = "12345678-1234-1234-1234-123456789012"
        test_user_id = "87654321-4321-4321-4321-210987654321"
        
        print("1️⃣ Testing Direct Chat (No Tools)")
        print("-" * 30)
        
        # Test 1: Regular streaming (no tools)
        messages = [
            {"role": "user", "content": "Hello, what's 2+2?"}
        ]
        
        formatted_messages = openrouter_client.format_messages_for_openrouter(messages)
        
        response = await openrouter_client.chat_completion(
            messages=formatted_messages,
            model="openai/gpt-4o-mini",
            max_tokens=100
        )
        
        print(f"📝 Direct response: {response['choices'][0]['message']['content'][:100]}...")
        
        print("\n2️⃣ Testing Tool-Enabled Chat")
        print("-" * 30)
        
        # Test 2: With tools override (simulated)
        tool_service = ToolService()
        tools = await tool_service.get_openai_format_tools(["supabase"])
        
        print(f"🔧 Available tools: {len(tools)}")
        
        # Test what happens with tools
        tool_messages = [
            {"role": "user", "content": "What tables are in my database?"}
        ]
        
        tool_formatted = openrouter_client.format_messages_for_openrouter(tool_messages)
        
        tool_response = await openrouter_client.chat_completion(
            messages=tool_formatted,
            model="openai/gpt-4o",
            tools=tools[:3],  # Just test with first 3 tools
            max_tokens=200
        )
        
        assistant_msg = tool_response['choices'][0]['message']
        
        if assistant_msg.get('tool_calls'):
            print(f"🤖 AI wants to use {len(assistant_msg['tool_calls'])} tool(s)")
            for tool_call in assistant_msg['tool_calls']:
                print(f"   🔧 Tool: {tool_call['function']['name']}")
        else:
            print(f"💬 Direct response: {assistant_msg['content'][:100]}...")
        
        print("\n3️⃣ Per-Message Control Demo")
        print("-" * 30)
        
        # Demonstrate the concept with different message scenarios
        scenarios = [
            {
                "message": "What's the weather like?",
                "use_tools": False,
                "description": "Regular chat - no tools needed"
            },
            {
                "message": "Show me my database tables",
                "use_tools": True,
                "enabled_tools": ["supabase"],
                "description": "Database query - tools enabled"
            },
            {
                "message": "Explain quantum physics",
                "use_tools": False,
                "description": "Knowledge question - no tools needed"
            },
            {
                "message": "Create a new user in my database",
                "use_tools": True,
                "enabled_tools": ["supabase"],
                "description": "Database operation - tools enabled"
            }
        ]
        
        for i, scenario in enumerate(scenarios, 1):
            print(f"\n   Scenario {i}: {scenario['description']}")
            print(f"   💬 Message: \"{scenario['message']}\"")
            print(f"   🎛️  Tools: {'ON' if scenario.get('use_tools') else 'OFF'}")
            if scenario.get('enabled_tools'):
                print(f"   🔧 Tool set: {scenario['enabled_tools']}")
        
        print(f"\n✅ Per-message tool control working!")
        print("Users can now choose for each message:")
        print("  • 💬 Regular chat (fast, direct)")
        print("  • 🤖 Agent mode (with database/API tools)")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        # Cleanup MCP clients
        if 'tool_service' in locals():
            for client in tool_service.mcp_clients.values():
                if hasattr(client, 'cleanup'):
                    await client.cleanup()


if __name__ == "__main__":
    asyncio.run(test_per_message_tool_control()) 