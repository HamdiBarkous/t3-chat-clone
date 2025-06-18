#!/usr/bin/env python3
"""
Test real-time streaming to verify no buffering
"""
import asyncio
import sys
import os
import time

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.infrastructure.openrouter import openrouter_client


async def test_realtime_streaming():
    """Test that streaming happens in real-time without buffering"""
    print("🚀 Testing Real-Time Streaming (No Buffering)")
    print("=" * 60)
    
    try:
        # Simple question that should generate a reasonably long response
        user_question = "Write a short story about a robot learning to paint. Make it about 200 words."
        print(f"📝 Question: {user_question}")
        
        messages = [
            {
                "role": "user",
                "content": user_question
            }
        ]
        
        print("\n🎯 Starting streaming test...")
        print("⏱️  Timing between chunks (should be small for real-time streaming):")
        print("-" * 60)
        
        chunk_count = 0
        total_content = ""
        start_time = time.time()
        last_chunk_time = start_time
        
        # Track timing between chunks
        chunk_times = []
        
        async for chunk in openrouter_client.chat_completion_stream(
            messages=messages,
            model="openai/gpt-4o-mini",  # Fast, cheap model for testing
            max_tokens=300
        ):
            current_time = time.time()
            
            if "choices" in chunk and len(chunk["choices"]) > 0:
                choice = chunk["choices"][0]
                delta = choice.get("delta", {})
                
                if "content" in delta and delta["content"]:
                    chunk_count += 1
                    content = delta["content"]
                    total_content += content
                    
                    # Calculate time since last chunk
                    time_since_last = current_time - last_chunk_time
                    chunk_times.append(time_since_last)
                    
                    # Print chunk info with timing
                    print(f"Chunk {chunk_count:3d}: {time_since_last:6.3f}s | '{content[:20]}{'...' if len(content) > 20 else ''}'")
                    
                    last_chunk_time = current_time
                    
                    # If chunks are coming in very large gaps (>2 seconds), that indicates buffering
                    if chunk_count > 1 and time_since_last > 2.0:
                        print(f"⚠️  LARGE GAP DETECTED: {time_since_last:.3f}s - This suggests buffering!")
        
        total_time = time.time() - start_time
        
        print("-" * 60)
        print(f"📊 STREAMING ANALYSIS:")
        print(f"   Total chunks: {chunk_count}")
        print(f"   Total time: {total_time:.3f}s")
        print(f"   Total content length: {len(total_content)} characters")
        print(f"   Average time between chunks: {sum(chunk_times)/len(chunk_times):.3f}s")
        print(f"   Max time between chunks: {max(chunk_times):.3f}s")
        print(f"   Min time between chunks: {min(chunk_times):.3f}s")
        
        # Analysis
        avg_gap = sum(chunk_times) / len(chunk_times) if chunk_times else 0
        max_gap = max(chunk_times) if chunk_times else 0
        
        print(f"\n🔍 BUFFERING ANALYSIS:")
        if max_gap > 2.0:
            print(f"❌ BUFFERING DETECTED: Max gap of {max_gap:.3f}s suggests response is being buffered")
        elif avg_gap > 0.5:
            print(f"⚠️  POSSIBLE BUFFERING: Average gap of {avg_gap:.3f}s is higher than expected")
        else:
            print(f"✅ REAL-TIME STREAMING: Gaps are reasonable, streaming appears to be working correctly")
        
        print(f"\n📝 Generated content preview:")
        print(f"   {total_content[:200]}{'...' if len(total_content) > 200 else ''}")
        
    except Exception as e:
        print(f"❌ Error during streaming test: {e}")
        import traceback
        traceback.print_exc()


async def main():
    """Main test runner"""
    await test_realtime_streaming()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc() 