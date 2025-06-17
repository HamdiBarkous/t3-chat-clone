from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List
from pydantic import BaseModel
from app.services.tool_service import ToolService
from app.dependencies.auth import get_current_user


router = APIRouter()


# Request/Response models
class ToolTestRequest(BaseModel):
    arguments: Dict[str, Any] = {}


class ToolsResponse(BaseModel):
    available_clients: List[str]
    tools: Dict[str, List[Dict[str, Any]]]


class ClientsResponse(BaseModel):
    clients: List[str]


# Simple dependency
def get_tool_service() -> ToolService:
    return ToolService()


@router.get("/available", response_model=ToolsResponse)
async def get_available_tools(tool_service: ToolService = Depends(get_tool_service)) -> ToolsResponse:
    """Get list of available MCP tools grouped by client"""
    try:
        available_clients = tool_service.get_available_tool_names()
        
        all_tools = {}
        for client_name in available_clients:
            client_tools = await tool_service.get_openai_format_tools([client_name])
            all_tools[client_name] = client_tools
        
        return ToolsResponse(
            available_clients=available_clients,
            tools=all_tools
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get available tools: {str(e)}")


@router.post("/test/{tool_name}")
async def test_tool(
    tool_name: str, 
    request: ToolTestRequest,
    _: dict = Depends(get_current_user),
    tool_service: ToolService = Depends(get_tool_service)
) -> Dict[str, Any]:
    """Test a tool execution with the given arguments"""
    try:
        result = await tool_service.test_tool(tool_name, request.arguments)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Tool test failed: {str(e)}")


@router.get("/clients", response_model=ClientsResponse)
async def get_mcp_clients(tool_service: ToolService = Depends(get_tool_service)) -> ClientsResponse:
    """Get list of available MCP client names"""
    return ClientsResponse(
        clients=tool_service.get_available_tool_names()
    ) 