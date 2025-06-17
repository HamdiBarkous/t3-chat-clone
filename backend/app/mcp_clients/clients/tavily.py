from typing import Dict, Any, List, Optional
from app.core.config import settings
from ..base import BaseMCPClient


class TavilyMCPClient(BaseMCPClient):
    """Tavily MCP client for AI-powered web search operations"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Tavily MCP client
        
        Args:
            api_key: Tavily API key (defaults to settings)
        """
        self.api_key = api_key or settings.tavily_api_key
        
        if not self.api_key:
            raise ValueError("Tavily API key is required. Set TAVILY_API_KEY environment variable.")
        
        server_config = self.get_server_config()
        super().__init__(server_config)

    def get_server_config(self) -> Dict[str, Any]:
        """Get the server configuration for Tavily MCP server"""
        return {
            "command": "npx",
            "args": [
                "-y",
                "tavily-mcp@latest"
            ],
            "env": {
                "TAVILY_API_KEY": self.api_key
            }
        }

    async def tavily_search(self, query: str, max_results: int = 5, search_depth: str = "basic", 
                           include_domains: Optional[List[str]] = None, exclude_domains: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Perform AI-powered web search with Tavily
        
        Args:
            query: Search query
            max_results: Maximum number of results (default: 5, max: 20)
            search_depth: Either "basic" or "advanced" search depth (default: "basic")
            include_domains: List of domains to specifically include in results
            exclude_domains: List of domains to exclude from results
            
        Returns:
            Dict containing search results with AI-extracted relevant content
        """
        params = {
            "query": query,
            "max_results": max_results,
            "search_depth": search_depth
        }
        
        if include_domains:
            params["include_domains"] = include_domains
        if exclude_domains:
            params["exclude_domains"] = exclude_domains
            
        return await self.call_tool("tavily_search", params)

    async def tavily_search_news(self, query: str, max_results: int = 5, days: int = 3,
                                include_domains: Optional[List[str]] = None, exclude_domains: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Search recent news articles with Tavily
        
        Args:
            query: Search query
            max_results: Maximum number of results (default: 5, max: 20)
            days: Number of days back to search (default: 3)
            include_domains: List of domains to specifically include in results
            exclude_domains: List of domains to exclude from results
            
        Returns:
            Dict containing news search results with publication dates
        """
        params = {
            "query": query,
            "max_results": max_results,
            "days": days
        }
        
        if include_domains:
            params["include_domains"] = include_domains
        if exclude_domains:
            params["exclude_domains"] = exclude_domains
            
        return await self.call_tool("tavily_search_news", params)

    async def tavily_answer_search(self, query: str, max_results: int = 5, search_depth: str = "advanced",
                                  include_domains: Optional[List[str]] = None, exclude_domains: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Perform web search and generate direct answers with supporting evidence
        
        Args:
            query: Search query
            max_results: Maximum number of results (default: 5, max: 20)
            search_depth: Either "basic" or "advanced" search depth (default: "advanced")
            include_domains: List of domains to specifically include in results
            exclude_domains: List of domains to exclude from results
            
        Returns:
            Dict containing AI-generated answer with supporting evidence
        """
        params = {
            "query": query,
            "max_results": max_results,
            "search_depth": search_depth
        }
        
        if include_domains:
            params["include_domains"] = include_domains
        if exclude_domains:
            params["exclude_domains"] = exclude_domains
            
        return await self.call_tool("tavily_answer_search", params)

    # Remove the overridden method - use the base class implementation
    # which will query the actual MCP server for tools 