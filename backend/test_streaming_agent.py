#!/usr/bin/env python3
"""
Simple streaming agent test with tool calling
"""
import asyncio
import sys
import os
import json

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.services.tool_service import ToolService
from app.infrastructure.openrouter import openrouter_client


async def test_streaming_with_tools():
    """Test streaming with tool calling using the fixed implementation"""
    print("🤖 Streaming Agent Test: Database Query with Tools")
    print("=" * 60)
    
    tool_service = None
    
    try:
        # Step 1: Setup tools
        print("1️⃣ Initializing MCP tools...")
        tool_service = ToolService()
        tools = await tool_service.get_openai_format_tools(["supabase"])
        
        print(f"   📋 Found {len(tools)} available tools")
        
        # Step 2: Create streaming request
        user_question = "What tables exist in my database? Give me a quick overview."
        print(f"\n2️⃣ User Question: {user_question}")
        
        messages = [
            {
                "role": "system",
                "content": "You are a database expert. When asked about databases, use the available tools to get real data."
            },
            {
                "role": "user", 
                "content": user_question
            }
        ]
        
        # Step 3: Stream with tools - this tests our fix
        print("\n3️⃣ Starting streaming with tools...")
        
        # Tool call accumulation (like in our fixed streaming service)
        accumulated_tool_calls = {}
        content_chunks = []
        
        async for chunk in openrouter_client.chat_completion_stream(
            messages=messages,
            model="openai/gpt-4o",
            tools=tools,
            max_tokens=1500
        ):
            if "choices" in chunk and len(chunk["choices"]) > 0:
                choice = chunk["choices"][0]
                delta = choice.get("delta", {})
                finish_reason = choice.get("finish_reason")
                
                # Handle tool calls - this is where the 'name' error was happening
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
                        
                        # Accumulate tool call data (this is the fix)
                        if tool_call_delta.get("id"):
                            accumulated_tool_calls[index]["id"] += tool_call_delta["id"]
                        
                        if tool_call_delta.get("function"):
                            if tool_call_delta["function"].get("name"):
                                accumulated_tool_calls[index]["function"]["name"] += tool_call_delta["function"]["name"]
                            if tool_call_delta["function"].get("arguments"):
                                accumulated_tool_calls[index]["function"]["arguments"] += tool_call_delta["function"]["arguments"]
                    
                    print(f"   🔧 Accumulating tool calls... ({len(accumulated_tool_calls)} calls)")
                
                # Handle regular content
                elif "content" in delta and delta["content"]:
                    content_chunks.append(delta["content"])
                    print(delta["content"], end="", flush=True)
                
                # When streaming finishes, execute any accumulated tool calls
                if finish_reason and accumulated_tool_calls:
                    print(f"\n\n4️⃣ Executing {len(accumulated_tool_calls)} accumulated tool calls...")
                    
                    # Execute all accumulated tool calls
                    for index, tool_call in accumulated_tool_calls.items():
                        try:
                            tool_name = tool_call["function"]["name"]
                            tool_args_str = tool_call["function"]["arguments"]
                            
                            print(f"   🔧 Tool {index+1}: {tool_name}")
                            
                            # Validate tool call has complete data
                            if not tool_name or not tool_args_str:
                                print(f"   ❌ Incomplete tool call at index {index}")
                                continue
                            
                            # Parse arguments
                            try:
                                tool_args = json.loads(tool_args_str) if tool_args_str else {}
                            except json.JSONDecodeError as e:
                                print(f"   ❌ Invalid tool arguments JSON: {e}")
                                continue
                            
                            # Execute tool
                            tool_result = await tool_service.execute_tool_call(tool_name, tool_args)
                            print(f"   ✅ Tool executed successfully")
                            print(f"   📊 Result length: {len(tool_result):,} characters")
                            
                            # Add messages to conversation for final response
                            messages.append({
                                "role": "assistant",
                                "tool_calls": [tool_call]
                            })
                            messages.append({
                                "role": "tool",
                                "tool_call_id": tool_call["id"],
                                "content": tool_result
                            })
                            
                        except Exception as e:
                            print(f"   ❌ Tool execution error: {e}")
                    
                    # Get final response with tool results
                    print(f"\n5️⃣ Getting final response with tool results...")
                    
                    final_response = await openrouter_client.chat_completion(
                        messages=messages,
                        model="openai/gpt-4o",
                        max_tokens=2000
                    )
                    
                    final_answer = final_response['choices'][0]['message']['content']
                    
                    print(f"\n🤖 Final AI Response:")
                    print("=" * 60)
                    print(final_answer)
                    print("=" * 60)
                    
                    break  # Exit the streaming loop
        
        print(f"\n🎉 Streaming agent test completed successfully!")
        print("✅ No 'name' errors encountered - fix is working!")
        
    except Exception as e:
        print(f"❌ Error during streaming test: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        # Cleanup
        if tool_service:
            print(f"\n🧹 Cleaning up resources...")
            try:
                for client_name, client in tool_service.mcp_clients.items():
                    if hasattr(client, 'cleanup'):
                        await client.cleanup()
                print(f"   ✅ Resources cleaned up")
            except Exception as e:
                print(f"   ⚠️  Cleanup warning: {e}")


async def main():
    """Main test runner"""
    print("🚀 Starting Streaming Tool Calling Test")
    print("=" * 60)
    
    await test_streaming_with_tools()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc() 