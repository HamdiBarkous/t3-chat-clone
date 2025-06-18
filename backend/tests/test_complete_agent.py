#!/usr/bin/env python3
"""
Complete agent test with proper resource management
"""
import asyncio
import sys
import os
import json

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.services.tool_service import ToolService
from app.infrastructure.openrouter import openrouter_client


async def complete_agent_conversation():
    """Complete agent conversation with proper cleanup"""
    print("🤖 Complete Agent Test: Database Table Analysis")
    print("=" * 60)
    
    tool_service = None
    
    try:
        # Step 1: Setup tools with proper initialization
        print("1️⃣ Initializing MCP tools...")
        tool_service = ToolService()
        tools = await tool_service.get_openai_format_tools(["supabase"])
        
        print(f"   📋 Found {len(tools)} available tools")
        table_tools = [t for t in tools if 'list' in t['function']['name'].lower()]
        print(f"   🔧 Database tools: {[t['function']['name'] for t in table_tools]}")
        
        # Step 2: Create conversation
        user_question = "What tables exist in my database? Give me a complete overview."
        print(f"\n2️⃣ User Question: {user_question}")
        
        messages = [
            {
                "role": "system",
                "content": "You are a database expert. When asked about databases, always use the available tools to get accurate, real-time information. Provide detailed analysis of the database structure."
            },
            {
                "role": "user", 
                "content": user_question
            }
        ]
        
        # Step 3: First call to GPT-4o
        print("\n3️⃣ Calling GPT-4o with tools...")
        response = await openrouter_client.chat_completion(
            messages=messages,
            model="openai/gpt-4o",
            tools=tools,
            max_tokens=1500  # Increased token limit
        )
        
        assistant_message = response['choices'][0]['message']
        
        if assistant_message.get('tool_calls'):
            print(f"   🔧 GPT-4o wants to use {len(assistant_message['tool_calls'])} tool(s)")
            
            # Execute all tool calls
            for i, tool_call in enumerate(assistant_message['tool_calls']):
                function = tool_call['function']
                tool_name = function['name']
                tool_args = json.loads(function['arguments']) if function['arguments'] else {}
                
                print(f"\n4️⃣ Executing Tool {i+1}: {tool_name}")
                if tool_args:
                    print(f"   📋 Arguments: {json.dumps(tool_args, indent=2)}")
                
                # Execute the tool
                result = await tool_service.execute_tool_call(tool_name, tool_args)
                print(f"   ✅ Tool executed successfully")
                print(f"   📊 Result length: {len(result):,} characters")
                
                # Add messages to conversation
                messages.append(assistant_message)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call['id'],
                    "content": result
                })
            
            # Step 4: Get final comprehensive response
            print(f"\n5️⃣ Getting complete analysis from GPT-4o...")
            final_response = await openrouter_client.chat_completion(
                messages=messages,
                model="openai/gpt-4o",
                max_tokens=2000  # Increased for complete response
            )
            
            final_answer = final_response['choices'][0]['message']['content']
            
            # Display the complete response
            print(f"\n🤖 Complete AI Analysis:")
            print("=" * 60)
            print(final_answer)
            print("=" * 60)
            
            # Check if response was truncated
            finish_reason = final_response['choices'][0].get('finish_reason')
            if finish_reason == 'length':
                print("⚠️  Response was truncated due to token limit")
            else:
                print(f"✅ Response completed ({finish_reason})")
            
        else:
            print(f"\n🤖 Direct Response (no tools used):")
            print(assistant_message['content'])
        
        print(f"\n🎉 Agent conversation completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during conversation: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        # Step 5: Proper cleanup
        if tool_service:
            print(f"\n🧹 Cleaning up resources...")
            try:
                for client_name, client in tool_service.mcp_clients.items():
                    if hasattr(client, 'cleanup'):
                        await client.cleanup()
                print(f"   ✅ Resources cleaned up")
            except Exception as e:
                print(f"   ⚠️  Cleanup warning: {e}")


async def quick_tool_test():
    """Quick test to verify tools work"""
    print("🔧 Quick Tool Verification")
    print("-" * 30)
    
    tool_service = None
    try:
        tool_service = ToolService()
        
        # Test one simple tool
        result = await tool_service.execute_tool_call("supabase_list_tables", {})
        
        # Count tables mentioned
        table_count = result.count('"name"')
        print(f"   ✅ Found approximately {table_count} tables")
        
        # Check for specific tables
        if "conversations" in result:
            print(f"   📋 'conversations' table found")
        if "messages" in result:
            print(f"   📋 'messages' table found")
        if "profiles" in result:
            print(f"   📋 'profiles' table found")
            
    except Exception as e:
        print(f"   ❌ Tool test failed: {e}")
    finally:
        if tool_service:
            for client in tool_service.mcp_clients.values():
                if hasattr(client, 'cleanup'):
                    await client.cleanup()


async def main():
    """Main test runner"""
    print("🚀 Starting Complete Agent Test")
    print("=" * 60)
    
    # Quick verification first
    await quick_tool_test()
    print()
    
    # Full conversation test
    await complete_agent_conversation()


if __name__ == "__main__":
    # Run with proper asyncio event loop handling
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc() 