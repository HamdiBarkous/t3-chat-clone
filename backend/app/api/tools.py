from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from app.services.tool_service import ToolService
from app.dependencies.auth import get_current_user


router = APIRouter()

# Simple dependency - we'll improve this later
def get_tool_service() -> ToolService:
    return ToolService()


@router.get("/available")
async def get_available_tools(tool_service: ToolService = Depends(get_tool_service)) -> Dict[str, Any]:
    """Get list of available MCP tools"""
    try:
        available_clients = tool_service.get_available_tool_names()
        
        all_tools = {}
        for client_name in available_clients:
            client_tools = await tool_service.get_openai_format_tools([client_name])
            all_tools[client_name] = client_tools
        
        return {
            "available_clients": available_clients,
            "tools": all_tools
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get available tools: {str(e)}")


@router.post("/test/{tool_name}")
async def test_tool(
    tool_name: str, 
    arguments: Dict[str, Any],
    _: dict = Depends(get_current_user),
    tool_service: ToolService = Depends(get_tool_service)
) -> Dict[str, Any]:
    """Test a tool execution"""
    try:
        result = await tool_service.test_tool(tool_name, arguments)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Tool test failed: {str(e)}")


@router.get("/clients")
async def get_mcp_clients(tool_service: ToolService = Depends(get_tool_service)) -> Dict[str, Any]:
    """Get list of available MCP client names"""
    return {
        "clients": tool_service.get_available_tool_names()
    } 