from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, AsyncGenerator
from contextlib import AsyncExitStack
import asyncio

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


class BaseMCPClient(ABC):
    """Base class for MCP clients providing common functionality"""
    
    def __init__(self, server_config: Dict[str, Any]):
        self.server_config = server_config
        self.session: Optional[ClientSession] = None
        self.exit_stack = AsyncExitStack()
        self.stdio = None
        self.write = None
        self._connected = False

    async def connect(self) -> None:
        """Connect to the MCP server"""
        if self._connected:
            return
            
        try:
            server_params = StdioServerParameters(**self.server_config)
            stdio_transport = await self.exit_stack.enter_async_context(stdio_client(server_params))
            self.stdio, self.write = stdio_transport
            self.session = await self.exit_stack.enter_async_context(ClientSession(self.stdio, self.write))
            
            await self.session.initialize()
            self._connected = True
            
            # Log available tools
            response = await self.session.list_tools()
            tool_names = [tool.name for tool in response.tools]
            print(f"Connected to MCP server with tools: {tool_names}")
            
        except Exception as e:
            print(f"Failed to connect to MCP server: {e}")
            await self.cleanup()
            raise

    async def disconnect(self) -> None:
        """Disconnect from the MCP server"""
        await self.cleanup()

    async def cleanup(self) -> None:
        """Clean up resources"""
        if not self._connected:
            return
            
        try:
            self._connected = False
            if self.session:
                # Give the session a moment to finish any pending operations
                await asyncio.sleep(0.1)
                self.session = None
            await self.exit_stack.aclose()
        except Exception as e:
            # Suppress cleanup errors - they're not critical
            pass

    async def get_available_tools(self) -> List[Dict[str, Any]]:
        """Get list of available tools from the MCP server"""
        if not self._connected or not self.session:
            await self.connect()
        
        response = await self.session.list_tools()
        tools = []
        
        for tool in response.tools:
            tools.append({
                "name": tool.name,
                "description": tool.description,
                "input_schema": tool.inputSchema
            })
        
        return tools

    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """Execute a tool with the given arguments"""
        if not self._connected or not self.session:
            await self.connect()
        
        try:
            result = await self.session.call_tool(tool_name, arguments)
            return result.content
        except Exception as e:
            print(f"Error calling tool {tool_name}: {e}")
            raise

    @abstractmethod
    def get_server_config(self) -> Dict[str, Any]:
        """Get the server configuration for this specific MCP client"""
        pass

    def is_connected(self) -> bool:
        """Check if the client is connected to the MCP server"""
        return self._connected

    async def __aenter__(self):
        """Async context manager entry"""
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.cleanup() 