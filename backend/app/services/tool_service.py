from typing import List, Dict, Any
from app.mcp_clients import SupabaseMCPClient


class ToolService:
    """Simple service to manage MCP tools and convert them for OpenRouter"""
    
    def __init__(self):
        self.mcp_clients = {}
        
        # Initialize MCP clients (always available, used per-message)
        try:
            self.mcp_clients["supabase"] = SupabaseMCPClient()
        except Exception as e:
            print(f"Failed to initialize Supabase MCP client: {e}")

    async def get_openai_format_tools(self, enabled_tools: List[str]) -> List[Dict[str, Any]]:
        """Convert MCP tools to OpenAI/OpenRouter format"""
        openai_tools = []
        
        for tool_name in enabled_tools:
            if tool_name not in self.mcp_clients:
                continue
                
            try:
                mcp_client = self.mcp_clients[tool_name]
                mcp_tools = await mcp_client.get_available_tools()
                
                for mcp_tool in mcp_tools:
                    openai_tool = self._convert_mcp_to_openai_tool(mcp_tool, tool_name)
                    openai_tools.append(openai_tool)
                    
            except Exception as e:
                print(f"Error getting tools from {tool_name}: {e}")
        
        return openai_tools

    def _convert_mcp_to_openai_tool(self, mcp_tool: Dict[str, Any], client_name: str) -> Dict[str, Any]:
        """Convert single MCP tool to OpenAI function format"""
        return {
            "type": "function",
            "function": {
                "name": f"{client_name}_{mcp_tool['name']}",  # Prefix with client name
                "description": mcp_tool.get("description", ""),
                "parameters": mcp_tool.get("input_schema", {
                    "type": "object",
                    "properties": {},
                    "required": []
                })
            }
        }

    async def execute_tool_call(self, tool_name: str, arguments: Dict[str, Any]) -> str:
        """Execute a tool call and return the result as a string"""
        try:
            # Parse client name and tool name (format: "supabase_list_tables")
            if "_" not in tool_name:
                raise ValueError(f"Invalid tool name format: {tool_name}")
            
            client_name, actual_tool_name = tool_name.split("_", 1)
            
            if client_name not in self.mcp_clients:
                raise ValueError(f"Unknown MCP client: {client_name}")
            
            mcp_client = self.mcp_clients[client_name]
            result = await mcp_client.call_tool(actual_tool_name, arguments)
            
            # Convert result to string for LLM consumption
            if isinstance(result, str):
                return result
            elif hasattr(result, 'content'):
                # Handle MCP result objects with content attribute
                content = result.content
                if hasattr(content, '__iter__') and not isinstance(content, str):
                    # If content is a list of objects, extract text
                    text_parts = []
                    for item in content:
                        if hasattr(item, 'text'):
                            text_parts.append(str(item.text))
                        elif hasattr(item, 'content'):
                            text_parts.append(str(item.content))
                        else:
                            text_parts.append(str(item))
                    return '\n'.join(text_parts)
                else:
                    return str(content)
            elif isinstance(result, (list, dict)):
                import json
                return json.dumps(result, indent=2, default=str)
            else:
                return str(result)
                
        except Exception as e:
            error_msg = f"Tool execution failed: {str(e)}"
            print(error_msg)
            return error_msg

    def get_available_tool_names(self) -> List[str]:
        """Get list of available MCP client names"""
        return list(self.mcp_clients.keys())

    async def test_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Test a tool execution and return detailed result"""
        try:
            result = await self.execute_tool_call(tool_name, arguments)
            return {
                "success": True,
                "result": result,
                "tool_name": tool_name,
                "arguments": arguments
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "tool_name": tool_name,
                "arguments": arguments
            } 