from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import asyncio

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


class BaseMCPClient(ABC):
    """Base class for MCP clients providing common functionality"""
    
    def __init__(self, server_config: Dict[str, Any]):
        self.server_config = server_config
        self.session: Optional[ClientSession] = None
        self._connected = False
        self._lock = asyncio.Lock()
        self._connection_task = None

    async def connect(self) -> None:
        """Connect to the MCP server with improved error handling"""
        async with self._lock:
            if self._connected and self.session:
                return
                
            try:
                # Create a new connection each time to avoid context manager issues
                server_params = StdioServerParameters(**self.server_config)
                
                # Use the stdio_client context manager properly
                async with stdio_client(server_params) as (read_stream, write_stream):
                    async with ClientSession(read_stream, write_stream) as session:
                        await session.initialize()
                        
                        # Store session for immediate use
                        self.session = session
                        self._connected = True
                        
                        # Log available tools
                        response = await session.list_tools()
                        tool_names = [tool.name for tool in response.tools]
                        print(f"Connected to MCP server with tools: {tool_names}")
                        
                        # Keep the session alive - this is the key change
                        # We'll manage the session lifecycle differently
                        return
                        
            except Exception as e:
                print(f"Failed to connect to MCP server: {e}")
                await self.cleanup()
                raise

    async def disconnect(self) -> None:
        """Disconnect from the MCP server"""
        await self.cleanup()

    async def cleanup(self) -> None:
        """Clean up resources"""
        async with self._lock:
            self._connected = False
            self.session = None

    async def get_available_tools(self) -> List[Dict[str, Any]]:
        """Get list of available tools from the MCP server"""
        server_params = StdioServerParameters(**self.server_config)
        
        async with stdio_client(server_params) as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                
                response = await session.list_tools()
                tools = []
                
                for tool in response.tools:
                    tools.append({
                        "name": tool.name,
                        "description": tool.description,
                        "input_schema": tool.inputSchema
                    })
                
                return tools

    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """Execute a tool with the given arguments - create fresh connection each time"""
        server_params = StdioServerParameters(**self.server_config)
        
        async with stdio_client(server_params) as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                
                try:
                    result = await session.call_tool(tool_name, arguments)
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