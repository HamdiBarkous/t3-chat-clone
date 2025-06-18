from typing import List, Dict, Any, Optional
from uuid import UUID
from app.mcp_clients import SupabaseMCPClient, FirecrawlMCPClient, TavilyMCPClient, SequentialThinkingMCPClient
from app.infrastructure.repositories.supabase.profile_repository import SupabaseProfileRepository


class ToolService:
    """Service to manage MCP tools and convert them for OpenRouter with user-specific credentials"""
    
    def __init__(self, user_id: Optional[UUID] = None, profile_repo: Optional[SupabaseProfileRepository] = None):
        """
        Initialize ToolService with optional user-specific credentials
        
        Args:
            user_id: User ID to fetch credentials for
            profile_repo: Profile repository to fetch user credentials
        """
        self.user_id = user_id
        self.profile_repo = profile_repo
        self.mcp_clients = {}
        self._user_profile = None

    async def _get_user_profile(self):
        """Get user profile with MCP credentials"""
        if self._user_profile is not None:
            return self._user_profile
            
        if self.user_id and self.profile_repo:
            try:
                profile = await self.profile_repo.get_profile(self.user_id)
                self._user_profile = profile
                return profile
            except Exception as e:
                print(f"Failed to fetch user profile: {e}")
                self._user_profile = {}
                return {}
        
        self._user_profile = {}
        return {}

    async def _initialize_client(self, client_name: str):
        """Initialize a specific MCP client with user credentials if available"""
        if client_name in self.mcp_clients:
            return self.mcp_clients[client_name]

        try:
            if client_name == "supabase":
                # Get user profile for Supabase credentials
                profile = await self._get_user_profile()
                
                # Check if user has configured Supabase MCP credentials
                access_token = profile.supabase_access_token if profile else None
                project_ref = profile.supabase_project_ref if profile else None
                read_only = profile.supabase_read_only if profile is not None else True
                
                if access_token:
                    print(f"Initializing Supabase MCP with user credentials (read_only: {read_only})")
                    self.mcp_clients[client_name] = SupabaseMCPClient(
                        access_token=access_token,
                        project_ref=project_ref,
                        read_only=read_only
                    )
                else:
                    print("No Supabase MCP credentials found for user, skipping Supabase client")
                    return None
                    
            elif client_name == "firecrawl":
                self.mcp_clients[client_name] = FirecrawlMCPClient()
                
            elif client_name == "tavily":
                self.mcp_clients[client_name] = TavilyMCPClient()
                
            elif client_name == "sequential_thinking":
                self.mcp_clients[client_name] = SequentialThinkingMCPClient()
                
            else:
                print(f"Unknown MCP client: {client_name}")
                return None
                
            return self.mcp_clients[client_name]
            
        except Exception as e:
            print(f"Failed to initialize {client_name} MCP client: {e}")
            return None

    async def get_openai_format_tools(self, enabled_tools: List[str]) -> List[Dict[str, Any]]:
        """Convert MCP tools to OpenAI/OpenRouter format"""
        openai_tools = []
        
        for tool_name in enabled_tools:
            try:
                mcp_client = await self._initialize_client(tool_name)
                if not mcp_client:
                    continue
                    
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
            
            # Find the longest matching client name from the start of the tool name
            client_name = None
            actual_tool_name = None
            
            # Check against known clients
            known_clients = ["supabase", "firecrawl", "tavily", "sequential_thinking"]
            for registered_client in known_clients:
                if tool_name.startswith(f"{registered_client}_"):
                    client_name = registered_client
                    actual_tool_name = tool_name[len(registered_client) + 1:]  # +1 for the underscore
                    break
            
            if not client_name:
                raise ValueError(f"Unknown MCP client for tool: {tool_name}")
            
            # Initialize client if needed
            mcp_client = await self._initialize_client(client_name)
            if not mcp_client:
                raise ValueError(f"Failed to initialize {client_name} MCP client")
            
            result = await mcp_client.call_tool(actual_tool_name, arguments)
            
            # Convert result to string for LLM consumption
            if isinstance(result, str):
                return result
            elif hasattr(result, '__iter__') and not isinstance(result, str):
                # If result is a list of objects, extract text
                text_parts = []
                for item in result:
                    if hasattr(item, 'text'):
                        text_parts.append(str(item.text))
                    elif hasattr(item, 'content'):
                        text_parts.append(str(item.content))
                    elif isinstance(item, dict):
                        text_parts.append(str(item.get('text', item.get('content', item))))
                    else:
                        text_parts.append(str(item))
                return '\n'.join(text_parts) if text_parts else str(result)
            elif isinstance(result, (list, dict)):
                import json
                return json.dumps(result, indent=2, default=str)
            else:
                return str(result)
                
        except Exception as e:
            error_msg = f"Tool execution failed: {str(e)}"
            print(error_msg)
            return error_msg

    async def get_available_tool_names(self) -> List[str]:
        """Get list of available MCP client names for this user"""
        available_clients = []
        
        # Check each client type
        known_clients = ["supabase", "firecrawl", "tavily", "sequential_thinking"]
        
        for client_name in known_clients:
            try:
                client = await self._initialize_client(client_name)
                if client:
                    available_clients.append(client_name)
            except Exception as e:
                print(f"Client {client_name} not available: {e}")
        
        return available_clients

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

    async def cleanup(self):
        """Clean up all MCP clients"""
        for client in self.mcp_clients.values():
            if hasattr(client, 'cleanup'):
                try:
                    await client.cleanup()
                except Exception as e:
                    print(f"Error cleaning up client: {e}") 