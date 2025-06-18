from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List
from pydantic import BaseModel
from app.services.tool_service import ToolService
from app.infrastructure.repositories.supabase.profile_repository import SupabaseProfileRepository
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


# User-specific tool service dependency
async def get_user_tool_service(user: dict = Depends(get_current_user)) -> ToolService:
    """Get a tool service with user-specific credentials"""
    from uuid import UUID
    user_id = UUID(user["id"])
    profile_repo = SupabaseProfileRepository()
    return ToolService(user_id=user_id, profile_repo=profile_repo)


@router.get("/available", response_model=ToolsResponse)
async def get_available_tools(
    user_tool_service: ToolService = Depends(get_user_tool_service)
) -> ToolsResponse:
    """Get list of available MCP tools grouped by client for the current user"""
    try:
        available_clients = await user_tool_service.get_available_tool_names()
        
        all_tools = {}
        for client_name in available_clients:
            client_tools = await user_tool_service.get_openai_format_tools([client_name])
            all_tools[client_name] = client_tools
        
        return ToolsResponse(
            available_clients=available_clients,
            tools=all_tools
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get available tools: {str(e)}")
    finally:
        await user_tool_service.cleanup()


@router.post("/test/{tool_name}")
async def test_tool(
    tool_name: str, 
    request: ToolTestRequest,
    user_tool_service: ToolService = Depends(get_user_tool_service)
) -> Dict[str, Any]:
    """Test a tool execution with the given arguments using user credentials"""
    try:
        result = await user_tool_service.test_tool(tool_name, request.arguments)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Tool test failed: {str(e)}")
    finally:
        await user_tool_service.cleanup()


@router.get("/clients", response_model=ClientsResponse)
async def get_mcp_clients(
    user_tool_service: ToolService = Depends(get_user_tool_service)
) -> ClientsResponse:
    """Get list of available MCP client names for the current user"""
    try:
        clients = await user_tool_service.get_available_tool_names()
        return ClientsResponse(clients=clients)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get MCP clients: {str(e)}")
    finally:
        await user_tool_service.cleanup() 