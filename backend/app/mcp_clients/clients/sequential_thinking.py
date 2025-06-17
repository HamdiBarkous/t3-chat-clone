from typing import Dict, Any
from ..base import BaseMCPClient


class SequentialThinkingMCPClient(BaseMCPClient):
    """Sequential Thinking MCP client for dynamic and reflective problem-solving"""
    
    def __init__(self):
        """
        Initialize Sequential Thinking MCP client
        
        Note: Sequential Thinking doesn't require an API key
        """
        server_config = self.get_server_config()
        super().__init__(server_config)

    def get_server_config(self) -> Dict[str, Any]:
        """Get the server configuration for Sequential Thinking MCP server"""
        return {
            "command": "npx",
            "args": [
                "-y",
                "@modelcontextprotocol/server-sequential-thinking@latest"
            ]
        }

    async def call_tool(self, name: str, arguments: Dict[str, Any]) -> Any:
        """
        Execute a Sequential Thinking tool
        
        Args:
            name: Tool name
            arguments: Tool arguments
            
        Returns:
            Tool execution result
        """
        return await super().call_tool(name, arguments) 